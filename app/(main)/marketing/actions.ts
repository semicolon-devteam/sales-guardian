'use server';

import { createClient } from "@/app/_shared/utils/supabase/server";
import { fetchStrategyData } from '../strategy/strategy-actions';

// =============================================================================
// Types
// =============================================================================

export interface MarketingTrigger {
    id: string;
    type: 'menu' | 'weather' | 'inventory' | 'new_menu';
    label: string;
    description: string;
    icon: string;
    color: string;
    priority: number;
    data?: any;
}

export interface GeneratedCopy {
    channel: 'baemin' | 'yogiyo' | 'instagram' | 'danggeun' | 'pop';
    channelName: string;
    channelIcon: string;
    content: string;
    hashtags?: string[];
    tone: string;
}

export interface MarketingContext {
    storeName?: string;
    menuName?: string;
    menuPrice?: number;
    menuMargin?: number;
    triggerType: string;
    triggerReason: string;
    weatherInfo?: string;
    customPrompt?: string;
}

// =============================================================================
// Fetch Marketing Triggers
// =============================================================================

export async function fetchMarketingTriggers(storeId?: string): Promise<{ success: boolean; data?: MarketingTrigger[]; error?: string }> {
    try {
        const triggers: MarketingTrigger[] = [];
        let priority = 1;

        // 1. 메뉴 전략 데이터에서 Star/Gem 메뉴 추출
        if (storeId) {
            const strategyResult = await fetchStrategyData(storeId);
            if (strategyResult.success && strategyResult.data) {
                // Star 메뉴 (고마진 + 고판매)
                const starMenus = strategyResult.data.filter((m: any) => m.type === 'star' && m.margin >= 50);
                for (const menu of starMenus.slice(0, 2)) {
                    triggers.push({
                        id: `star-${menu.name}`,
                        type: 'menu',
                        label: `${menu.name} (마진 ${Math.round(menu.margin)}%)`,
                        description: '효자 메뉴 - 적극 홍보 추천',
                        icon: '💎',
                        color: 'yellow',
                        priority: priority++,
                        data: { menu }
                    });
                }

                // Gem 메뉴 (고마진 + 저판매) - 숨은 보석
                const gemMenus = strategyResult.data.filter((m: any) => m.type === 'gem' && m.margin >= 40);
                for (const menu of gemMenus.slice(0, 2)) {
                    triggers.push({
                        id: `gem-${menu.name}`,
                        type: 'menu',
                        label: `${menu.name} (숨은 보석)`,
                        description: '마진 좋지만 판매 부족 - 홍보 필요',
                        icon: '💜',
                        color: 'grape',
                        priority: priority++,
                        data: { menu }
                    });
                }
            }
        }

        // 2. 날씨 기반 트리거 (Mock - 실제로는 날씨 API 연동)
        const weatherTriggers = getMockWeatherTriggers();
        triggers.push(...weatherTriggers.map(w => ({ ...w, priority: priority++ })));

        // 3. 재고/유통기한 기반 트리거 (Mock)
        triggers.push({
            id: 'inventory-urgent',
            type: 'inventory',
            label: '재고소진 급함',
            description: '유통기한 임박 식자재 타임세일',
            icon: '📉',
            color: 'red',
            priority: priority++
        });

        // 4. 신메뉴 트리거
        triggers.push({
            id: 'new-menu',
            type: 'new_menu',
            label: '신메뉴 런칭',
            description: '새로운 메뉴 출시 홍보',
            icon: '🎉',
            color: 'teal',
            priority: priority++
        });

        return { success: true, data: triggers };
    } catch (error: any) {
        console.error('fetchMarketingTriggers error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// Mock Weather Triggers
// =============================================================================

function getMockWeatherTriggers(): Omit<MarketingTrigger, 'priority'>[] {
    // 실제 구현 시 날씨 API (OpenWeatherMap 등) 연동
    const hour = new Date().getHours();
    const triggers: Omit<MarketingTrigger, 'priority'>[] = [];

    // 비오는 날 시뮬레이션 (실제로는 API 체크)
    if (Math.random() > 0.5) {
        triggers.push({
            id: 'weather-rain',
            type: 'weather',
            label: '비오는 날',
            description: '배달 수요 급증 예상',
            icon: '🌧️',
            color: 'blue',
            data: { weather: 'rain', demandIncrease: 40 }
        });
    }

    // 추운 날
    if (Math.random() > 0.6) {
        triggers.push({
            id: 'weather-cold',
            type: 'weather',
            label: '한파 주의보',
            description: '따뜻한 메뉴 수요 증가',
            icon: '🥶',
            color: 'cyan',
            data: { weather: 'cold', demandIncrease: 25 }
        });
    }

    // 더운 날
    if (Math.random() > 0.7) {
        triggers.push({
            id: 'weather-hot',
            type: 'weather',
            label: '폭염 경보',
            description: '시원한 메뉴/음료 수요 급증',
            icon: '🥵',
            color: 'orange',
            data: { weather: 'hot', demandIncrease: 35 }
        });
    }

    // 기본 날씨가 없으면 추가
    if (triggers.length === 0) {
        triggers.push({
            id: 'weather-weekend',
            type: 'weather',
            label: '주말 특수',
            description: '주말 배달 수요 증가 예상',
            icon: '📅',
            color: 'indigo',
            data: { weather: 'weekend', demandIncrease: 20 }
        });
    }

    return triggers;
}

// =============================================================================
// AI Copy Generation
// =============================================================================

export async function generateMarketingCopy(
    context: MarketingContext
): Promise<{ success: boolean; data?: GeneratedCopy[]; error?: string }> {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            // API 키 없으면 규칙 기반 문구 생성
            return { success: true, data: generateRuleBasedCopy(context) };
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
                max_tokens: 1500,
                system: `당신은 소상공인을 위한 마케팅 카피라이터입니다.
음식점 홍보 문구를 작성해주세요.

규칙:
1. 한국어로 작성
2. 각 채널 특성에 맞는 톤 사용
3. 이모지 적극 활용 (배달앱용)
4. 인스타그램은 감성적, 해시태그 포함
5. 배달앱은 짧고 임팩트 있게 (사장님 한마디 스타일)
6. 당근마켓은 동네 친근감
7. 매장 POP는 캐치프레이즈 형태

응답 형식 (JSON):
{
  "copies": [
    {
      "channel": "baemin",
      "channelName": "배달의민족",
      "content": "문구 내용",
      "tone": "톤 설명"
    },
    {
      "channel": "instagram",
      "channelName": "인스타그램",
      "content": "문구 내용",
      "hashtags": ["#해시태그1", "#해시태그2"],
      "tone": "톤 설명"
    },
    {
      "channel": "danggeun",
      "channelName": "당근마켓",
      "content": "문구 내용",
      "tone": "톤 설명"
    },
    {
      "channel": "pop",
      "channelName": "매장 POP",
      "content": "짧은 캐치프레이즈",
      "tone": "톤 설명"
    }
  ]
}`,
                messages: [{
                    role: 'user',
                    content: buildCopyPrompt(context)
                }]
            })
        });

        if (!response.ok) {
            console.error('Claude API error:', response.status);
            return { success: true, data: generateRuleBasedCopy(context) };
        }

        const result = await response.json();
        const content = result.content?.[0]?.text;

        if (!content) {
            return { success: true, data: generateRuleBasedCopy(context) };
        }

        try {
            // JSON 추출
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const copies: GeneratedCopy[] = parsed.copies.map((c: any) => ({
                    channel: c.channel,
                    channelName: c.channelName,
                    channelIcon: getChannelIcon(c.channel),
                    content: c.content,
                    hashtags: c.hashtags,
                    tone: c.tone
                }));
                return { success: true, data: copies };
            }
        } catch {
            // 파싱 실패 시 규칙 기반
        }

        return { success: true, data: generateRuleBasedCopy(context) };

    } catch (error: any) {
        console.error('generateMarketingCopy error:', error);
        return { success: true, data: generateRuleBasedCopy(context) };
    }
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildCopyPrompt(context: MarketingContext): string {
    let prompt = `홍보 문구 작성 요청:\n\n`;

    if (context.menuName) {
        prompt += `- 메뉴: ${context.menuName}\n`;
        if (context.menuPrice) prompt += `- 가격: ${context.menuPrice.toLocaleString()}원\n`;
        if (context.menuMargin) prompt += `- 마진율: ${context.menuMargin.toFixed(0)}% (마진이 좋아서 프로모션 여유 있음)\n`;
    }

    prompt += `- 홍보 상황: ${context.triggerReason}\n`;

    if (context.weatherInfo) {
        prompt += `- 날씨: ${context.weatherInfo}\n`;
    }

    if (context.customPrompt) {
        prompt += `\n추가 요청: ${context.customPrompt}\n`;
    }

    prompt += `\n위 상황에 맞는 각 채널별 홍보 문구를 JSON 형식으로 작성해주세요.`;

    return prompt;
}

