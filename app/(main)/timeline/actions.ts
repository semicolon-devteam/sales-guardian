'use server';

import { createClient } from "@/app/_shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function parseAndSuggestExpense(imageUrl: string) {
    // TODO: Implement parseExpenseFromOCR in ocr-parser.ts
    // const { parseExpenseFromOCR } = await import('../sales/_utils/ocr-parser');
    try {
        // const data = await parseExpenseFromOCR(imageUrl);
        // Temporary mock response until OCR parser is implemented
        return { success: false, error: 'OCR parser not implemented yet' };
    } catch (e: any) {
        console.error("OCR Failed", e);
        return { success: false, error: e.message };
    }
}

export async function submitExpenseAndProcessPost(formData: FormData, postId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };

    const date = formData.get('date') as string;
    const merchant_name = formData.get('merchant_name') as string;
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as string;

    if (!date || !merchant_name || !amount) {
        return { error: '필수 항목을 입력해주세요.' };
    }

    try {
        // 1. Insert Expense
        const { data: expense, error: expenseError } = await supabase
            .from('expenses')
            .insert({
                user_id: user.id,
                store_id: (await getStoreIdFromPost(postId, supabase)) || undefined, // Helper to get store_id
                date,
                merchant_name,
                amount,
                category,
                payment_method: 'card', // Default
                is_fixed_cost: false
            })
            .select()
            .single();

        if (expenseError) throw expenseError;

        // 2. Update Timeline Post
        const { error: postError } = await supabase
            .from('timeline_posts')
            .update({
                status: 'done',
                metadata: { expense_id: expense.id }
            })
            .eq('id', postId);

        if (postError) throw postError;

        revalidatePath('/timeline');
        revalidatePath('/calendar');
        revalidatePath('/expenses');

        return { success: true };

    } catch (e: any) {
        console.error(e);
        return { error: e.message || '처리 중 오류가 발생했습니다.' };
    }
}

async function getStoreIdFromPost(postId: string, supabase: any) {
    const { data } = await supabase.from('timeline_posts').select('store_id').eq('id', postId).single();
    return data?.store_id;
}
