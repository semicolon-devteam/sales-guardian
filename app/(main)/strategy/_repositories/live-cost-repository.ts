import { createClient } from "@/app/_shared/utils/supabase/server";

// =============================================================================
// Types
// =============================================================================

export interface MenuItem {
    id: string;
    user_id: string;
    store_id: string | null;
    name: string;
    category: string;
    selling_price: number;
    base_cost: number;
    current_cost: number;
    safety_margin_percent: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Ingredient {
    id: string;
    user_id: string;
    store_id: string | null;
    name: string;
    category: string;
    unit: string;
    last_price: number;
    last_price_per_unit: number;
    price_updated_at: string | null;
    previous_price: number;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface MenuIngredient {
    id: string;
    menu_id: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    ingredient?: Ingredient;
}

export interface MarginAlert {
    id: string;
    user_id: string;
    store_id: string | null;
    menu_id: string | null;
    ingredient_id: string | null;
    alert_type: 'margin_danger' | 'price_spike' | 'cost_increase';
    severity: 'info' | 'warning' | 'danger';
    message: string;
    old_value: number | null;
    new_value: number | null;
    change_percent: number | null;
    is_read: boolean;
    is_resolved: boolean;
    created_at: string;
    resolved_at: string | null;
    menu?: MenuItem;
    ingredient?: Ingredient;
}

export interface MenuCostAnalysis {
    id: string;
    name: string;
    category: string;
    selling_price: number;
    base_cost: number;
    current_cost: number;
    safety_margin_percent: number;
    current_margin_percent: number;
    is_margin_danger: boolean;
    is_active: boolean;
    ingredients?: MenuIngredient[];
}

// =============================================================================
// Menu Items Repository
// =============================================================================

export async function getMenuItems(storeId?: string): Promise<MenuItem[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getMenuItemWithIngredients(menuId: string): Promise<MenuCostAnalysis | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 메뉴 정보 가져오기
    const { data: menu, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', menuId)
        .eq('user_id', user.id)
        .single();

    if (menuError || !menu) return null;

    // 연결된 식자재 가져오기
    const { data: menuIngredients, error: ingredientsError } = await supabase
        .from('menu_ingredients')
        .select(`
            *,
            ingredient:ingredients(*)
        `)
        .eq('menu_id', menuId);

    if (ingredientsError) throw ingredientsError;

    const currentMargin = menu.selling_price > 0
        ? ((menu.selling_price - menu.current_cost) / menu.selling_price * 100)
        : 0;

    return {
        ...menu,
        current_margin_percent: Math.round(currentMargin * 100) / 100,
        is_margin_danger: currentMargin < menu.safety_margin_percent,
        ingredients: menuIngredients || []
    };
}

export async function createMenuItem(data: {
    name: string;
    category?: string;
    selling_price: number;
    base_cost?: number;
    safety_margin_percent?: number;
    store_id?: string;
}): Promise<MenuItem> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: menu, error } = await supabase
        .from('menu_items')
        .insert({
            user_id: user.id,
            store_id: data.store_id || null,
            name: data.name,
            category: data.category || '기타',
            selling_price: data.selling_price,
            base_cost: data.base_cost || 0,
            current_cost: data.base_cost || 0,
            safety_margin_percent: data.safety_margin_percent || 30
        })
        .select()
        .single();

    if (error) throw error;
    return menu;
}

export async function updateMenuItem(menuId: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: menu, error } = await supabase
        .from('menu_items')
        .update({
            ...data,
            updated_at: new Date().toISOString()
        })
        .eq('id', menuId)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;
    return menu;
}

export async function deleteMenuItem(menuId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuId)
        .eq('user_id', user.id);

    if (error) throw error;
}

// =============================================================================
// Ingredients Repository
// =============================================================================

export async function getIngredients(storeId?: string): Promise<Ingredient[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function createIngredient(data: {
    name: string;
    category?: string;
    unit?: string;
    last_price?: number;
    tags?: string[];
    store_id?: string;
}): Promise<Ingredient> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: ingredient, error } = await supabase
        .from('ingredients')
        .insert({
            user_id: user.id,
            store_id: data.store_id || null,
            name: data.name,
            category: data.category || '기타',
            unit: data.unit || 'kg',
            last_price: data.last_price || 0,
            last_price_per_unit: data.last_price || 0,
            tags: data.tags || [`#${data.name}`]
        })
        .select()
        .single();

    if (error) throw error;
    return ingredient;
}

