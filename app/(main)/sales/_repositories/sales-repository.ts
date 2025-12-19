import { createClient } from "@/app/_shared/utils/supabase/server";

export interface Sale {
    id: string;
    user_id: string;
    amount: number;
    date: string;
    type: 'hall' | 'baemin' | 'yogiyo' | 'coupang' | 'manual' | 'excel';
    store_id?: string;
    created_at: string;
}

export async function addSale(sale: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await supabase.from('mvp_sales').insert({
        ...sale,
        user_id: user.id
    });
}

export async function getDailySales(date: string, storeId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = supabase.from('mvp_sales').select('*').eq('user_id', user.id).eq('date', date);
    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }


    const { data } = await query;
    return data || [];
}

export async function getMonthlySales(year: number, month: number, storeId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Calculate end date (next month's 1st day)
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    let query = supabase.from('mvp_sales')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate);

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data } = await query;
    return data || [];
}

export async function getSalesByDateRange(startDate: string, endDate: string, storeId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = supabase.from('mvp_sales')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data } = await query;
    return data || [];
}

export async function getRecentActivity(storeId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase.from('mvp_sales')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data } = await query;
    return data || [];
}

export async function deleteSale(id: string) {
    const supabase = await createClient();
    await supabase.from('mvp_sales').delete().eq('id', id);
}

export async function addSaleWithItems(sale: any, items: any[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 1. Insert Sales Record
    const { data: saleData, error: saleError } = await supabase
        .from('mvp_sales')
        .insert({
            ...sale,
            user_id: user.id
        })
        .select()
        .single();

    if (saleError) throw saleError;

    // 2. Insert Items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(items.map(item => ({
                ...item,
                sale_id: saleData.id
            })));

        if (itemsError) throw itemsError;
    }
}

export async function getRecentItems() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Distinct selection for Autocomplete
    // Note: Supabase doesn't support distinct on select easily without RPC or tricky query.
    // For MVP, we fetch last 200 items and deduce unique locally.
    const { data } = await supabase
        .from('sale_items')
        .select(`
            name, unit_price,
            mvp_sales!inner ( user_id )
        `)
        .eq('mvp_sales.user_id', user.id)
        .order('id', { ascending: false })
        .limit(200);

    if (!data) return [];

    const map = new Map<string, number>();
    data.forEach((d: any) => {
        if (!map.has(d.name)) {
            map.set(d.name, d.unit_price);
        }
    });

    return Array.from(map.entries()).map(([name, price]) => ({ name, price }));
}

// Alias for backward compatibility
export { getSalesByDateRange as getSalesRange };
