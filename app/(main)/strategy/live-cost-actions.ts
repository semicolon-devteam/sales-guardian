'use server';

import { revalidatePath } from 'next/cache';
import {
    getMenuItems,
    getMenuItemWithIngredients,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getIngredients,
    createIngredient,
    updateIngredientPrice,
    findIngredientByTag,
    linkIngredientToMenu,
    unlinkIngredientFromMenu,
    getUnreadAlerts,
    markAlertAsRead,
    createMarginAlert,
    getMenuCostAnalysis,
    getDangerMenus,
    type MenuItem,
    type Ingredient,
    type MenuIngredient,
    type MarginAlert,
    type MenuCostAnalysis
} from './_repositories/live-cost-repository';

// =============================================================================
// Menu Item Actions
// =============================================================================

export async function fetchMenuItems(storeId?: string) {
    try {
        const data = await getMenuItems(storeId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchMenuItems error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchMenuItemWithIngredients(menuId: string) {
    try {
        const data = await getMenuItemWithIngredients(menuId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchMenuItemWithIngredients error:', error);
        return { success: false, error: error.message };
    }
}

export async function addMenuItem(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const category = formData.get('category') as string;
        const selling_price = Number(formData.get('selling_price')) || 0;
        const base_cost = Number(formData.get('base_cost')) || 0;
        const safety_margin_percent = Number(formData.get('safety_margin_percent')) || 30;
        const store_id = formData.get('store_id') as string;

        if (!name) {
            return { success: false, error: '메뉴 이름을 입력해주세요.' };
        }

        const menu = await createMenuItem({
            name,
            category,
            selling_price,
            base_cost,
            safety_margin_percent,
            store_id
        });

        revalidatePath('/strategy');
        return { success: true, data: menu };
    } catch (error: any) {
        console.error('addMenuItem error:', error);
        return { success: false, error: error.message };
    }
}

export async function editMenuItem(menuId: string, data: Partial<MenuItem>) {
    try {
        const menu = await updateMenuItem(menuId, data);
        revalidatePath('/strategy');
        return { success: true, data: menu };
    } catch (error: any) {
        console.error('editMenuItem error:', error);
        return { success: false, error: error.message };
    }
}

export async function removeMenuItem(menuId: string) {
    try {
        await deleteMenuItem(menuId);
        revalidatePath('/strategy');
        return { success: true };
    } catch (error: any) {
        console.error('removeMenuItem error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// Ingredient Actions
// =============================================================================

export async function fetchIngredients(storeId?: string) {
    try {
        const data = await getIngredients(storeId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchIngredients error:', error);
        return { success: false, error: error.message };
    }
}

export async function addIngredient(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const category = formData.get('category') as string;
        const unit = formData.get('unit') as string || 'kg';
        const last_price = Number(formData.get('last_price')) || 0;
        const store_id = formData.get('store_id') as string;
        const tagsInput = formData.get('tags') as string;
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [`#${name}`];

        if (!name) {
            return { success: false, error: '식자재 이름을 입력해주세요.' };
        }

        const ingredient = await createIngredient({
            name,
            category,
            unit,
            last_price,
            tags,
            store_id
        });

        revalidatePath('/strategy');
        return { success: true, data: ingredient };
    } catch (error: any) {
        console.error('addIngredient error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateIngredientPriceAction(
    ingredientId: string,
    newPrice: number,
    quantity: number = 1,
    unit: string = 'kg',
    source: string = 'manual'
) {
    try {
        const result = await updateIngredientPrice(ingredientId, newPrice, quantity, unit, source);

        // 마진 위험 메뉴가 있으면 알림 생성
        for (const affected of result.affectedMenus) {
            if (affected.is_danger) {
                await createMarginAlert({
                    menu_id: affected.affected_menu_id,
                    ingredient_id: ingredientId,
                    alert_type: 'margin_danger',
                    severity: 'danger',
                    message: `사장님, ${affected.menu_name} 마진이 위험해요! (현재 ${affected.new_margin?.toFixed(1)}%)`,
                    old_value: affected.old_margin,
                    new_value: affected.new_margin,
                    change_percent: affected.new_margin - affected.old_margin
                });
            }
        }

        revalidatePath('/strategy');
        revalidatePath('/dashboard');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('updateIngredientPriceAction error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// Menu-Ingredient Linking Actions
// =============================================================================

export async function linkIngredient(menuId: string, ingredientId: string, quantity: number, unit: string = 'kg') {
    try {
        const link = await linkIngredientToMenu(menuId, ingredientId, quantity, unit);
        revalidatePath('/strategy');
        return { success: true, data: link };
    } catch (error: any) {
        console.error('linkIngredient error:', error);
        return { success: false, error: error.message };
    }
}

export async function unlinkIngredient(menuId: string, ingredientId: string) {
    try {
        await unlinkIngredientFromMenu(menuId, ingredientId);
        revalidatePath('/strategy');
        return { success: true };
    } catch (error: any) {
        console.error('unlinkIngredient error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// Alert Actions
// =============================================================================

export async function fetchUnreadAlerts(storeId?: string) {
    try {
        const data = await getUnreadAlerts(storeId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchUnreadAlerts error:', error);
        return { success: false, error: error.message };
    }
}

export async function readAlert(alertId: string) {
    try {
        await markAlertAsRead(alertId);
        revalidatePath('/strategy');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('readAlert error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// Analysis Actions
// =============================================================================

export async function fetchMenuCostAnalysis(storeId?: string) {
    try {
        const data = await getMenuCostAnalysis(storeId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchMenuCostAnalysis error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchDangerMenus(storeId?: string) {
    try {
        const data = await getDangerMenus(storeId);
        return { success: true, data };
    } catch (error: any) {
        console.error('fetchDangerMenus error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// OCR 기반 식자재 가격 자동 업데이트
// =============================================================================

export interface ParsedIngredientItem {
    name: string;
    price: number;
    quantity?: number;
    unit?: string;
}

export async function processExpenseOcrForIngredients(
    items: ParsedIngredientItem[],
    storeId?: string
) {
    try {
        const results: {
            matched: { item: ParsedIngredientItem; ingredient: Ingredient }[];
            unmatched: ParsedIngredientItem[];
            alerts: MarginAlert[];
        } = {
            matched: [],
            unmatched: [],
            alerts: []
        };

        for (const item of items) {
            // 태그 또는 이름으로 식자재 검색
            const ingredient = await findIngredientByTag(`#${item.name}`, storeId);

            if (ingredient) {
                // 식자재 가격 업데이트
                const updateResult = await updateIngredientPrice(
                    ingredient.id,
                    item.price,
                    item.quantity || 1,
                    item.unit || ingredient.unit,
                    'expense_ocr'
                );

                results.matched.push({
                    item,
                    ingredient: updateResult.ingredient
                });

                // 영향받은 메뉴 중 마진 위험한 것 알림 생성
                for (const affected of updateResult.affectedMenus) {
                    if (affected.is_danger) {
                        const alert = await createMarginAlert({
                            menu_id: affected.affected_menu_id,
                            ingredient_id: ingredient.id,
                            alert_type: 'margin_danger',
                            severity: 'danger',
                            message: `사장님, ${affected.menu_name} 마진이 위험해요! (현재 ${affected.new_margin?.toFixed(1)}%)`,
                            old_value: affected.old_margin,
                            new_value: affected.new_margin,
                            change_percent: affected.new_margin - affected.old_margin,
                            store_id: storeId
                        });
                        results.alerts.push(alert);
                    }
                }
            } else {
                results.unmatched.push(item);
            }
        }

        revalidatePath('/strategy');
        revalidatePath('/dashboard');

        return { success: true, data: results };
    } catch (error: any) {
        console.error('processExpenseOcrForIngredients error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// AI 기반 식자재 추출 (Claude Vision API)
// =============================================================================

export async function extractIngredientsFromReceipt(imageBase64: string) {
    try {
        // Anthropic API 호출
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic();

        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: imageBase64
                            }
                        },
                        {
                            type: 'text',
                            text: `이 영수증에서 식자재 항목들을 추출해주세요.

응답은 반드시 아래 JSON 형식으로만 해주세요:
{
  "items": [
    {
      "name": "식자재명 (예: 양파, 돼지고기)",
      "price": 금액(숫자만),
      "quantity": 수량(숫자만, 없으면 1),
      "unit": "단위 (kg, g, 개, 박스 등)"
    }
  ],
  "total": 총합계(숫자만),
  "merchant": "상호명"
}

주의사항:
- 식자재가 아닌 것(배달비, 부가세 등)은 제외
- 가격은 숫자만 (원 단위, 콤마 제거)
- 불확실한 항목은 제외`
                        }
                    ]
                }
            ]
        });

        // 응답 파싱
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        // JSON 추출
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { success: false, error: 'JSON 파싱 실패' };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            data: {
                items: parsed.items as ParsedIngredientItem[],
                total: parsed.total,
                merchant: parsed.merchant
            }
        };
    } catch (error: any) {
        console.error('extractIngredientsFromReceipt error:', error);
        return { success: false, error: error.message };
    }
}
