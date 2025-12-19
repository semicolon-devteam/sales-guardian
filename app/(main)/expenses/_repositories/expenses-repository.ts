import { createClient } from '@/app/_shared/utils/supabase/server';

export type Expense = {
    id: string;
    user_id: string;
    amount: number;
    merchant_name: string;
    date: string; // YYYY-MM-DD
    category?: string;
    image_url?: string;
    created_at: string;
};

export async function getExpenses(storeId?: string) {
    const supabase = await createClient();
    let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Expense[];
}

export async function getDailyExpenses(date: string, storeId?: string) {
    const supabase = await createClient();
    let query = supabase
        .from('expenses')
        .select('*')
        .eq('date', date);

    // if (storeId && storeId !== 'all') {
    //     query = query.eq('store_id', storeId);
    // }

    const { data, error } = await query;
    if (error) throw error;
    return data as Expense[];
}

export async function addExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
        .from('expenses')
        .insert({
            ...expense,
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getMonthlyExpenses(year: number, month: number, storeId?: string) {
    const supabase = await createClient();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`; // Approx

    let query = supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

    // if (storeId && storeId !== 'all') {
    //     query = query.eq('store_id', storeId);
    // }

    const { data, error } = await query;
    if (error) throw error;
    return data as Expense[];
}

export async function getExpensesRange(startDate: string, endDate: string, storeId?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

    // if (storeId && storeId !== 'all') {
    //     query = query.eq('store_id', storeId);
    // }

    const { data, error } = await query;
    if (error) throw error;
    return data as Expense[];
}
