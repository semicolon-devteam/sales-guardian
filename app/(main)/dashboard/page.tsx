'use client';

import { useState, useEffect, useCallback } from 'react';
import { Title, Text, SimpleGrid, Group, Stack, Paper, ThemeIcon, Skeleton, ActionIcon, Box, Button, Grid, RingProgress } from '@mantine/core';
import { IconRefresh, IconTrendingUp, IconReceipt, IconAlertCircle, IconArrowRight, IconChartPie, IconCalendarStats } from '@tabler/icons-react';
import { getDashboardData } from './actions';
import { useRouter } from 'next/navigation';
import { SalesTrendGraph } from '../../components/SalesTrendGraph';
import { SmartBadge } from './_components/SmartBadge';
import { StoreHealthGauge } from './_components/StoreHealthGauge';
import { AiCommandConsole } from './_components/AiCommandConsole';
import { MenuStrategyWidget } from './_components/MenuStrategyWidget';
import { WeatherWidget } from './_components/WeatherWidget';
import { ReviewWidget } from './_components/ReviewWidget';
import { ProfitWaterfallCard } from './_components/ProfitWaterfallCard';
import { EfficiencyGauge } from './_components/EfficiencyGauge';
import { FinancialBriefing } from './_components/FinancialBriefing';
import { getFinancialSnapshot } from './financial-actions';

import { useStore } from '../_contexts/store-context'; // Import useStore

