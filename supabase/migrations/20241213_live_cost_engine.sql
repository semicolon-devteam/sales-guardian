-- =============================================================================
-- Live Cost Engine: 실시간 원가 관리 시스템
-- =============================================================================
-- 목적: 영수증 OCR → 식자재 가격 추출 → 메뉴 원가 자동 업데이트 → 마진 위험 알림
-- =============================================================================

-- 1. menu_items 테이블: 메뉴 마스터 데이터
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

    -- 기본 정보
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT '기타',

    -- 가격 정보
    selling_price INTEGER NOT NULL DEFAULT 0,  -- 판매가 (원)
    base_cost INTEGER NOT NULL DEFAULT 0,       -- 기본 원가 (수동 입력)
    current_cost INTEGER NOT NULL DEFAULT 0,    -- 현재 원가 (자동 계산)

    -- 마진 설정
    safety_margin_percent NUMERIC(5,2) DEFAULT 30.0,  -- 안전 마진율 (기본 30%)

    -- 상태
    is_active BOOLEAN DEFAULT true,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 고유 제약조건: 같은 유저/매장에서 동일한 메뉴명 불가
    UNIQUE(user_id, store_id, name)
);

-- 2. ingredients 테이블: 식자재 마스터 데이터
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

    -- 기본 정보
    name VARCHAR(100) NOT NULL,               -- 식자재명 (예: "양파", "돼지고기")
    category VARCHAR(50) DEFAULT '기타',      -- 분류 (채소, 육류, 양념 등)

    -- 가격 정보
    unit VARCHAR(20) DEFAULT 'kg',            -- 단위 (kg, g, 개, 박스 등)
    last_price INTEGER DEFAULT 0,             -- 최근 구매가격
    last_price_per_unit NUMERIC(10,2) DEFAULT 0,  -- 단위당 가격 (g당, 개당 등)

    -- 가격 추적
    price_updated_at TIMESTAMPTZ,             -- 가격 업데이트 시점
    previous_price INTEGER DEFAULT 0,         -- 이전 가격 (비교용)

    -- 태그 (OCR 매칭용)
    tags TEXT[] DEFAULT '{}',                 -- 예: ['#양파', '#onion', '#양파10kg']

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, store_id, name)
);

-- 3. menu_ingredients 테이블: 메뉴-식자재 연결 (다대다)
CREATE TABLE IF NOT EXISTS menu_ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

    -- 사용량
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0,  -- 사용량 (예: 0.1kg)
    unit VARCHAR(20) DEFAULT 'kg',              -- 단위

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(menu_id, ingredient_id)
);

-- 4. ingredient_price_history 테이블: 식자재 가격 이력
CREATE TABLE IF NOT EXISTS ingredient_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

    -- 가격 정보
    price INTEGER NOT NULL,
    price_per_unit NUMERIC(10,2),
    unit VARCHAR(20),
    quantity NUMERIC(10,3),

    -- 출처
    source VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'ocr', 'expense_ocr'
    expense_id UUID,                       -- 연결된 지출 ID (있는 경우)

    -- 타임스탬프
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. margin_alerts 테이블: 마진 위험 알림
CREATE TABLE IF NOT EXISTS margin_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

    -- 알림 대상
    menu_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,

    -- 알림 내용
    alert_type VARCHAR(50) NOT NULL,  -- 'margin_danger', 'price_spike', 'cost_increase'
    severity VARCHAR(20) DEFAULT 'warning',  -- 'info', 'warning', 'danger'
    message TEXT NOT NULL,

    -- 수치 정보
    old_value NUMERIC(10,2),
    new_value NUMERIC(10,2),
    change_percent NUMERIC(5,2),

    -- 상태
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 인덱스
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_menu_items_user_store ON menu_items(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_user_store ON ingredients(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_tags ON ingredients USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_menu ON menu_ingredients(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_ingredient ON menu_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_price_history_ingredient ON ingredient_price_history(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON ingredient_price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_margin_alerts_user ON margin_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_margin_alerts_unread ON margin_alerts(user_id) WHERE is_read = false;

-- =============================================================================
-- RLS (Row Level Security) 정책
-- =============================================================================

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_alerts ENABLE ROW LEVEL SECURITY;

-- menu_items RLS
CREATE POLICY "Users can view own menu_items" ON menu_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own menu_items" ON menu_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menu_items" ON menu_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menu_items" ON menu_items
    FOR DELETE USING (auth.uid() = user_id);

-- ingredients RLS
CREATE POLICY "Users can view own ingredients" ON ingredients
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ingredients" ON ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ingredients" ON ingredients
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ingredients" ON ingredients
    FOR DELETE USING (auth.uid() = user_id);

-- menu_ingredients RLS (via menu_id ownership)
CREATE POLICY "Users can manage menu_ingredients via menu" ON menu_ingredients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM menu_items WHERE id = menu_id AND user_id = auth.uid())
    );

-- ingredient_price_history RLS (via ingredient ownership)
CREATE POLICY "Users can view price history via ingredient" ON ingredient_price_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ingredients WHERE id = ingredient_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can insert price history via ingredient" ON ingredient_price_history
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM ingredients WHERE id = ingredient_id AND user_id = auth.uid())
    );

