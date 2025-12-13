'use server';

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/app/_shared/utils/supabase/server';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// Live Cost 데이터 조회 (AI 컨텍스트용)
// =============================================================================

export interface LiveCostContext {
    dangerMenus: { name: string; margin: number; cost: number; price: number }[];
    recentPriceChanges: { ingredient: string; oldPrice: number; newPrice: number; changePercent: number }[];
    topCostIngredients: { name: string; price: number; unit: string }[];
    unreadAlerts: { message: string; severity: string }[];
    menuCostSummary: { totalMenus: number; avgMargin: number; lowMarginCount: number };
}

export async function fetchLiveCostContext(storeId?: string): Promise<LiveCostContext> {
    const supabase = await createClient();

    const context: LiveCostContext = {
        dangerMenus: [],
        recentPriceChanges: [],
        topCostIngredients: [],
        unreadAlerts: [],
        menuCostSummary: { totalMenus: 0, avgMargin: 0, lowMarginCount: 0 }
    };

    try {
        // 1. 마진 위험 메뉴 조회
        let menuQuery = supabase
            .from('menu_items')
            .select('name, selling_price, current_cost')
            .gt('current_cost', 0);

        if (storeId) menuQuery = menuQuery.eq('store_id', storeId);

        const { data: menus } = await menuQuery;

        if (menus) {
            const menuData = menus.map(m => ({
                name: m.name,
                price: m.selling_price,
                cost: m.current_cost || 0,
                margin: m.selling_price > 0 ? ((m.selling_price - (m.current_cost || 0)) / m.selling_price) * 100 : 0
            }));

            context.dangerMenus = menuData.filter(m => m.margin < 30).slice(0, 5);
            context.menuCostSummary = {
                totalMenus: menuData.length,
                avgMargin: menuData.length > 0 ? menuData.reduce((a, b) => a + b.margin, 0) / menuData.length : 0,
                lowMarginCount: menuData.filter(m => m.margin < 30).length
            };
        }

        // 2. 최근 가격 변동 (가격 이력에서)
        let priceHistoryQuery = supabase
            .from('ingredient_price_history')
            .select('ingredient_id, price, price_per_unit, recorded_at, ingredients(name)')
            .order('recorded_at', { ascending: false })
            .limit(10);

        const { data: priceHistory } = await priceHistoryQuery;

        if (priceHistory && priceHistory.length > 1) {
            // Group by ingredient and compare prices
            const priceChanges: typeof context.recentPriceChanges = [];
            const seen = new Set<string>();

            for (const h of priceHistory as any[]) {
                const ingredientName = h.ingredients?.name;
                if (!ingredientName || seen.has(ingredientName)) continue;
                seen.add(ingredientName);

                // Find previous price for same ingredient
                const prevRecord = priceHistory.find((p: any) =>
                    p.ingredients?.name === ingredientName && p.recorded_at !== h.recorded_at
                );

                if (prevRecord) {
                    const oldPrice = (prevRecord as any).price || 0;
                    const newPrice = h.price || 0;
                    if (oldPrice > 0 && newPrice !== oldPrice) {
                        priceChanges.push({
                            ingredient: ingredientName,
                            oldPrice,
                            newPrice,
                            changePercent: ((newPrice - oldPrice) / oldPrice) * 100
                        });
                    }
                }
            }
            context.recentPriceChanges = priceChanges.slice(0, 5);
        }

        // 3. 고가 식자재 TOP 5
        let ingredientQuery = supabase
            .from('ingredients')
            .select('name, last_price, unit')
            .order('last_price', { ascending: false })
            .limit(5);

        if (storeId) ingredientQuery = ingredientQuery.eq('store_id', storeId);

        const { data: ingredients } = await ingredientQuery;

        if (ingredients) {
            context.topCostIngredients = ingredients.map(i => ({
                name: i.name,
                price: i.last_price,
                unit: i.unit
            }));
        }

        // 4. 읽지 않은 알림
        let alertQuery = supabase
            .from('margin_alerts')
            .select('message, severity')
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);

        if (storeId) alertQuery = alertQuery.eq('store_id', storeId);

        const { data: alerts } = await alertQuery;

        if (alerts) {
            context.unreadAlerts = alerts.map(a => ({
                message: a.message,
                severity: a.severity
            }));
        }

    } catch (error) {
        console.error('fetchLiveCostContext error:', error);
    }

    return context;
}

