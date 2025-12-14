'use client';

import { Title, Text, SimpleGrid, Paper, Stack, Group, ThemeIcon, Badge, Slider, Button, Modal, NumberInput, LoadingOverlay } from '@mantine/core';
import { IconBulb, IconTrendingUp, IconAlertTriangle, IconChefHat, IconCurrencyWon, IconFlame, IconRefresh, IconSpeakerphone, IconSparkles, IconLoader, IconRobot } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { fetchStrategyData, saveItemCost, estimateMenuCost, CostEstimation } from './strategy-actions';
import { useStore } from '../_contexts/store-context';
import { EmptyState } from '../_components/EmptyState';
import { IconChartBar } from '@tabler/icons-react';
import { MarginAlertBanner } from './_components/MarginAlertBanner';
import { AiStrategyCoach } from './_components/AiStrategyCoach';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function StrategyPage() {
    const { currentStore } = useStore();
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Simulation State
    const [priceAdjustment, setPriceAdjustment] = useState(0);

    // Cost Edit Modal
    const [isEditOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [editCost, setEditCost] = useState<number | ''>(0);
    const [aiEstimating, setAiEstimating] = useState(false);
    const [aiEstimation, setAiEstimation] = useState<CostEstimation | null>(null);

    const loadData = useCallback(async () => {
        if (!currentStore) return;
        setLoading(true);
        const res = await fetchStrategyData(currentStore.id);
        if (res.success) {
            setData(res.data || []);
            // Select first item by default if available
            if (res.data && res.data.length > 0) {
                setSelectedItem((prev: any) => prev || res.data[0]);
            }
        } else {
            notifications.show({ title: '오류', message: res.error || '데이터 로드 실패', color: 'red' });
        }
        setLoading(false);
    }, [currentStore]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        // Reset simulation when item changes
        setPriceAdjustment(0);
        if (selectedItem) {
            setEditCost(selectedItem.cost);
        }
    }, [selectedItem]);

    const handleSaveCost = async () => {
        if (!selectedItem || !currentStore) return;
        const costVal = Number(editCost);

        await saveItemCost(currentStore.id, selectedItem.name, costVal, selectedItem.price);

        notifications.show({ title: '저장 완료', message: '원가 정보가 업데이트되었습니다.', color: 'teal' });
        closeEdit();
        setAiEstimation(null);
        // Optimistic Update or Refetch
        loadData(); // Refetching for simplicity
    };

    const handleAiEstimate = async () => {
        if (!selectedItem) return;
        setAiEstimating(true);
        setAiEstimation(null);

        const result = await estimateMenuCost(selectedItem.name, selectedItem.price);

        if (result.success && result.data) {
            setAiEstimation(result.data);
            setEditCost(result.data.estimatedCost);
            notifications.show({
                title: 'AI 추정 완료',
                message: `${selectedItem.name}의 예상 원가: ${result.data.estimatedCost.toLocaleString()}원`,
                color: 'indigo'
            });
        } else {
            notifications.show({
                title: '추정 실패',
                message: result.error || '다시 시도해주세요.',
                color: 'red'
            });
        }

        setAiEstimating(false);
    };


    // --- Simulation Logic ---
    const itemProfitPerUnit = selectedItem ? selectedItem.price - selectedItem.cost : 0;

    const simulatedPrice = selectedItem ? selectedItem.price + priceAdjustment : 0;
    const simulatedProfitPerItem = selectedItem ? (simulatedPrice - selectedItem.cost) : 0;

    // Assume 1.5 elasticity for fun (price up 10% -> qty down 15%)
    const priceChangePct = selectedItem && selectedItem.price > 0 ? priceAdjustment / selectedItem.price : 0;
    const qtyChangePct = -priceChangePct * 1.5;
    const simulatedQty = selectedItem ? Math.round(selectedItem.quantity * (1 + qtyChangePct)) : 0;
    const simulatedTotalProfit = simulatedQty * simulatedProfitPerItem;

    const currentTotalProfit = selectedItem ? selectedItem.totalProfit : 0;
    const profitDiff = simulatedTotalProfit - currentTotalProfit;

    const COLORS = {
        star: '#FFD700', // Gold
        cashcow: '#40C057', // Green
        gem: '#BE4BDB', // Grape
        dog: '#868E96', // Gray
        question: '#FAB005' // Yellow/Orange (No Data)
    };

    // Calculate Averages for Reference Lines
    const avgQty = data.length > 0 ? data.reduce((a, b) => a + b.quantity, 0) / data.length : 0;
    const avgProfit = data.length > 0 ? data.reduce((a, b) => a + b.totalProfit, 0) / data.length : 0;

    // 마진 위험 메뉴 카운트
    const dangerMenuCount = data.filter(d => d.margin < 30 && d.cost > 0).length;

    return (
        <Stack gap="xl" pb={100} pos="relative">
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Tab Navigation */}
            <TabNavigation tabs={TAB_GROUPS.strategy} />

            {/* Header */}
            <Stack gap={4}>
                <Group justify="space-between" wrap="wrap">
                    <Group>
                        <Title order={2} c="white">메뉴 전략가 (Profit Architect)</Title>
                        <Badge color="pink" variant="light" size="lg">BETA</Badge>
                    </Group>
                    <Button
                        variant="subtle"
                        color="gray"
                        leftSection={<IconRefresh size={16} />}
                        onClick={loadData}
                    >
                        새로고침
                    </Button>
                </Group>
                <Text c="dimmed">내 메뉴의 수익성을 분석하고(BCG) 최적의 가격을 시뮬레이션하세요.</Text>
            </Stack>

            {/* Auto Cost Update Banner */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
            >
                <Group>
                    <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
                        <IconRobot size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                        <Text fw={700} c="white" size="sm">🤖 AI 자동 원가 업데이트</Text>
                        <Text size="xs" c="dimmed">
                            지출관리에서 영수증을 등록하면 AI가 식자재를 자동으로 인식하여 원가가 업데이트됩니다.
                        </Text>
                    </Stack>
                </Group>
            </Paper>

            {/* Margin Alert Banner */}
            <MarginAlertBanner
                storeId={currentStore?.id}
                onAlertClick={(alert) => {
                    // 알림 클릭 시 해당 메뉴 선택
                    if (alert.menu_id) {
                        const menu = data.find(d => d.id === alert.menu_id);
                        if (menu) setSelectedItem(menu);
                    }
                }}
            />

            {/* Danger Menu Quick Stats */}
            {dangerMenuCount > 0 && (
                <Paper p="sm" radius="md" bg="rgba(255, 107, 107, 0.1)" style={{ border: '1px solid #fa525240' }}>
                    <Group>
                        <IconAlertTriangle size={20} color="#fa5252" />
                        <Text size="sm" c="red.3">
                            <strong>{dangerMenuCount}개</strong> 메뉴의 마진율이 30% 이하입니다. 원가 점검이 필요합니다.
                        </Text>
                    </Group>
                </Paper>
            )}

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Zone A: Menu Nebula */}
                <Paper p="lg" radius="md" bg="#1B2136" withBorder style={{ borderColor: '#2C2E33', minHeight: 500 }}>
                    <Stack h="100%">
                        <Group justify="space-between">
                            <Title order={4} c="white">메뉴 MRI</Title>
                            <ThemeIcon variant="light" color="gray" radius="xl">
                                <IconBulb size={18} />
                            </ThemeIcon>
                        </Group>
                        <Text size="xs" c="dimmed" mb="md">
                            X축: 판매량 (인기) / Y축: 총 이익 (효자)
                        </Text>

                        {data.length === 0 ? (
                            <EmptyState
                                icon={<IconChartBar size={36} />}
                                title="분석할 데이터가 없습니다"
                                description="매출 페이지에서 메뉴별 매출을 먼저 입력해주세요."
                            />
                        ) : (
                            <div style={{ flex: 1, width: '100%', minHeight: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#373A40" />
                                        <XAxis type="number" dataKey="quantity" name="판매량" stroke="#868E96" unit="개" />
                                        <YAxis type="number" dataKey="totalProfit" name="이익" stroke="#868E96" unit="원" />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    const isLowMargin = d.margin < 30 && d.cost > 0;
                                                    return (
                                                        <Paper p="xs" bg="dark" withBorder>
                                                            <Text fw={700} c="white">{d.name}</Text>
                                                            <Text size="xs" c="cyan">판매량: {d.quantity}개</Text>
                                                            <Text size="xs" c="green">총이익: {d.totalProfit.toLocaleString()}원</Text>
                                                            <Text size="xs" c={isLowMargin ? 'red' : 'gray'}>
                                                                마진율: {d.margin.toFixed(1)}%
                                                                {isLowMargin && ' ⚠️'}
                                                            </Text>
                                                            {d.cost === 0 && <Text size="xs" c="red">⚠️ 원가 미입력</Text>}
                                                        </Paper>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <ReferenceLine x={avgQty} stroke="#5c5f66" strokeDasharray="3 3" label={{ value: '평균 인기', fill: '#868E96', position: 'insideTopRight' }} />
                                        <ReferenceLine y={avgProfit} stroke="#5c5f66" strokeDasharray="3 3" label={{ value: '평균 수익', fill: '#868E96', position: 'insideTopRight' }} />

                                        <Scatter name="Menu Items" data={data} onClick={(node) => setSelectedItem(node.payload)}>
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.cost === 0 ? 'red' : COLORS[entry.type as keyof typeof COLORS]} cursor="pointer" />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <Group justify="center" gap="xs">
                            <Badge color="yellow" variant="dot">스타(인기/이익↑)</Badge>
                            <Badge color="green" variant="dot">캐시카우(인기↑/이익↓)</Badge>
                            <Badge color="grape" variant="dot">보석(인기↓/이익↑)</Badge>
                            <Badge color="gray" variant="dot">골칫덩이</Badge>
                            <Badge color="red" variant="dot">원가 미입력</Badge>
                        </Group>
                    </Stack>
                </Paper>

                {/* Zone B: Analysis & Simulator */}
                {selectedItem ? (
                    <Paper p="lg" radius="md" bg="#1B2136" withBorder style={{ borderColor: '#2C2E33' }}>
                        <Stack gap="lg">
                            <Group justify="space-between">
                                <Group>
                                    <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                                        <IconChefHat size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Title order={4} c="white">{selectedItem.name}</Title>
                                        <Text size="xs" c="dimmed">
                                            {selectedItem.price.toLocaleString()}원 | 원가: {selectedItem.cost.toLocaleString()}원
                                        </Text>
                                    </div>
                                </Group>
                                <Button variant="outline" color="gray" size="xs" onClick={() => { setEditCost(selectedItem.cost); openEdit(); }}>
                                    원가 수정
                                </Button>
                            </Group>

                            {/* 마진 위험 경고 */}
                            {selectedItem.cost > 0 && selectedItem.margin < 30 && (
                                <Paper p="md" bg="rgba(255, 107, 107, 0.1)" radius="md" style={{ border: '1px solid #fa5252' }}>
                                    <Group>
                                        <IconFlame color="#fa5252" />
                                        <Text c="red.3" size="sm">
                                            <strong>사장님, {selectedItem.name} 마진이 위험해요!</strong><br />
                                            현재 마진율 {selectedItem.margin.toFixed(1)}%로 목표(30%)보다 낮습니다.
                                        </Text>
                                    </Group>
                                </Paper>
                            )}

                            {selectedItem.cost === 0 ? (
                                <Paper p="md" bg="rgba(255, 107, 107, 0.1)" radius="md" style={{ border: '1px solid #fa5252' }}>
                                    <Group>
                                        <IconAlertTriangle color="#fa5252" />
                                        <Text c="red.3" size="sm">
                                            정확한 분석을 위해 <strong>원가</strong>를 입력해주세요.<br />
                                            현재 이익이 0원으로 계산되고 있습니다.
                                        </Text>
                                    </Group>
                                </Paper>
                            ) : (
                                <>
                                    {/* AI Strategy Coach */}
                                    <AiStrategyCoach
                                        menu={{
                                            id: selectedItem.id,
                                            name: selectedItem.name,
                                            price: selectedItem.price,
                                            cost: selectedItem.cost,
                                            margin: selectedItem.margin,
                                            quantity: selectedItem.quantity,
                                            totalProfit: selectedItem.totalProfit,
                                            type: selectedItem.type
                                        }}
                                        storeId={currentStore?.id}
                                    />

                                    {/* Simulator Controls */}
                                    <Stack gap="xs">
                                        <Text size="sm" fw={700} c="dimmed">가격 조정 시뮬레이션</Text>
                                        <Group justify="space-between">
                                            <Text size="xs">현재: {selectedItem.price.toLocaleString()}원</Text>
                                            <Text size="md" fw={700} c="cyan">{simulatedPrice.toLocaleString()}원 ({priceAdjustment > 0 ? '+' : ''}{priceAdjustment})</Text>
                                        </Group>
                                        <Slider
                                            min={-2000}
                                            max={3000}
                                            step={100}
                                            value={priceAdjustment}
                                            onChange={setPriceAdjustment}
                                            marks={[
                                                { value: 0, label: '0' },
                                                { value: 1000, label: '+1000' }
                                            ]}
                                            color="cyan"
                                        />
                                    </Stack>

                                    {/* Result */}
                                    <Paper p="md" radius="md" withBorder style={{ borderColor: profitDiff >= 0 ? '#20c997' : '#fa5252', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                        <Stack gap="xs" align="center">
                                            <Text size="xs" c="dimmed">예상 총수익 변화</Text>
                                            <Group align="center" gap={4}>
                                                {profitDiff >= 0 ? <IconTrendingUp size={24} color="#20c997" /> : <IconAlertTriangle size={24} color="#fa5252" />}
                                                <Text size="xl" fw={800} c={profitDiff >= 0 ? 'teal' : 'red'}>
                                                    {profitDiff > 0 ? '+' : ''}{Math.round(profitDiff).toLocaleString()} 원
                                                </Text>
                                            </Group>
                                            <Text size="xs" ta="center" c="dimmed">
                                                판매량이 약 {Math.abs(Math.round(qtyChangePct * 100))}% {qtyChangePct < 0 ? '감소' : '증가'}한다고 가정
                                            </Text>
                                        </Stack>
                                    </Paper>

                                    {/* Marketing Button */}
                                    <Button
                                        variant="gradient"
                                        gradient={{ from: 'grape', to: 'indigo' }}
                                        size="md"
                                        radius="md"
                                        leftSection={<IconSpeakerphone size={18} />}
                                        onClick={() => {
                                            const params = new URLSearchParams({
                                                menu: selectedItem.name,
                                                price: selectedItem.price.toString(),
                                                margin: selectedItem.margin.toFixed(0)
                                            });
                                            router.push(`/marketing?${params.toString()}`);
                                        }}
                                        fullWidth
                                    >
                                        이 메뉴 홍보하기
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Paper>
                ) : (
                    <Paper p="lg" radius="md" bg="#1B2136" withBorder style={{ borderColor: '#2C2E33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text c="dimmed">왼쪽 차트에서 메뉴를 선택해주세요.</Text>
                    </Paper>
                )}
            </SimpleGrid>

            {/* Cost Edit Modal */}
            <Modal
                opened={isEditOpen}
                onClose={() => { closeEdit(); setAiEstimation(null); }}
                title="원가(Cost) 수정"
                centered
                size="md"
                styles={{
                    header: { backgroundColor: '#1F2937', borderBottom: '1px solid #374151' },
                    title: { color: 'white', fontWeight: 600 },
                    content: { backgroundColor: '#1F2937' },
                    body: { backgroundColor: '#1F2937' },
                    close: { color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }
                }}
            >
                <Stack>
                    <Text size="sm" c="dimmed">
                        &apos;{selectedItem?.name}&apos;의 1인분 원가를 입력해주세요.<br />
                        (재료비 + 포장비 등 변동비 합계)
                    </Text>

                    {/* AI 추정 버튼 */}
                    <Button
                        variant="light"
                        color="indigo"
                        leftSection={aiEstimating ? <IconLoader size={16} className="animate-spin" /> : <IconSparkles size={16} />}
                        onClick={handleAiEstimate}
                        loading={aiEstimating}
                        fullWidth
                    >
                        {aiEstimating ? 'AI가 분석 중...' : '🤖 AI가 원가 추정해줘'}
                    </Button>

                    {/* AI 추정 결과 */}
                    {aiEstimation && (
                        <Paper p="sm" radius="md" bg="rgba(79, 70, 229, 0.1)" style={{ border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" fw={600} c="indigo.3">AI 추정 결과</Text>
                                    <Badge
                                        size="xs"
                                        color={aiEstimation.confidence === 'high' ? 'green' : aiEstimation.confidence === 'medium' ? 'yellow' : 'orange'}
                                    >
                                        신뢰도: {aiEstimation.confidence === 'high' ? '높음' : aiEstimation.confidence === 'medium' ? '중간' : '낮음'}
                                    </Badge>
                                </Group>

                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">예상 원가</Text>
                                    <Text size="md" fw={700} c="white">{aiEstimation.estimatedCost.toLocaleString()}원</Text>
                                </Group>

                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">업종 평균 마진율</Text>
                                    <Text size="sm" c="teal">{aiEstimation.industryAvgMargin}%</Text>
                                </Group>

                                {/* 재료 breakdown */}
                                {aiEstimation.ingredients.length > 0 && (
                                    <Stack gap={4}>
                                        <Text size="xs" c="dimmed" mt="xs">예상 재료 구성:</Text>
                                        {aiEstimation.ingredients.map((ing, idx) => (
                                            <Group key={idx} justify="space-between" px="xs">
                                                <Text size="xs" c="gray.4">{ing.name} ({ing.amount})</Text>
                                                <Text size="xs" c="gray.5">{ing.estimatedPrice.toLocaleString()}원</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                )}

                                <Text size="xs" c="dimmed" mt="xs" style={{ lineHeight: 1.4 }}>
                                    💡 {aiEstimation.reasoning}
                                </Text>
                            </Stack>
                        </Paper>
                    )}

                    <NumberInput
                        label="원가 (원)"
                        placeholder="예: 3500"
                        value={editCost}
                        onChange={(v) => setEditCost(v === '' ? '' : Number(v))}
                        thousandSeparator
                        leftSection={<IconCurrencyWon size={16} />}
                        min={0}
                        styles={{
                            label: { color: '#D1D5DB' },
                            input: { backgroundColor: '#111827', borderColor: '#374151', color: 'white' }
                        }}
                    />

                    {aiEstimation && (
                        <Text size="xs" c="dimmed">
                            ※ AI 추정값은 참고용입니다. 실제 원가와 다를 수 있으니 확인 후 저장하세요.
                        </Text>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => { closeEdit(); setAiEstimation(null); }} styles={{ root: { borderColor: '#374151', color: '#D1D5DB' } }}>취소</Button>
                        <Button color="teal" onClick={handleSaveCost}>저장</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