-- margin_alerts RLS
CREATE POLICY "Users can view own margin_alerts" ON margin_alerts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own margin_alerts" ON margin_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own margin_alerts" ON margin_alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- 함수: 메뉴 원가 재계산
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_menu_cost(p_menu_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total_cost NUMERIC := 0;
    v_menu_record RECORD;
BEGIN
    -- 메뉴에 연결된 모든 식자재의 비용 합산
    SELECT COALESCE(SUM(
        mi.quantity * i.last_price_per_unit
    ), 0) INTO v_total_cost
    FROM menu_ingredients mi
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.menu_id = p_menu_id;

    -- 메뉴 current_cost 업데이트
    UPDATE menu_items
    SET current_cost = ROUND(v_total_cost),
        updated_at = NOW()
    WHERE id = p_menu_id;

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 함수: 식자재 가격 업데이트 및 연관 메뉴 재계산
-- =============================================================================

CREATE OR REPLACE FUNCTION update_ingredient_price(
    p_ingredient_id UUID,
    p_new_price INTEGER,
    p_quantity NUMERIC DEFAULT 1,
    p_unit VARCHAR DEFAULT 'kg',
    p_source VARCHAR DEFAULT 'manual'
)
RETURNS TABLE(
    affected_menu_id UUID,
    menu_name VARCHAR,
    old_margin NUMERIC,
    new_margin NUMERIC,
    is_danger BOOLEAN
) AS $$
DECLARE
    v_ingredient RECORD;
    v_price_per_unit NUMERIC;
    v_menu RECORD;
BEGIN
    -- 1. 현재 식자재 정보 가져오기
    SELECT * INTO v_ingredient FROM ingredients WHERE id = p_ingredient_id;

    -- 2. 단위당 가격 계산
    v_price_per_unit := CASE
        WHEN p_quantity > 0 THEN p_new_price / p_quantity
        ELSE p_new_price
    END;

    -- 3. 가격 이력 기록
    INSERT INTO ingredient_price_history (
        ingredient_id, price, price_per_unit, unit, quantity, source
    ) VALUES (
        p_ingredient_id, p_new_price, v_price_per_unit, p_unit, p_quantity, p_source
    );

    -- 4. 식자재 가격 업데이트
    UPDATE ingredients SET
        previous_price = last_price,
        last_price = p_new_price,
        last_price_per_unit = v_price_per_unit,
        unit = p_unit,
        price_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_ingredient_id;

    -- 5. 연관된 모든 메뉴의 원가 재계산 및 마진 체크
    FOR v_menu IN
        SELECT DISTINCT m.*
        FROM menu_items m
        JOIN menu_ingredients mi ON mi.menu_id = m.id
        WHERE mi.ingredient_id = p_ingredient_id
    LOOP
        -- 원가 재계산
        PERFORM recalculate_menu_cost(v_menu.id);

        -- 결과 반환
        RETURN QUERY
        SELECT
            v_menu.id,
            v_menu.name,
            CASE WHEN v_menu.selling_price > 0
                THEN ((v_menu.selling_price - v_menu.current_cost)::NUMERIC / v_menu.selling_price * 100)
                ELSE 0
            END,
            CASE WHEN v_menu.selling_price > 0
                THEN ((v_menu.selling_price - (SELECT current_cost FROM menu_items WHERE id = v_menu.id))::NUMERIC / v_menu.selling_price * 100)
                ELSE 0
            END,
            CASE WHEN v_menu.selling_price > 0
                THEN ((v_menu.selling_price - (SELECT current_cost FROM menu_items WHERE id = v_menu.id))::NUMERIC / v_menu.selling_price * 100) < v_menu.safety_margin_percent
                ELSE false
            END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 트리거: 식자재 가격 변경 시 자동 알림 생성
-- =============================================================================

CREATE OR REPLACE FUNCTION check_margin_and_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_menu RECORD;
    v_new_margin NUMERIC;
    v_price_change_percent NUMERIC;
BEGIN
    -- 가격 변경률 계산
    IF OLD.last_price > 0 THEN
        v_price_change_percent := ((NEW.last_price - OLD.last_price)::NUMERIC / OLD.last_price * 100);
    ELSE
        v_price_change_percent := 0;
    END IF;

    -- 가격이 20% 이상 상승하면 알림
    IF v_price_change_percent >= 20 THEN
        INSERT INTO margin_alerts (
            user_id, store_id, ingredient_id, alert_type, severity, message,
            old_value, new_value, change_percent
        ) VALUES (
            NEW.user_id, NEW.store_id, NEW.id, 'price_spike', 'warning',
            NEW.name || ' 가격이 ' || ROUND(v_price_change_percent) || '% 상승했습니다! (' || OLD.last_price || '원 → ' || NEW.last_price || '원)',
            OLD.last_price, NEW.last_price, v_price_change_percent
        );
    END IF;

    -- 연관 메뉴들의 마진 체크
    FOR v_menu IN
        SELECT m.*
        FROM menu_items m
        JOIN menu_ingredients mi ON mi.menu_id = m.id
        WHERE mi.ingredient_id = NEW.id
    LOOP
        -- 새 마진율 계산
        IF v_menu.selling_price > 0 THEN
            v_new_margin := ((v_menu.selling_price - v_menu.current_cost)::NUMERIC / v_menu.selling_price * 100);

            -- 마진이 안전 마진 이하로 떨어지면 알림
            IF v_new_margin < v_menu.safety_margin_percent THEN
                INSERT INTO margin_alerts (
                    user_id, store_id, menu_id, ingredient_id, alert_type, severity, message,
                    old_value, new_value, change_percent
                ) VALUES (
                    NEW.user_id, NEW.store_id, v_menu.id, NEW.id, 'margin_danger', 'danger',
                    '사장님, ' || v_menu.name || ' 마진이 위험해요! (현재 ' || ROUND(v_new_margin, 1) || '%, 목표 ' || v_menu.safety_margin_percent || '%)',
                    v_menu.safety_margin_percent, v_new_margin, v_new_margin - v_menu.safety_margin_percent
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_check_margin ON ingredients;
CREATE TRIGGER trigger_check_margin
    AFTER UPDATE OF last_price ON ingredients
    FOR EACH ROW
    WHEN (OLD.last_price IS DISTINCT FROM NEW.last_price)
    EXECUTE FUNCTION check_margin_and_alert();

-- =============================================================================
-- 뷰: 메뉴별 원가 분석
-- =============================================================================

CREATE OR REPLACE VIEW menu_cost_analysis AS
SELECT
    m.id,
    m.user_id,
    m.store_id,
    m.name,
    m.category,
    m.selling_price,
    m.base_cost,
    m.current_cost,
    m.safety_margin_percent,
    CASE
        WHEN m.selling_price > 0
        THEN ROUND(((m.selling_price - m.current_cost)::NUMERIC / m.selling_price * 100), 2)
        ELSE 0
    END AS current_margin_percent,
    CASE
        WHEN m.selling_price > 0
        THEN ((m.selling_price - m.current_cost)::NUMERIC / m.selling_price * 100) < m.safety_margin_percent
        ELSE false
    END AS is_margin_danger,
    m.is_active,
    m.updated_at
FROM menu_items m;