export async function updateIngredientPrice(
    ingredientId: string,
    newPrice: number,
    quantity: number = 1,
    unit: string = 'kg',
    source: string = 'manual'
): Promise<{ ingredient: Ingredient; affectedMenus: any[] }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // RPC 함수 호출하여 가격 업데이트 및 연관 메뉴 재계산
    const { data: affectedMenus, error: rpcError } = await supabase
        .rpc('update_ingredient_price', {
            p_ingredient_id: ingredientId,
            p_new_price: newPrice,
            p_quantity: quantity,
            p_unit: unit,
            p_source: source
        });

    if (rpcError) {
        // RPC 함수가 없으면 직접 업데이트
        console.warn('RPC not available, using direct update:', rpcError);

        const pricePerUnit = quantity > 0 ? newPrice / quantity : newPrice;

        const { error: updateError } = await supabase
            .from('ingredients')
            .update({
                last_price: newPrice,
                last_price_per_unit: pricePerUnit,
                unit: unit,
                price_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', ingredientId)
            .eq('user_id', user.id);

        if (updateError) throw updateError;
    }

    // 업데이트된 식자재 가져오기
    const { data: ingredient, error: fetchError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', ingredientId)
        .single();

    if (fetchError) throw fetchError;

    return {
        ingredient,
        affectedMenus: affectedMenus || []
    };
}

export async function findIngredientByTag(tag: string, storeId?: string): Promise<Ingredient | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 태그로 식자재 검색 (부분 매칭)
    let query = supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id)
        .contains('tags', [tag]);

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
        // 태그로 못 찾으면 이름으로 검색
        const { data: byName } = await supabase
            .from('ingredients')
            .select('*')
            .eq('user_id', user.id)
            .ilike('name', `%${tag.replace('#', '')}%`)
            .limit(1)
            .single();

        return byName || null;
    }

    return data;
}

// =============================================================================
// Menu-Ingredient Linking
// =============================================================================

export async function linkIngredientToMenu(
    menuId: string,
    ingredientId: string,
    quantity: number,
    unit: string = 'kg'
): Promise<MenuIngredient> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menu_ingredients')
        .upsert({
            menu_id: menuId,
            ingredient_id: ingredientId,
            quantity,
            unit
        }, {
            onConflict: 'menu_id,ingredient_id'
        })
        .select()
        .single();

    if (error) throw error;

    // 메뉴 원가 재계산
    try {
        await supabase.rpc('recalculate_menu_cost', { p_menu_id: menuId });
    } catch {
        console.warn('recalculate_menu_cost RPC not available');
    }

    return data;
}

export async function unlinkIngredientFromMenu(menuId: string, ingredientId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('menu_ingredients')
        .delete()
        .eq('menu_id', menuId)
        .eq('ingredient_id', ingredientId);

    if (error) throw error;

    // 메뉴 원가 재계산
    try {
        await supabase.rpc('recalculate_menu_cost', { p_menu_id: menuId });
    } catch {
        console.warn('recalculate_menu_cost RPC not available');
    }
}

// =============================================================================
// Margin Alerts Repository
// =============================================================================

export async function getUnreadAlerts(storeId?: string): Promise<MarginAlert[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = supabase
        .from('margin_alerts')
        .select(`
            *,
            menu:menu_items(*),
            ingredient:ingredients(*)
        `)
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function markAlertAsRead(alertId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('margin_alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .eq('user_id', user.id);

    if (error) throw error;
}

export async function createMarginAlert(data: {
    menu_id?: string;
    ingredient_id?: string;
    alert_type: 'margin_danger' | 'price_spike' | 'cost_increase';
    severity: 'info' | 'warning' | 'danger';
    message: string;
    old_value?: number;
    new_value?: number;
    change_percent?: number;
    store_id?: string;
}): Promise<MarginAlert> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: alert, error } = await supabase
        .from('margin_alerts')
        .insert({
            user_id: user.id,
            store_id: data.store_id || null,
            menu_id: data.menu_id || null,
            ingredient_id: data.ingredient_id || null,
            alert_type: data.alert_type,
            severity: data.severity,
            message: data.message,
            old_value: data.old_value || null,
            new_value: data.new_value || null,
            change_percent: data.change_percent || null
        })
        .select()
        .single();

    if (error) throw error;
    return alert;
}

// =============================================================================
// Analysis Functions
// =============================================================================

export async function getMenuCostAnalysis(storeId?: string): Promise<MenuCostAnalysis[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 뷰가 있으면 사용, 없으면 직접 계산
    let query = supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

    if (storeId && storeId !== 'ALL') {
        query = query.eq('store_id', storeId);
    }

    const { data: menus, error } = await query;
    if (error) throw error;

    return (menus || []).map(menu => {
        const currentMargin = menu.selling_price > 0
            ? ((menu.selling_price - menu.current_cost) / menu.selling_price * 100)
            : 0;

        return {
            ...menu,
            current_margin_percent: Math.round(currentMargin * 100) / 100,
            is_margin_danger: currentMargin < menu.safety_margin_percent
        };
    });
}

export async function getDangerMenus(storeId?: string): Promise<MenuCostAnalysis[]> {
    const analysis = await getMenuCostAnalysis(storeId);
    return analysis.filter(m => m.is_margin_danger);
}
