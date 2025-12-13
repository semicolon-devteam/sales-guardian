// =============================================================================
// Fuzzy Matching Utilities for Ingredient Name Matching
// =============================================================================

/**
 * Levenshtein Distance 계산 (두 문자열 간 편집 거리)
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // 빈 문자열 처리
    if (m === 0) return n;
    if (n === 0) return m;

    // DP 테이블 생성
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // 초기화
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // DP 계산
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // 삭제
                dp[i][j - 1] + 1,      // 삽입
                dp[i - 1][j - 1] + cost // 교체
            );
        }
    }

    return dp[m][n];
}

/**
 * 유사도 점수 계산 (0~100%)
 */
export function similarityScore(str1: string, str2: string): number {
    const s1 = normalizeIngredientName(str1);
    const s2 = normalizeIngredientName(str2);

    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;

    const maxLen = Math.max(s1.length, s2.length);
    const distance = levenshteinDistance(s1, s2);

    return Math.round((1 - distance / maxLen) * 100);
}

/**
 * 식자재 이름 정규화
 * - 공백, 특수문자 제거
 * - 소문자 변환
 * - 한글 조사 제거
 * - 숫자+단위 분리
 */
export function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '') // 공백 제거
        .replace(/[#@!?.,;:'"()[\]{}]/g, '') // 특수문자 제거
        .replace(/\d+\.?\d*(kg|g|ml|l|개|박스|봉|팩|묶음)/gi, '') // 숫자+단위 제거
        .replace(/(을|를|이|가|의|에|로|으로|와|과)$/g, '') // 한글 조사 제거
        .trim();
}

/**
 * 태그에서 핵심 키워드 추출
 */
export function extractKeywords(name: string): string[] {
    const normalized = normalizeIngredientName(name);

    // 일반적인 식자재 접두사/접미사 패턴
    const commonPrefixes = ['국내산', '수입', '냉동', '신선', '유기농', '무농약'];
    const commonSuffixes = ['고기', '류', '채', '과', '버섯'];

    let keywords = [normalized];

    // 접두사 제거 버전 추가
    for (const prefix of commonPrefixes) {
        if (normalized.startsWith(prefix)) {
            keywords.push(normalized.slice(prefix.length));
        }
    }

    return keywords.filter(k => k.length > 0);
}

export interface MatchResult {
    ingredient: {
        id: string;
        name: string;
        tags: string[];
    };
    score: number; // 0-100
    matchType: 'exact' | 'tag' | 'fuzzy';
}

/**
 * 식자재 목록에서 가장 유사한 항목 찾기
 */
export function findBestMatches(
    searchName: string,
    ingredients: { id: string; name: string; tags: string[] }[],
    threshold: number = 60 // 최소 매칭 점수
): MatchResult[] {
    const normalizedSearch = normalizeIngredientName(searchName);
    const searchKeywords = extractKeywords(searchName);

    const results: MatchResult[] = [];

    for (const ingredient of ingredients) {
        // 1. 정확히 일치
        if (normalizeIngredientName(ingredient.name) === normalizedSearch) {
            results.push({
                ingredient,
                score: 100,
                matchType: 'exact'
            });
            continue;
        }

        // 2. 태그 매칭
        const tagMatch = ingredient.tags.some(tag => {
            const normalizedTag = normalizeIngredientName(tag.replace('#', ''));
            return normalizedTag === normalizedSearch ||
                   searchKeywords.some(kw => normalizedTag.includes(kw) || kw.includes(normalizedTag));
        });

        if (tagMatch) {
            results.push({
                ingredient,
                score: 95,
                matchType: 'tag'
            });
            continue;
        }

        // 3. Fuzzy 매칭
        const nameScore = similarityScore(searchName, ingredient.name);
        const tagScores = ingredient.tags.map(tag =>
            similarityScore(searchName, tag.replace('#', ''))
        );
        const bestTagScore = Math.max(0, ...tagScores);
        const bestScore = Math.max(nameScore, bestTagScore);

        if (bestScore >= threshold) {
            results.push({
                ingredient,
                score: bestScore,
                matchType: 'fuzzy'
            });
        }
    }

    // 점수 순으로 정렬
    return results.sort((a, b) => b.score - a.score);
}

/**
 * 식자재 카테고리 자동 추론
 */
export function inferCategory(name: string): string {
    const normalized = name.toLowerCase();

    const categoryPatterns: { category: string; patterns: string[] }[] = [
        { category: '육류', patterns: ['고기', '돼지', '소고기', '닭', '오리', '양', '삼겹', '목살', '안심', '등심', '갈비'] },
        { category: '해산물', patterns: ['생선', '새우', '오징어', '조개', '굴', '게', '문어', '낙지', '꽃게', '전복', '멸치', '고등어', '삼치', '갈치'] },
        { category: '채소', patterns: ['양파', '마늘', '파', '배추', '무', '당근', '감자', '고구마', '호박', '오이', '토마토', '상추', '시금치', '버섯', '콩나물', '숙주', '양배추', '브로콜리', '피망', '고추'] },
        { category: '과일', patterns: ['사과', '배', '귤', '오렌지', '포도', '딸기', '수박', '참외', '멜론', '바나나', '레몬', '라임'] },
        { category: '양념/소스', patterns: ['간장', '된장', '고추장', '소금', '설탕', '식초', '참기름', '들기름', '올리브', '케첩', '마요네즈', '겨자', '후추', '고춧가루', '카레'] },
        { category: '유제품', patterns: ['우유', '치즈', '버터', '크림', '요거트', '요구르트'] },
        { category: '곡류', patterns: ['쌀', '밀가루', '빵', '면', '국수', '파스타', '라면', '보리', '현미', '찹쌀'] },
        { category: '가공식품', patterns: ['햄', '소시지', '베이컨', '어묵', '두부', '콩나물', '김치', '단무지'] },
        { category: '음료', patterns: ['물', '콜라', '사이다', '주스', '커피', '차', '맥주', '소주', '와인'] },
    ];

    for (const { category, patterns } of categoryPatterns) {
        if (patterns.some(p => normalized.includes(p))) {
            return category;
        }
    }

    return '기타';
}

/**
 * 단위 자동 추론
 */
export function inferUnit(name: string, quantity?: number): string {
    const normalized = name.toLowerCase();

    // 이름에서 단위 추출
    const unitMatch = name.match(/(\d+\.?\d*)\s*(kg|g|ml|l|개|박스|봉|팩|묶음|근|마리)/i);
    if (unitMatch) {
        return unitMatch[2].toLowerCase();
    }

    // 카테고리별 기본 단위
    if (['고기', '돼지', '소', '닭', '삼겹', '목살'].some(p => normalized.includes(p))) {
        return 'kg';
    }
    if (['양파', '마늘', '감자', '고구마', '당근', '무'].some(p => normalized.includes(p))) {
        return 'kg';
    }
    if (['계란', '달걀'].some(p => normalized.includes(p))) {
        return '개';
    }
    if (['우유', '음료', '주스', '물'].some(p => normalized.includes(p))) {
        return 'ml';
    }

    return 'kg'; // 기본값
}
