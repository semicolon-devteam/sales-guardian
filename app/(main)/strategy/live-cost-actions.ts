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
import {
    findBestMatches,
    inferCategory,
    inferUnit,
    type MatchResult
} from './_utils/fuzzy-match';

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

// =============================================================================
// 스마트 매칭 (Fuzzy Matching + 자동 등록)
// =============================================================================

export interface SmartMatchedItem extends ParsedIngredientItem {
    matchResult?: {
        ingredientId: string;
        ingredientName: string;
        score: number;
        matchType: 'exact' | 'tag' | 'fuzzy' | 'new';
    };
    suggestedCategory?: string;
    suggestedUnit?: string;
}

/**
 * OCR 추출 결과를 기존 식자재와 스마트 매칭
 */
export async function smartMatchIngredients(
    items: ParsedIngredientItem[],
    storeId?: string
): Promise<{ success: boolean; data?: SmartMatchedItem[]; error?: string }> {
    try {
        // 1. 기존 식자재 목록 가져오기
        const ingredients = await getIngredients(storeId);

        // 2. 각 아이템에 대해 스마트 매칭 수행
        const matchedItems: SmartMatchedItem[] = items.map(item => {
            const matches = findBestMatches(
                item.name,
                ingredients.map(i => ({ id: i.id, name: i.name, tags: i.tags })),
                60 // 60% 이상 매칭
            );

            if (matches.length > 0) {
                const best = matches[0];
                return {
                    ...item,
                    matchResult: {
                        ingredientId: best.ingredient.id,
                        ingredientName: best.ingredient.name,
                        score: best.score,
                        matchType: best.matchType
                    }
                };
            } else {
                // 매칭 실패 - 신규 등록 제안
                return {
                    ...item,
                    matchResult: {
                        ingredientId: '',
                        ingredientName: item.name,
                        score: 0,
                        matchType: 'new' as const
                    },
                    suggestedCategory: inferCategory(item.name),
                    suggestedUnit: inferUnit(item.name, item.quantity)
                };
            }
        });

        return { success: true, data: matchedItems };
    } catch (error: any) {
        console.error('smartMatchIngredients error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 스마트 매칭 결과 처리 (업데이트 + 신규 등록)
 */
export async function processSmartMatchedItems(
    items: SmartMatchedItem[],
    storeId?: string
): Promise<{
    success: boolean;
    data?: {
        updated: { item: SmartMatchedItem; ingredient: Ingredient }[];
        created: { item: SmartMatchedItem; ingredient: Ingredient }[];
        skipped: SmartMatchedItem[];
        alerts: MarginAlert[];
    };
    error?: string;
}> {
    try {
        const results = {
            updated: [] as { item: SmartMatchedItem; ingredient: Ingredient }[],
            created: [] as { item: SmartMatchedItem; ingredient: Ingredient }[],
            skipped: [] as SmartMatchedItem[],
            alerts: [] as MarginAlert[]
        };

        for (const item of items) {
            if (!item.matchResult) {
                results.skipped.push(item);
                continue;
            }

            // 기존 식자재 업데이트
            if (item.matchResult.matchType !== 'new' && item.matchResult.ingredientId) {
                const updateResult = await updateIngredientPrice(
                    item.matchResult.ingredientId,
                    item.price,
                    item.quantity || 1,
                    item.unit || 'kg',
                    'smart_ocr'
                );

                results.updated.push({
                    item,
                    ingredient: updateResult.ingredient
                });

                // 마진 위험 알림 생성
                for (const affected of updateResult.affectedMenus) {
                    if (affected.is_danger) {
                        const alert = await createMarginAlert({
                            menu_id: affected.affected_menu_id,
                            ingredient_id: item.matchResult.ingredientId,
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
            }
            // 신규 식자재 등록
            else if (item.matchResult.matchType === 'new') {
                const newIngredient = await createIngredient({
                    name: item.name,
                    category: item.suggestedCategory || '기타',
                    unit: item.suggestedUnit || item.unit || 'kg',
                    last_price: item.price,
                    tags: [`#${item.name}`],
                    store_id: storeId
                });

                results.created.push({
                    item,
                    ingredient: newIngredient
                });
            }
        }

        revalidatePath('/strategy');
        revalidatePath('/dashboard');

        return { success: true, data: results };
    } catch (error: any) {
        console.error('processSmartMatchedItems error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 신규 식자재 빠른 등록
 */
export async function quickAddIngredient(data: {
    name: string;
    price: number;
    quantity?: number;
    unit?: string;
    category?: string;
    storeId?: string;
}): Promise<{ success: boolean; data?: Ingredient; error?: string }> {
    try {
        const ingredient = await createIngredient({
            name: data.name,
            category: data.category || inferCategory(data.name),
            unit: data.unit || inferUnit(data.name),
            last_price: data.price,
            tags: [`#${data.name}`],
            store_id: data.storeId
        });

        revalidatePath('/strategy');
        return { success: true, data: ingredient };
    } catch (error: any) {
        console.error('quickAddIngredient error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// AI Strategy Coach - Menu-specific AI Advice
// =============================================================================

export interface MenuStrategyAdvice {
    summary: string;
    severity: 'danger' | 'warning' | 'good' | 'info';
    priceRecommendation?: {
        suggestedPrice: number;
        expectedProfitChange: number;
        reasoning: string;
    };
    actionItems: string[];
    trendInsight?: {
        direction: 'up' | 'down' | 'stable';
        message: string;
    };
}

interface MenuStrategyInput {
    menuName: string;
    sellingPrice: number;
    currentCost: number;
    marginPercent: number;
    salesQuantity: number;
    totalProfit: number;
    bcgType: string;
    storeId?: string;
}

export async function generateMenuStrategy(
    input: MenuStrategyInput
): Promise<{ success: boolean; data?: MenuStrategyAdvice; error?: string }> {
    try {
        // Claude API 호출
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            // API 키 없으면 규칙 기반 조언 생성
            return { success: true, data: generateRuleBasedAdvice(input) };
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                system: `You are a restaurant menu strategist AI called "메뉴 전략 코치".
Your job is to analyze a menu item's financial data and provide actionable Korean advice.

IMPORTANT:
- Always respond in Korean
- Be specific with numbers
- Consider the BCG matrix position (star=고수익/고판매, cashcow=저수익/고판매, gem=고수익/저판매, dog=저수익/저판매)
- Provide practical, implementable advice

Response format (JSON only, no markdown):
{
  "summary": "1-2 sentence main insight in Korean",
  "severity": "danger|warning|good|info",
  "priceRecommendation": {
    "suggestedPrice": number or null,
    "expectedProfitChange": number (monthly),
    "reasoning": "why this price in Korean"
  },
  "actionItems": ["action 1", "action 2", "action 3"],
  "trendInsight": {
    "direction": "up|down|stable",
    "message": "trend explanation in Korean"
  }
}`,
                messages: [{
                    role: 'user',
                    content: `메뉴 분석 요청:
- 메뉴명: ${input.menuName}
- 판매가: ${input.sellingPrice.toLocaleString()}원
- 원가: ${input.currentCost.toLocaleString()}원
- 마진율: ${input.marginPercent.toFixed(1)}%
- 월 판매량: ${input.salesQuantity}개
- 월 총이익: ${input.totalProfit.toLocaleString()}원
- BCG 유형: ${input.bcgType}

이 메뉴에 대한 전략적 조언을 JSON 형식으로 제공해주세요.`
                }]
            })
        });

        if (!response.ok) {
            console.error('Claude API error:', response.status);
            return { success: true, data: generateRuleBasedAdvice(input) };
        }

        const result = await response.json();
        const content = result.content?.[0]?.text;

        if (!content) {
            return { success: true, data: generateRuleBasedAdvice(input) };
        }

        // JSON 파싱 시도
        try {
            const advice = JSON.parse(content);
            return { success: true, data: advice };
        } catch {
            // JSON 파싱 실패 시 규칙 기반으로 폴백
            return { success: true, data: generateRuleBasedAdvice(input) };
        }

    } catch (error: any) {
        console.error('generateMenuStrategy error:', error);
        // 에러 발생 시에도 규칙 기반 조언 제공
        return { success: true, data: generateRuleBasedAdvice(input) };
    }
}

// =============================================================================
// 영수증 자동 분석 (지출관리에서 호출) - B안 구현
// =============================================================================

export interface ReceiptAnalysisResult {
    isIngredientReceipt: boolean;
    confidence: number;
    receiptType: 'ingredient' | 'utility' | 'equipment' | 'other';
    items?: ParsedIngredientItem[];
    merchant?: string;
    total?: number;
    processedCount?: number;
    createdCount?: number;
}

/**
 * 영수증 이미지를 분석하여 식자재 영수증인지 판별하고
 * 식자재면 자동으로 ingredients 테이블 업데이트
 */
export async function analyzeAndProcessReceiptImage(
    imageUrl: string,
    storeId?: string
): Promise<{ success: boolean; data?: ReceiptAnalysisResult; error?: string }> {
    try {
        // 1. 이미지 URL에서 base64로 변환
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return { success: false, error: '이미지를 불러올 수 없습니다.' };
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        // 2. AI로 영수증 분석 및 식자재 판별
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
                            text: `이 영수증을 분석해주세요.

1. 먼저 이 영수증이 어떤 유형인지 판별해주세요:
   - ingredient: 식자재/식료품 구매 (마트, 시장, 식자재 도매 등)
   - utility: 공과금 (전기, 가스, 수도, 통신 등)
   - equipment: 장비/비품 구매
   - other: 기타

2. 식자재 영수증(ingredient)인 경우에만, 각 품목을 추출해주세요.

응답 형식 (JSON만):
{
  "receiptType": "ingredient|utility|equipment|other",
  "isIngredientReceipt": true/false,
  "confidence": 0.0-1.0,
  "merchant": "상호명",
  "total": 총합계(숫자),
  "items": [
    {
      "name": "품목명",
      "price": 금액(숫자),
      "quantity": 수량(숫자, 기본 1),
      "unit": "단위"
    }
  ]
}

주의:
- 식자재가 아닌 영수증이면 items는 빈 배열
- 가격은 숫자만 (원 단위)
- 배달비, 부가세 등은 items에서 제외`
                        }
                    ]
                }
            ]
        });

        // 3. 응답 파싱
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return {
                success: true,
                data: {
                    isIngredientReceipt: false,
                    confidence: 0,
                    receiptType: 'other'
                }
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // 4. 식자재 영수증이 아니면 여기서 종료
        if (!parsed.isIngredientReceipt || parsed.receiptType !== 'ingredient') {
            return {
                success: true,
                data: {
                    isIngredientReceipt: false,
                    confidence: parsed.confidence || 0.5,
                    receiptType: parsed.receiptType || 'other',
                    merchant: parsed.merchant
                }
            };
        }

        // 5. 식자재 영수증이면 스마트 매칭 및 자동 처리
        const items: ParsedIngredientItem[] = parsed.items || [];

        if (items.length === 0) {
            return {
                success: true,
                data: {
                    isIngredientReceipt: true,
                    confidence: parsed.confidence || 0.8,
                    receiptType: 'ingredient',
                    merchant: parsed.merchant,
                    total: parsed.total,
                    items: [],
                    processedCount: 0,
                    createdCount: 0
                }
            };
        }

        // 스마트 매칭
        const matchResult = await smartMatchIngredients(items, storeId);
        if (!matchResult.success || !matchResult.data) {
            return {
                success: true,
                data: {
                    isIngredientReceipt: true,
                    confidence: parsed.confidence || 0.8,
                    receiptType: 'ingredient',
                    merchant: parsed.merchant,
                    total: parsed.total,
                    items,
                    processedCount: 0,
                    createdCount: 0
                }
            };
        }

        // 자동 처리 (업데이트 + 신규 등록)
        const processResult = await processSmartMatchedItems(matchResult.data, storeId);

        return {
            success: true,
            data: {
                isIngredientReceipt: true,
                confidence: parsed.confidence || 0.9,
                receiptType: 'ingredient',
                merchant: parsed.merchant,
                total: parsed.total,
                items,
                processedCount: processResult.data?.updated.length || 0,
                createdCount: processResult.data?.created.length || 0
            }
        };

    } catch (error: any) {
        console.error('analyzeAndProcessReceiptImage error:', error);
        // 에러가 발생해도 지출 저장은 성공해야 하므로 실패를 반환하지 않음
        return {
            success: true,
            data: {
                isIngredientReceipt: false,
                confidence: 0,
                receiptType: 'other'
            }
        };
    }
}

/**
 * 규칙 기반 메뉴 전략 조언 생성 (API 없이도 동작)
 */
function generateRuleBasedAdvice(input: MenuStrategyInput): MenuStrategyAdvice {
    const { menuName, sellingPrice, currentCost, marginPercent, salesQuantity, totalProfit, bcgType } = input;

    // 마진 위험도 분석
    let severity: MenuStrategyAdvice['severity'] = 'info';
    if (marginPercent < 20) severity = 'danger';
    else if (marginPercent < 30) severity = 'warning';
    else if (marginPercent >= 40) severity = 'good';

    // BCG 유형별 전략
    const bcgStrategies: Record<string, { summary: string; actions: string[] }> = {
        star: {
            summary: `${menuName}은(는) 효자 메뉴입니다! 높은 마진(${marginPercent.toFixed(1)}%)과 판매량(${salesQuantity}개)을 유지하세요.`,
            actions: [
                '현재 레시피와 품질을 철저히 유지하세요',
                '세트 메뉴에 포함시켜 다른 메뉴 판매도 함께 높이세요',
                '단골 고객에게 이 메뉴를 적극 추천하세요'
            ]
        },
        cashcow: {
            summary: `${menuName}은(는) 판매량은 좋지만 마진(${marginPercent.toFixed(1)}%)이 낮습니다. 원가 절감이 필요합니다.`,
            actions: [
                '식자재 대량 구매로 단가를 낮추세요',
                '레시피를 검토하여 원가 비중이 높은 재료를 대체하세요',
                '소폭 가격 인상(500~1,000원)을 고려하세요'
            ]
        },
        gem: {
            summary: `${menuName}은(는) 숨은 보석이에요! 마진(${marginPercent.toFixed(1)}%)은 좋지만 판매가 부족합니다.`,
            actions: [
                '메뉴판에서 눈에 잘 띄는 위치로 옮기세요',
                'SNS나 매장 내 POP로 홍보해보세요',
                '한정 프로모션으로 고객에게 맛보게 하세요'
            ]
        },
        dog: {
            summary: `${menuName}은(는) 마진(${marginPercent.toFixed(1)}%)과 판매량 모두 개선이 필요합니다.`,
            actions: [
                '메뉴 퇴출을 진지하게 검토하세요',
                '레시피를 전면 개편하거나 리뉴얼하세요',
                '원가를 대폭 줄일 수 있는 방법을 찾아보세요'
            ]
        }
    };

    const strategy = bcgStrategies[bcgType] || bcgStrategies.dog;

    // 가격 추천 계산
    let priceRecommendation: MenuStrategyAdvice['priceRecommendation'] | undefined;

    if (marginPercent < 30) {
        // 목표 마진 35%로 가격 계산
        const targetMargin = 0.35;
        const suggestedPrice = Math.ceil(currentCost / (1 - targetMargin) / 100) * 100; // 100원 단위 올림
        const priceDiff = suggestedPrice - sellingPrice;
        const expectedProfitChange = priceDiff * salesQuantity;

        if (priceDiff > 0 && priceDiff <= sellingPrice * 0.15) { // 15% 이내 인상만 추천
            priceRecommendation = {
                suggestedPrice,
                expectedProfitChange,
                reasoning: `마진율을 ${marginPercent.toFixed(1)}%에서 35%로 높이기 위한 가격입니다.`
            };
        }
    }

    // 트렌드 인사이트
    const trendInsight: MenuStrategyAdvice['trendInsight'] = {
        direction: marginPercent >= 35 ? 'up' : marginPercent >= 25 ? 'stable' : 'down',
        message: marginPercent >= 35
            ? '마진율이 안정적입니다. 현재 전략을 유지하세요.'
            : marginPercent >= 25
                ? '마진율이 보통 수준입니다. 원가 관리에 주의하세요.'
                : '마진율이 낮습니다. 즉시 개선 조치가 필요합니다.'
    };

    return {
        summary: strategy.summary,
        severity,
        priceRecommendation,
        actionItems: strategy.actions,
        trendInsight
    };
}
