'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/app/_shared/utils/supabase/client';
import { useRouter } from 'next/navigation';

type Store = {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
};

type StoreMember = {
    store_id: string;
    user_id: string;
    role: 'owner' | 'manager' | 'staff';
    stores: Store; // Join result
};

type User = {
    id: string;
    email?: string;
};

type StoreContextType = {
    currentStore: Store | null;
    myStores: Store[];
    memberships: StoreMember[];
    role: 'owner' | 'manager' | 'staff' | null;
    isLoading: boolean;
    user: User | null;
    setCurrentStore: (store: Store) => void;
    refreshStores: () => Promise<void>;
    createDefaultStore: () => Promise<string | null>;
    createStore: (name: string) => Promise<string | null>;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [currentStore, setCurrentStore] = useState<Store | null>(null);
    const [myStores, setMyStores] = useState<Store[]>([]);
    const [memberships, setMemberships] = useState<StoreMember[]>([]);
    const [role, setRole] = useState<'owner' | 'manager' | 'staff' | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    const fetchStores = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            setUser(user);

            // 1. Get my memberships with store details
            const { data: members, error: memberError } = await supabase
                .from('store_members')
                .select('store_id, user_id, role, stores ( * )');

            if (memberError) {
                console.error('Error fetching stores:', memberError);
                return;
            }

            // Cast to StoreMember[] (assuming Supabase returns correct shape with joins)
            const validMembers = (members as any[] || []) as StoreMember[];

            const stores = validMembers.map(m => m.stores).filter(Boolean);

            // 2. AUTO-MIGRATION LOGIC
            if (stores.length === 0) {
                console.log('No stores found. Creating default store & migrating data...');
                try {
                    await createDefaultStoreImpl(); // Use internal impl to avoid dep cycle if any
                } catch (err) {
                    console.error('Auto-migration failed silently:', err);
                }
            } else {
                setMemberships(validMembers);
                setMyStores(stores);

                // Set default store if none selected
                if (!currentStore) {
                    const firstStore = stores[0];
                    if (firstStore) {
                        setCurrentStore(stores[0]);
                        const myRole = validMembers.find(m => m.store_id === firstStore.id)?.role;
                        setRole(myRole || 'staff'); // Default to lowest priv if missing
                    }
                } else {
                    // Update role for existing currentStore (in case permissions changed)
                    const myRole = validMembers.find(m => m.store_id === currentStore.id)?.role;
                    if (myRole) setRole(myRole);
                }
            }
        } catch (e) {
            console.error('Fetch stores error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [currentStore, createDefaultStoreImpl]); // Dependency on helper

    // Helper to avoid circular dependency in useEffect/useCallback
    async function createDefaultStoreImpl() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 'Not authenticated';

            console.log('Creating default store...');
            const { data: newStore, error: createError } = await supabase
                .from('stores')
                .insert({ name: '1호점', owner_id: user.id })
                .select()
                .single();

            if (createError) throw createError;

            await supabase.from('store_members').insert({
                store_id: newStore.id,
                user_id: user.id,
                role: 'owner'
            });

            const { error: migrationError } = await supabase
                .from('mvp_sales')
                .update({ store_id: newStore.id })
                .eq('user_id', user.id)
                .is('store_id', null);

            if (migrationError) console.error('Migration failed:', migrationError);

            // Refresh will happen via state update or manual call if needed, 
            // generally fetchStores handles the "after create" logic if called.
            // But let's set state locally for instant feedback
            const newMember: StoreMember = {
                store_id: newStore.id,
                user_id: user.id,
                role: 'owner',
                stores: newStore
            };

            setMemberships([newMember]);
            setMyStores([newStore]);
            setCurrentStore(newStore);
            setRole('owner');
            return null;
        } catch (e: any) {
            console.error('Create Default Store Error:', JSON.stringify(e, null, 2));
            return e.message || '매장 생성 실패';
        }
    }

    const createDefaultStore = async () => {
        return createDefaultStoreImpl();
    };

    const createStore = async (name: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 'Not authenticated';

            const { data: newStore, error: createError } = await supabase
                .from('stores')
                .insert({ name, owner_id: user.id })
                .select()
                .single();

            if (createError) throw createError;

            await supabase.from('store_members').insert({
                store_id: newStore.id,
                user_id: user.id,
                role: 'owner'
            });

            await fetchStores(); // Refresh list to get full member objects
            return null;
        } catch (e: any) {
            console.error('Create Store Error:', e);
            return e.message || '매장 생성 실패';
        }
    };

    // Explicit handler for switching stores
    const handleSetCurrentStore = (store: Store) => {
        setCurrentStore(store);

        // Fix for "All Stores" view:
        // Since 'ALL' is a virtual store with no membership record, it defaults to 'staff'.
        // We explicitly set it to 'owner' so the dashboard and menus remain visible.
        if (store.id === 'ALL') {
            setRole('owner');
            return;
        }

        const myRole = memberships.find(m => m.store_id === store.id)?.role;
        setRole(myRole || 'staff');
    };

    useEffect(() => {
        fetchStores();
    }, []); // Run once on mount

    const value = {
        currentStore,
        myStores,
        memberships,
        role,
        isLoading,
        user,
        setCurrentStore: handleSetCurrentStore,
        refreshStores: fetchStores,
        createDefaultStore,
        createStore
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
