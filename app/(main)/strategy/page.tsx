'use client';

import { Title, Text, SimpleGrid, Paper, Stack, Group, ThemeIcon, Badge, Slider, Button, Modal, NumberInput, LoadingOverlay } from '@mantine/core';
import { IconBulb, IconTrendingUp, IconAlertTriangle, IconRocket, IconChefHat, IconCurrencyWon, IconReceipt, IconFlame, IconRefresh } from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { fetchStrategyData, saveItemCost } from './strategy-actions';
import { useStore } from '../_contexts/store-context';
import { EmptyState } from '../_components/EmptyState';
import { IconChartBar } from '@tabler/icons-react';
import { MarginAlertBanner } from './_components/MarginAlertBanner';
import { IngredientReceiptModal } from './_components/IngredientReceiptModal';

export default function StrategyPage() {
    const { currentStore } = useStore();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Simulation State
    const [priceAdjustment, setPriceAdjustment] = useState(0);

    // Cost Edit Modal
    const [isEditOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [editCost, setEditCost] = useState<number | ''>(0);

    // Live Cost Engine Modal
    const [isReceiptOpen, { open: openReceipt, close: closeReceipt }] = useDisclosure(false);

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
        // Optimistic Update or Refetch
        loadData(); // Refetching for simplicity
    };

    const handleReceiptComplete = () => {
        loadData(); // 원가 업데이트 후 데이터 새로고침
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

            {/* Header */}
            <Stack gap={4}>
                <Group justify="space-between" wrap="wrap">
                    <Group>
                        <Title order={2} c="white">메뉴 전략가 (Profit Architect)</Title>
                        <Badge color="pink" variant="light" size="lg">BETA</Badge>
                    </Group>
                    <Group>
                        <Button
                            variant="light"
                            color="indigo"
                            leftSection={<IconReceipt size={16} />}
                            onClick={openReceipt}
                        >
                            🔥 라이브 원가 엔진
                        </Button>
                        <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<IconRefresh size={16} />}
                            onClick={loadData}
                        >
                            새로고침
                        </Button>
                    </Group>
                </Group>
                <Text c="dimmed">내 메뉴의 수익성을 분석하고(BCG) 최적의 가격을 시뮬레이션하세요.</Text>
            </Stack>

            {/* Live Cost Engine Banner */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)',
                    border: '1px solid rgba(79, 70, 229, 0.3)'
                }}
            >
                <Group justify="space-between" wrap="wrap">
                    <Group>
                        <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'grape' }}>
                            <IconFlame size={20} />
                        </ThemeIcon>
                        <Stack gap={0}>
                            <Text fw={700} c="white" size="sm">🔄 라이브 원가 엔진 (Live Cost Engine)</Text>
                            <Text size="xs" c="dimmed">
                                영수증을 찍으면 AI가 식자재 가격을 감지하여 메뉴 원가를 실시간 업데이트합니다.
                            </Text>
                        </Stack>
                    </Group>
                    <Button
                        variant="white"
                        color="indigo"
                        size="xs"
                        leftSection={<IconReceipt size={14} />}
                        onClick={openReceipt}
                    >
                        영수증 스캔
                    </Button>
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
                                    {/* Analysis Card */}
                                    <Paper p="md" bg="rgba(0,0,0,0.2)" radius="md">
                                        <Group align="flex-start">
                                            <IconRocket size={24} color="#FFD700" />
                                            <div>
                                                <Text size="sm" fw={700} c="white">AI 분석 리포트</Text>
                                                <Text size="sm" c="gray.4" mt={4}>
                                                    현재 마진율은 <strong>{selectedItem.margin.toFixed(1)}%</strong> 입니다.
                                                    {selectedItem.type === 'star' && ' 효자 상품이네요! 가격 유지를 추천합니다.'}
                                                    {selectedItem.type === 'cashcow' && ' 많이 팔리지만 마진이 적습니다. 가격을 소폭 인상해도 좋을까요?'}
                                                    {selectedItem.type === 'dog' && ' 판매량과 마진 모두 저조합니다. 레시피 개선이나 메뉴 제외를 고려해보세요.'}
                                                    {selectedItem.type === 'gem' && ' 숨은 보석입니다! 홍보를 강화하면 매출이 오를 수 있어요.'}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Paper>

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
            <Modal opened={isEditOpen} onClose={closeEdit} title="원가(Cost) 수정" centered>
                <Stack>
                    <Text size="sm" c="dimmed">
                        &apos;{selectedItem?.name}&apos;의 1인분 원가를 입력해주세요.<br />
                        (재료비 + 포장비 등 변동비 합계)
                    </Text>
                    <NumberInput
                        label="원가 (원)"
                        placeholder="예: 3500"
                        value={editCost}
                        onChange={(v) => setEditCost(v === '' ? '' : Number(v))}
                        thousandSeparator
                        leftSection={<IconCurrencyWon size={16} />}
                        min={0}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeEdit}>취소</Button>
                        <Button color="teal" onClick={handleSaveCost}>저장</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Live Cost Engine Modal */}
            <IngredientReceiptModal
                opened={isReceiptOpen}
                onClose={closeReceipt}
                storeId={currentStore?.id}
                onComplete={handleReceiptComplete}
            />
        </Stack>
    );
}
