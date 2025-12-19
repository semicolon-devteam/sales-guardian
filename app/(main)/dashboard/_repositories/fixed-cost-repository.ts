import { createClient } from '@/app/_shared/utils/supabase/server';

export type FixedCost = {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    payment_day?: number;
    created_at: string;
};

export async function getFixedCosts(storeId?: string) {
    const supabase = await createClient();
    let query = supabase
        .from('fixed_costs')
        .select('*')
        .order('created_at', { ascending: true });

    if (storeId) {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as FixedCost[];
}

export async function addFixedCost(cost: { name: string; amount: number; payment_day?: number }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('fixed_costs')
        .insert({
            ...cost,
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteFixedCost(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('fixed_costs')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getDailyFixedCostTotal() {
    const costs = await getFixedCosts();
    const totalMonthly = costs.reduce((acc, curr) => acc + curr.amount, 0);
    // Daily Amortization Logic: Monthly Total / 30
    return Math.floor(totalMonthly / 30);
}