// =============================================================================
// 스마트 추천 질문 생성
// =============================================================================

export interface SmartSuggestion {
    id: string;
    label: string;
    query: string;
    priority: number;
    icon: string;
}

export async function generateSmartSuggestions(storeId?: string): Promise<SmartSuggestion[]> {
    const liveCost = await fetchLiveCostContext(storeId);
    const suggestions: SmartSuggestion[] = [];

    // 마진 위험 메뉴가 있으면 관련 질문 추가
    if (liveCost.dangerMenus.length > 0) {
        suggestions.push({
            id: 'danger-menus',
            label: `마진 위험 메뉴 ${liveCost.dangerMenus.length}개 분석해줘 🚨`,
            query: `마진이 낮은 메뉴들을 분석해줘. 현재 ${liveCost.dangerMenus.map(m => `${m.name}(${m.margin.toFixed(1)}%)`).join(', ')}가 위험해.`,
            priority: 1,
            icon: '🚨'
        });
    }

    // 최근 가격 변동이 있으면
    if (liveCost.recentPriceChanges.length > 0) {
        const priceUp = liveCost.recentPriceChanges.filter(p => p.changePercent > 0);
        if (priceUp.length > 0) {
            suggestions.push({
                id: 'price-changes',
                label: '최근 식자재 가격 변동 분석 📈',
                query: '최근 식자재 가격 변동에 대해 분석해줘',
                priority: 2,
                icon: '📈'
            });
        }
    }

    // 읽지 않은 알림이 있으면
    if (liveCost.unreadAlerts.length > 0) {
        suggestions.push({
            id: 'unread-alerts',
            label: `새 알림 ${liveCost.unreadAlerts.length}개 확인 🔔`,
            query: '읽지 않은 알림들을 요약해줘',
            priority: 1,
            icon: '🔔'
        });
    }

    // 기본 추천 질문
    suggestions.push(
        {
            id: 'cost-analysis',
            label: '식자재 비용 분석해줘 🥩',
            query: '식자재 비용을 분석해줘',
            priority: 3,
            icon: '🥩'
        },
        {
            id: 'profit-tips',
            label: '수익 개선 팁 알려줘 💡',
            query: '수익을 개선할 수 있는 팁을 알려줘',
            priority: 4,
            icon: '💡'
        },
        {
            id: 'menu-strategy',
            label: '메뉴 전략 조언해줘 📊',
            query: '메뉴 전략에 대해 조언해줘',
            priority: 5,
            icon: '📊'
        }
    );

    // 우선순위 정렬 후 상위 4개 반환
    return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

// =============================================================================
// AI Assistant (고도화)
// =============================================================================

export async function askAiAssistant(message: string, contextData: any) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return {
            text: "죄송합니다. AI 서비스 키가 설정되지 않았습니다. 관리자에게 문의해주세요. 😓",
            role: 'ai'
        };
    }

    try {
        // Live Cost 컨텍스트 조회
        const storeId = contextData?.storeId;
        const liveCostContext = await fetchLiveCostContext(storeId);

        // 데이터 유무 체크
        const hasMenuData = liveCostContext.menuCostSummary.totalMenus > 0;
        const hasDangerMenus = liveCostContext.dangerMenus.length > 0;
        const hasPriceChanges = liveCostContext.recentPriceChanges.length > 0;
        const hasAlerts = liveCostContext.unreadAlerts.length > 0;
        const hasAnyData = hasMenuData || hasPriceChanges || hasAlerts;

        // 강화된 시스템 프롬프트
        const systemPrompt = `
You are "세일즈키퍼 AI", a smart and friendly restaurant financial manager AI.
Your mission is to help store owners optimize profitability using real-time data.

## CRITICAL RULES - YOU MUST FOLLOW:
1. **NEVER make up or hallucinate data**. Only mention specific menu names, numbers, or percentages if they are explicitly provided below.
2. If no data is available, honestly say "아직 등록된 데이터가 없습니다" or guide the user to input data first.
3. Do NOT invent menu names, ingredient names, or percentages that are not in the data below.

## Data Availability Status:
- 메뉴 데이터 존재: ${hasMenuData ? '예' : '아니오 (메뉴를 먼저 등록해주세요)'}
- 마진 위험 메뉴: ${hasDangerMenus ? `${liveCostContext.dangerMenus.length}개` : '없음'}
- 가격 변동 기록: ${hasPriceChanges ? `${liveCostContext.recentPriceChanges.length}건` : '없음'}
- 미확인 알림: ${hasAlerts ? `${liveCostContext.unreadAlerts.length}건` : '없음'}

${hasAnyData ? `## Actual Store Data (USE ONLY THIS DATA):
${hasMenuData ? `- 등록된 메뉴: ${liveCostContext.menuCostSummary.totalMenus}개
- 평균 마진율: ${liveCostContext.menuCostSummary.avgMargin.toFixed(1)}%
- 마진 30% 미만 메뉴: ${liveCostContext.menuCostSummary.lowMarginCount}개` : ''}
${hasDangerMenus ? `
### 마진 위험 메뉴 (실제 데이터):
${liveCostContext.dangerMenus.map(m => `  • ${m.name}: 마진 ${m.margin.toFixed(1)}%, 원가 ${m.cost.toLocaleString()}원, 판매가 ${m.price.toLocaleString()}원`).join('\n')}` : ''}
${hasPriceChanges ? `
### 최근 가격 변동 (실제 데이터):
${liveCostContext.recentPriceChanges.map(p => `  • ${p.ingredient}: ${p.oldPrice.toLocaleString()}원 → ${p.newPrice.toLocaleString()}원 (${p.changePercent > 0 ? '+' : ''}${p.changePercent.toFixed(1)}%)`).join('\n')}` : ''}
${hasAlerts ? `
### 미확인 알림:
${liveCostContext.unreadAlerts.map(a => `  • [${a.severity}] ${a.message}`).join('\n')}` : ''}
` : `## NO DATA AVAILABLE
사용자가 아직 메뉴나 식자재를 등록하지 않았습니다.
- 메뉴 전략가에서 메뉴와 원가를 입력하도록 안내하세요.
- 구체적인 숫자나 메뉴명을 언급하지 마세요.
`}

## Response Guidelines:
1. **Language**: Always Korean, friendly tone ("사장님, ~입니다", "~해보시는 건 어떨까요?")
2. **Data-First**: ONLY cite numbers that exist in the data above. If data doesn't exist, say so.
3. **Actionable**: Provide concrete advice only when you have actual data to base it on.
4. **Concise**: 3-5 sentences max unless detailed report requested.
5. **Honest**: If you don't have data to answer, admit it and guide the user to input data.
6. **Emoji**: Use relevant emojis sparingly.

User Query: ${message}
`;

        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500, // 더 긴 응답 허용
            messages: [
                { role: "user", content: message }
            ],
            system: systemPrompt
        });

        const contentBlock = response.content[0];
        const replyText = contentBlock.type === 'text' ? contentBlock.text : "죄송합니다. 답변을 생성하지 못했습니다.";

        return { text: replyText, role: 'ai' };

    } catch (error: any) {
        console.error("Claude API Error:", error);
        return {
            text: `AI 연결 중 오류가 발생했습니다. (${error.message})`,
            role: 'ai'
        };
    }
}