export default function DashboardPage() {
    const router = useRouter();
    const { currentStore } = useStore(); // Get current context
    const [data, setData] = useState<any>(null);
    const [financialData, setFinancialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!currentStore) return; // Wait for store context

        console.log('[Dashboard] Fetching data for:', currentStore.name);
        setLoading(true);
        try {
            const result = await getDashboardData(currentStore.id);
            console.log('[Dashboard] Data received:', result);
            setData(result);

            const financialResult = await getFinancialSnapshot(currentStore.id);
            setFinancialData(financialResult);
        } catch (error) {
            console.error('[Dashboard] Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [currentStore]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Refetch when store changes

    // Mock Health Logic (For MVP)
    const storeHealthScore = 87; // Mock Score

    if (loading) {
        return (
            <Stack gap="lg">
                <Skeleton height={300} radius="xl" />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Skeleton height={140} radius="xl" />
                    <Skeleton height={140} radius="xl" />
                </SimpleGrid>
                <Skeleton height={300} radius="xl" />
            </Stack>
        );
    }

    if (!data) return <Text c="red" ta="center" py="xl">데이터 로드 실패 (Data is null)</Text>;

    return (
        <Stack gap="xl" pb="xl">
            {/* 1. THE COCKPIT (Health + AI Console) */}
            <Grid gutter="md" align="stretch">
                {/* Left: Health Gauge */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper
                        radius="lg"
                        p="xl"
                        h={500} // Fixed Height
                        style={{
                            background: '#1F2937',
                            border: '1px solid #374151',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Stack align="center" gap="sm">
                            <StoreHealthGauge score={storeHealthScore} />
                            <Text size="xs" c="dimmed" ta="center" px="md">
                                * 매출, 리뷰, 지출 효율성을 종합한 점수입니다.
                            </Text>
                        </Stack>
                    </Paper>
                </Grid.Col>

                {/* Right: AI Console */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Box h={500}> {/* Wrapper to enforce height */}
                        <Box h={500}> {/* Wrapper to enforce height */}
                            <AiCommandConsole
                                initialAlerts={data.alerts}
                                contextData={{
                                    date: data.date,
                                    sales: data.sales,
                                    netIncome: data.netIncome,
                                    weeklyTrend: data.weeklyTrend,
                                    breakdown: data.breakdown
                                }}
                            />
                        </Box>
                    </Box>
                </Grid.Col>
            </Grid>

            {/* 1.5 FINANCIAL INTELLIGENCE (NEW) */}
            {financialData && (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <ProfitWaterfallCard data={financialData} />
                    <Stack gap="md">
                        <EfficiencyGauge data={financialData} />
                        <FinancialBriefing data={financialData} />
                    </Stack>
                </SimpleGrid>
            )}

            {/* 2. STATS GRID (Improved with Smart Badges) */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* Sales Card */}
                <Paper radius="lg" p="lg" withBorder style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
                    <Stack gap="md">
                        <Group justify="space-between" align="start">
                            <Group gap="xs">
                                <ThemeIcon variant="light" color="blue" size="md" radius="md">
                                    <IconTrendingUp size={18} />
                                </ThemeIcon>
                                <Text size="sm" c="dimmed" fw={600} tt="uppercase">오늘 매출</Text>
                            </Group>
                            <SmartBadge value={15} label="지난주 대비" />
                        </Group>

                        <Stack gap={2}>
                            <Text fw={800} size="xl" c="white" style={{ fontSize: '28px', fontVariantNumeric: 'tabular-nums' }}>
                                {data.sales.toLocaleString()}원
                            </Text>
                            {/* Sales Breakdown */}
                            <Stack gap={4} mt={8}>
                                {data.breakdown && Object.entries(data.breakdown).map(([key, value]) => {
                                    const percent = Math.round((Number(value) / data.sales) * 100);
                                    let label = key;
                                    let color = 'gray';
                                    if (key === 'hall') { label = '홀'; color = 'teal'; }
                                    if (key === 'baemin') { label = '배민'; color = 'cyan'; }
                                    if (key === 'coupang') { label = '쿠팡'; color = 'blue'; }
                                    if (key === 'yogiyo') { label = '요기요'; color = 'red'; }
                                    if (key === 'manual') { label = '수기'; color = 'gray'; }
                                    if (key === 'excel') { label = '엑셀'; color = 'green'; }

                                    return (
                                        <Group key={key} justify="space-between" gap={4}>
                                            <Group gap={4}>
                                                <ThemeIcon size={6} color={color} radius="xl"><Box /></ThemeIcon>
                                                <Text size="10px" c="dimmed">{label}</Text>
                                            </Group>
                                            <Text size="10px" c="white" fw={600}>
                                                {Number(value).toLocaleString()} <Text span c="dimmed" size="10px">({percent}%)</Text>
                                            </Text>
                                        </Group>
                                    );
                                })}
                            </Stack>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Expenses Card */}
                <Paper radius="lg" p="lg" withBorder style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
                    <Stack gap="md">
                        <Group justify="space-between" align="start">
                            <Group gap="xs">
                                <ThemeIcon variant="light" color="red" size="md" radius="md">
                                    <IconReceipt size={18} />
                                </ThemeIcon>
                                <Text size="sm" c="dimmed" fw={600} tt="uppercase">오늘 지출</Text>
                            </Group>
                            <SmartBadge value={-5} label="평균 대비" inverse />
                        </Group>

                        <Stack gap={0}>
                            <Text fw={800} size="xl" c="white" style={{ fontSize: '28px', fontVariantNumeric: 'tabular-nums' }}>
                                {data.variableCost.toLocaleString()}원
                            </Text>
                            <Text size="xs" c="dimmed">재료비 및 기타비용</Text>
                        </Stack>
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* 3. ALERTS & ACTIONS (Replaced by Console mostly, but kept for critical errors) */}
            {data.alerts && data.alerts.length > 0 && (
                <Paper p="md" radius="md" withBorder bg="rgba(239, 68, 68, 0.1)" style={{ borderColor: '#ef4444' }}>
                    <Group gap="sm" mb="xs">
                        <IconAlertCircle size={16} color="#ef4444" />
                        <Text size="sm" c="red.4" fw={700}>확인 필요</Text>
                    </Group>
                    <Stack gap="xs">
                        {data.alerts.map((alert: any, i: number) => (
                            <Group key={i} justify="space-between">
                                <Text size="sm" c="red.2">• {alert.message}</Text>
                                <Button size="compact-xs" variant="subtle" color="red">확인하기</Button>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            )}

            {/* 4. TREND GRAPH & STRATEGY PREVIEW (Placeholder for Phase 2.3) */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <MenuStrategyWidget />
                <Paper
                    radius="lg"
                    p="xl"
                    bg="#1F2937"
                    style={{ border: '1px solid #374151', cursor: 'pointer' }}
                    onClick={() => router.push('/calendar')}
                >
                    <Stack align="center" gap="sm">
                        <ThemeIcon size="xl" radius="md" color="teal" variant="light">
                            <IconCalendarStats size={32} />
                        </ThemeIcon>
                        <Text fw={700} c="white">자금 흐름 캘린더</Text>
                        <Text size="xs" c="dimmed" ta="center">
                            정산 예정일과 고정지출을<br />한눈에 확인하세요.
                        </Text>
                    </Stack>
                </Paper>
                <WeatherWidget />
            </SimpleGrid>

            <Stack gap="sm">
                <Group justify="space-between">
                    <Text size="lg" fw={700} c="gray.3">주간 순수익 추이 (매출 - 지출)</Text>
                    <ActionIcon variant="subtle" color="gray" onClick={fetchData}>
                        <IconRefresh size={16} />
                    </ActionIcon>
                </Group>
                <Paper radius="xl" p="lg" shadow="sm" withBorder={false} bg="#1F2937">
                    <SalesTrendGraph data={data.weeklyTrend} />
                </Paper>
            </Stack>
        </Stack>
    );
}