function getChannelIcon(channel: string): string {
    const icons: Record<string, string> = {
        baemin: '🛵',
        yogiyo: '🍽️',
        instagram: '📸',
        danggeun: '🥕',
        pop: '📢'
    };
    return icons[channel] || '📝';
}

function generateRuleBasedCopy(context: MarketingContext): GeneratedCopy[] {
    const { menuName, triggerType, triggerReason, weatherInfo } = context;
    const itemName = menuName || '오늘의 메뉴';

    // 날씨 기반 문구
    if (triggerType === 'weather') {
        if (weatherInfo?.includes('비') || triggerReason.includes('비')) {
            return [
                {
                    channel: 'baemin',
                    channelName: '배달의민족',
                    channelIcon: '🛵',
                    content: `☔️ 빗소리와 가장 잘 어울리는 소리!\n사장님이 미쳤어요 🤪\n오늘만! 마진 포기하고\n바삭한 ${itemName} 서비스 쏩니다!\n(리뷰 약속해주실 거죠? 🤙)`,
                    tone: '친근하고 유머러스한 배민 스타일'
                },
                {
                    channel: 'instagram',
                    channelName: '인스타그램',
                    channelIcon: '📸',
                    content: `창밖을 보니 비가 오네요...\n이런 날은 따뜻한 ${itemName} 한 입 어떠세요? 🍛\n\n배달 주문 시 특별 서비스 드려요 💝`,
                    hashtags: ['#비오는날', '#맛집', '#배달맛집', '#힐링푸드', '#먹스타그램'],
                    tone: '감성적인 인스타 감성'
                },
                {
                    channel: 'danggeun',
                    channelName: '당근마켓',
                    channelIcon: '🥕',
                    content: `[${itemName} 맛집] 비오는 날 배달 특가!\n\n안녕하세요, 동네 이웃님들~ 🙌\n비오는 날 집에서 따뜻하게 드세요!\n오늘 주문하시면 음료 서비스 드려요~\n\n카카오톡으로 주문해주세요 💬`,
                    tone: '동네 친근감 있는 당근 스타일'
                },
                {
                    channel: 'pop',
                    channelName: '매장 POP',
                    channelIcon: '📢',
                    content: `☔ 비오는 날 특가!\n${itemName} 주문 시 음료 서비스`,
                    tone: '짧고 임팩트 있는 캐치프레이즈'
                }
            ];
        }
    }

    // 메뉴 기반 기본 문구
    return [
        {
            channel: 'baemin',
            channelName: '배달의민족',
            channelIcon: '🛵',
            content: `🔥 사장님 추천!\n저희 ${itemName} 드셔보셨나요?\n\n직접 맛보고 자신있게 추천드려요!\n오늘 주문하시면 깜짝 서비스 🎁`,
            tone: '친근한 사장님 한마디 스타일'
        },
        {
            channel: 'instagram',
            channelName: '인스타그램',
            channelIcon: '📸',
            content: `오늘의 추천 메뉴 ✨\n\n정성 가득 담은 ${itemName}\n한 입 먹으면 행복해지는 맛이에요 🥰\n\n방문 & 배달 모두 환영합니다!`,
            hashtags: ['#맛집', '#푸드스타그램', '#먹스타그램', '#맛있는거', '#오늘뭐먹지'],
            tone: '따뜻하고 정성스러운 느낌'
        },
        {
            channel: 'danggeun',
            channelName: '당근마켓',
            channelIcon: '🥕',
            content: `[동네 맛집 추천] ${itemName} 전문점\n\n이웃님들 안녕하세요! 👋\n저희 가게 ${itemName} 정말 자신있어요!\n\n첫 방문 시 10% 할인해드립니다~\n많이 놀러오세요! 😊`,
            tone: '이웃에게 말하듯 친근한 톤'
        },
        {
            channel: 'pop',
            channelName: '매장 POP',
            channelIcon: '📢',
            content: `🏆 BEST 메뉴\n${itemName}\n지금 바로 주문하세요!`,
            tone: '시선을 끄는 짧은 문구'
        }
    ];
}
