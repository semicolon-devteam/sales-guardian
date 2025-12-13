'use server';

import dayjs from 'dayjs';

// MVP: Rule-based "AI" Analysis
export async function generateDailyBriefing(date: string, sales: number, expense: number, storeId?: string) {
    // 1. Calculate Profit & Margin
    const profit = sales - expense;
    const margin = sales > 0 ? (profit / sales) * 100 : 0;

    // 2. Fetch last 4 weeks average for this weekday to compare
    // (Simulated for MVP - just using a random variance for demo if real data scarce)
    // In real app, we would query `getSalesRange` for past 4 weeks.

    const analysisPoints = [];

    // Profit Analysis
    if (profit > 0) {
        if (margin > 30) {
            analysisPoints.push("순수익률이 30%를 넘는 알차게 장사한 날입니다! 👏");
        } else {
            analysisPoints.push("흑자는 냈지만, 지출 비중이 다소 높습니다. 식자재나 기타 비용을 점검해보세요.");
        }
    } else if (profit < 0) {
        analysisPoints.push("아쉽게도 적자입니다. 😭 지출이 매출을 초과했습니다.");
    } else {
        if (sales === 0) {
            analysisPoints.push("매출 기록이 없는 날입니다. 휴무일이었나요?");
        } else {
            analysisPoints.push("수익과 지출이 동일합니다. (손익분기점)");
        }
    }

    // Expense Warning
    if (expense > sales * 0.8 && sales > 0) {
        analysisPoints.push("⚠️ 주의: 매출 대비 지출이 80%를 넘었습니다.");
    }

    // Encouragement
    const randomEncouragements = [
        "사장님, 오늘도 정말 고생 많으셨습니다!",
        "내일은 더 대박날 거예요!",
        "꾸준함이 정답입니다. 화이팅!",
        "건강 챙기시는 것도 잊지 마세요!"
    ];
    analysisPoints.push(randomEncouragements[Math.floor(Math.random() * randomEncouragements.length)]);

    return analysisPoints.join("\n\n");
}

// MVP: Simple Moving Average Prediction
export async function predictSales(date: string, storeId?: string) {
    const targetDate = dayjs(date);
    // Logic: Look back 3 weeks at the same weekday
    const weekday = targetDate.day(); // 0(Sun) - 6(Sat)

    // In a real app, we'd fetch data. 
    // For MVP demo, returns a "Ghost" number based on random logic or basic simulation
    // to show UI capability.

    // Simulate prediction: Random between 500,000 and 1,500,000 for demo effect
    // unless we have real history. 
    const isWeekend = weekday === 0 || weekday === 6;
    const base = isWeekend ? 1200000 : 800000;
    const variety = Math.floor(Math.random() * 400000) - 200000;

    return base + variety;
}
