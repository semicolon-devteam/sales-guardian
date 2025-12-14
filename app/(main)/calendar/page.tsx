'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Group, Paper, Stack, Indicator, Loader, ThemeIcon, Badge, Avatar, Tabs, ScrollArea, Box, Divider, Select, Center, ActionIcon, Button } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { getMonthlyData, getDailyDetails, getFixedCosts } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { IconCoin, IconMessageCircle, IconBuildingStore, IconSettings, IconCash } from '@tabler/icons-react';
import { useStore } from '../_contexts/store-context';
import { AIDailyBriefing } from './_components/AIDailyBriefing';
import { TimelineSummaryCard } from './_components/TimelineSummaryCard';
import { TimelineItem } from './_components/TimelineItem';
import { FixedCostModal } from './_components/FixedCostModal';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function CalendarPage() {
    const { currentStore, myStores } = useStore();

    // UI State
    const [viewScope, setViewScope] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'sales' | 'cashflow'>('sales');

    const [date, setDate] = useState<Date | null>(new Date());
    const [month, setMonth] = useState<Date>(new Date());
    const [data, setData] = useState<Record<string, { sales: number; expense: number }>>({});

    // Fixed Costs State
    const [fixedCosts, setFixedCosts] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [fixedCostRefreshKey, setFixedCostRefreshKey] = useState(0);

    // Detailed Data
    const [details, setDetails] = useState<{ sales: any[], expenses: any[], posts: any[] }>({ sales: [], expenses: [], posts: [] });
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentStore) {
            setViewScope(currentStore.id);
        }
    }, [currentStore]);



    // Refresh fixed costs when scope changes or modal updates
    useEffect(() => {
        let isActive = true;

        const fetch = async () => {
            try {
                const costs = await getFixedCosts(viewScope);
                if (isActive) {
                    setFixedCosts(costs);
                }
            } catch (e: any) {
                console.error(e);
            }
        };

        fetch();

        return () => {
            isActive = false;
        };
    }, [viewScope, fixedCostRefreshKey]);

    const fetchData = async (targetMonth: Date, scope: string, mode: 'sales' | 'cashflow') => {
        setLoading(true);
        try {
            const result = await getMonthlyData(targetMonth, scope, mode);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (targetDate: Date, scope: string) => {
        setLoadingDetails(true);
        try {
            const dateStr = dayjs(targetDate).format('YYYY-MM-DD');
            const result = await getDailyDetails(dateStr, scope);
            setDetails(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchData(month, viewScope, viewMode);
    }, [month, viewScope, viewMode]);

    useEffect(() => {
        if (date) {
            fetchDetails(date, viewScope);
        }
    }, [date, viewScope]);

    const getDayProps = (dateStr: string) => {
        const day = new Date(dateStr);
        return {
            selected: date ? dayjs(day).isSame(date, 'date') : false,
            onClick: () => setDate(day),
        };
    };

    // Helper: Get Day Status Color
    const getDayStatus = (date: Date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        const dayData = data[dateStr];
        if (!dayData) return null;

        const profit = dayData.sales - dayData.expense;
        if (dayData.sales === 0 && dayData.expense === 0) return null;

        if (profit > 0) return { bg: 'rgba(20, 184, 166, 0.15)', c: 'teal.4', border: '1px solid rgba(20, 184, 166, 0.3)' }; // Profit
        if (profit < 0) return { bg: 'rgba(239, 68, 68, 0.15)', c: 'red.4', border: '1px solid rgba(239, 68, 68, 0.3)' }; // Loss
        return { bg: 'rgba(255, 255, 255, 0.05)', c: 'gray.5', border: '1px solid rgba(255, 255, 255, 0.1)' }; // Break-even
    };

    const renderDay = (dayDate: any) => {
        const dayNum = dayjs(dayDate).date();
        const dateStr = dayjs(dayDate).format('YYYY-MM-DD');
        const status = getDayStatus(dayDate);
        const dayData = data[dateStr];

        // Check if there is a fixed cost today
        const hasFixedCost = fixedCosts.some(fc => Number(fc.day_of_month) === dayNum);

        // 정산일 정보
        const settlements = getSettlementInfo(dayDate);
        const hasSettlement = settlements.length > 0;

        // 손익 계산
        const profit = dayData ? dayData.sales - dayData.expense : 0;
        const profitInMan = Math.round(profit / 10000);

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: status?.bg || 'transparent',
                    border: status?.border || 'none',
                    borderRadius: 10,
                    position: 'relative',
                    padding: '4px 2px',
                    gap: 2
                }}
            >
                {/* 날짜 숫자 */}
                <Text
                    size="sm"
                    fw={600}
                    c={status?.c || 'gray.4'}
                    style={{ lineHeight: 1 }}
                >
                    {dayNum}
                </Text>

                {/* Fixed Cost Indicator (빨간 점) */}
                {hasFixedCost && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            backgroundColor: '#EF4444',
                            zIndex: 10
                        }}
                    />
                )}

                {/* 정산일 표시 (초록 점) */}
                {hasSettlement && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 3,
                            left: 3,
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            backgroundColor: '#10B981',
                            zIndex: 10
                        }}
                    />
                )}

                {/* 금액 표시 - 데이터가 있을 때만 */}
                {dayData && (dayData.sales > 0 || dayData.expense > 0) && (
                    <Text
                        size="10px"
                        fw={700}
                        c={profit >= 0 ? 'teal.4' : 'red.4'}
                        style={{
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {profit >= 0 ? '+' : ''}{profitInMan}만
                    </Text>
                )}
            </div>
        );
    };

    const selectedData = date ? data[dayjs(date).format('YYYY-MM-DD')] : null;

    // Filter today's fixed costs
    const todaysFixedCosts = date ? fixedCosts.filter(fc => fc.day_of_month === dayjs(date).date()) : [];

    // 정산일 계산 (배달 플랫폼별)
    const getSettlementInfo = (targetDate: Date) => {
        const d = dayjs(targetDate);
        const dayOfWeek = d.day(); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
        const settlements: { platform: string; color: string; label: string }[] = [];

        // 배달의민족: 매주 목요일
        if (dayOfWeek === 4) {
            settlements.push({ platform: 'baemin', color: '#2AC1BC', label: '배민' });
        }
        // 요기요: 매주 화요일
        if (dayOfWeek === 2) {
            settlements.push({ platform: 'yogiyo', color: '#FA0050', label: '요기요' });
        }
        // 쿠팡이츠: 매일 정산 (D+2) - 주말 제외
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            settlements.push({ platform: 'coupang', color: '#EE1744', label: '쿠팡' });
        }

        return settlements;
    };

    // 선택된 날짜의 정산 정보
    const selectedSettlements = date ? getSettlementInfo(date) : [];

    // Monthly Totals Calculation
    const monthlyTotalSales = Object.values(data).reduce((acc, curr) => acc + curr.sales, 0);
    const monthlyTotalExpense = Object.values(data).reduce((acc, curr) => acc + curr.expense, 0);
    const monthlyProfit = monthlyTotalSales - monthlyTotalExpense;

    // Dropdown Data
    const selectData = [
        { value: 'all', label: '전체 매장 합계' },
        ...myStores.map(s => ({ value: s.id, label: s.name }))
    ];

    if (loading && Object.keys(data).length === 0) {
        return <Center h="50vh"><Loader color="teal" /></Center>;
    }

    return (
        <Stack gap="lg" pb={100}>
            {/* Tab Navigation */}
            <TabNavigation tabs={TAB_GROUPS.schedule} />

            {/* Header with Selector & Monthly Summary */}
            <Stack gap="sm">
                {/* 상단 헤더: 매장 선택 + 설정 */}
                <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="nowrap">
                        <Select
                            variant="unstyled"
                            size="md"
                            styles={{
                                root: { flex: 1, minWidth: 0 },
                                input: { fontSize: 18, fontWeight: 800, color: 'white', padding: '0 8px' },
                                dropdown: { color: 'black' }
                            }}
                            value={viewScope}
                            onChange={(val) => val && setViewScope(val)}
                            data={selectData}
                            allowDeselect={false}
                            leftSection={<IconBuildingStore size={20} color="white" />}
                        />
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            radius="md"
                            onClick={() => setModalOpen(true)}
                        >
                            <IconSettings size={20} />
                        </ActionIcon>
                    </Group>
                    <Text size="sm" c="dimmed" fw={600} ta="center">
                        {dayjs(month).format('YYYY년 M월')}
                    </Text>
                </Stack>

                {/* 뷰 모드 토글 */}
                <Group grow gap="xs">
                    <Box
                        onClick={() => setViewMode('sales')}
                        style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            backgroundColor: viewMode === 'sales' ? '#374151' : 'transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: viewMode === 'sales' ? '1px solid #60A5FA' : '1px solid #374151',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Text size="sm" fw={700} c={viewMode === 'sales' ? 'white' : 'gray.5'}>
                            📊 매출 기준
                        </Text>
                    </Box>
                    <Box
                        onClick={() => setViewMode('cashflow')}
                        style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            backgroundColor: viewMode === 'cashflow' ? '#374151' : 'transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: viewMode === 'cashflow' ? '1px solid #34D399' : '1px solid #374151',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Text size="sm" fw={700} c={viewMode === 'cashflow' ? 'teal.4' : 'gray.5'}>
                            💸 실입금 기준
                        </Text>
                    </Box>
                </Group>

                {/* Monthly Summary Card - 반응형 개선 */}
                <Paper p="sm" radius="lg" bg="#111C44" style={{ border: '1px solid #2C2E33' }}>
                    <Group grow gap="xs" wrap="nowrap">
                        <Stack gap={2} align="center">
                            <Text size="xs" c="gray.5">총 매출</Text>
                            <Text fw={700} c="white" size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {(monthlyTotalSales / 10000).toFixed(0)}만
                            </Text>
                        </Stack>
                        <Divider orientation="vertical" color="gray.7" />
                        <Stack gap={2} align="center">
                            <Text size="xs" c="gray.5">순수익</Text>
                            <Text fw={800} c={monthlyProfit >= 0 ? 'teal.4' : 'red.4'} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {monthlyProfit >= 0 ? '+' : ''}{(monthlyProfit / 10000).toFixed(0)}만
                            </Text>
                        </Stack>
                        <Divider orientation="vertical" color="gray.7" />
                        <Stack gap={2} align="center">
                            <Text size="xs" c="gray.5">마진율</Text>
                            <Text fw={700} c="blue.4" size="sm">
                                {monthlyTotalSales > 0 ? Math.round((monthlyProfit / monthlyTotalSales) * 100) : 0}%
                            </Text>
                        </Stack>
                    </Group>
                </Paper>
            </Stack>

            {/* Calendar Card */}
            <Paper radius="xl" p="sm" shadow="sm" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                <Calendar
                    key={fixedCosts.map(c => c.id).join('-')} // Force re-render when costs change
                    static
                    date={month}
                    onPreviousMonth={() => setMonth(dayjs(month).subtract(1, 'month').toDate())}
                    onNextMonth={() => setMonth(dayjs(month).add(1, 'month').toDate())}
                    getDayProps={getDayProps}
                    renderDay={renderDay}
                    styles={{
                        calendarHeader: {
                            color: 'white',
                            maxWidth: '100%',
                            marginBottom: 8,
                            padding: '0 4px'
                        },
                        calendarHeaderLevel: {
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 18
                        },
                        calendarHeaderControl: {
                            color: '#9CA3AF',
                            width: 32,
                            height: 32
                        },
                        monthCell: {
                            padding: 2
                        },
                        day: {
                            height: 'auto',
                            minHeight: 52,
                            borderRadius: 10,
                            fontSize: 14,
                            color: 'white',
                            padding: 0,
                            margin: 1
                        },
                        weekday: {
                            color: '#9CA3AF',
                            fontSize: 12,
                            fontWeight: 600,
                            paddingBottom: 8
                        },
                        month: {
                            width: '100%'
                        }
                    }}
                    locale="ko"
                />
                {/* 범례 */}
                <Group justify="center" gap="xs" mt="sm" pb="xs" wrap="wrap">
                    <Group gap={4}>
                        <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: '#10B981' }} />
                        <Text size="xs" c="dimmed">정산일</Text>
                    </Group>
                    <Group gap={4}>
                        <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: '#EF4444' }} />
                        <Text size="xs" c="dimmed">고정지출</Text>
                    </Group>
                    <Group gap={4}>
                        <Box w={10} h={10} style={{ borderRadius: 2, backgroundColor: 'rgba(20, 184, 166, 0.3)' }} />
                        <Text size="xs" c="dimmed">흑자</Text>
                    </Group>
                    <Group gap={4}>
                        <Box w={10} h={10} style={{ borderRadius: 2, backgroundColor: 'rgba(239, 68, 68, 0.3)' }} />
                        <Text size="xs" c="dimmed">적자</Text>
                    </Group>
                </Group>
            </Paper>

            {/* Daily Summary & Details */}
            {date && (
                <Stack gap="md" className="fade-in">
                    <Group align="center" gap="xs">
                        <Text size="lg" fw={800} c="white">
                            {dayjs(date).format('M월 D일 dddd')}
                        </Text>
                        <Badge variant="light" color={selectedData && selectedData.sales - selectedData.expense >= 0 ? 'teal' : 'red'}>
                            {selectedData ? (selectedData.sales - selectedData.expense >= 0 ? '흑자 😊' : '적자 😓') : '데이터 없음'}
                        </Badge>
                    </Group>

                    {/* AI Briefing Component */}
                    {selectedData && (
                        <AIDailyBriefing
                            date={date}
                            sales={selectedData.sales}
                            expense={selectedData.expense}
                        />
                    )}

                    {/* 정산일 안내 섹션 */}
                    {selectedSettlements.length > 0 && (
                        <Paper radius="lg" p="md" bg="rgba(16, 185, 129, 0.1)" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <Group gap="sm" mb="xs">
                                <IconCash size={18} color="#10B981" />
                                <Text fw={700} c="teal.4" size="sm">오늘 정산 예정</Text>
                            </Group>
                            <Group gap="xs">
                                {selectedSettlements.map(s => (
                                    <Badge key={s.platform} color={s.platform === 'baemin' ? 'teal' : s.platform === 'yogiyo' ? 'red' : 'orange'} variant="light">
                                        {s.label} 정산일
                                    </Badge>
                                ))}
                            </Group>
                            <Text size="xs" c="dimmed" mt="xs">
                                * 정산 시점은 플랫폼 정책에 따라 변동될 수 있습니다
                            </Text>
                        </Paper>
                    )}

                    {/* Fixed Cost Warning Section */}
                    {todaysFixedCosts.length > 0 && (
                        <Paper radius="lg" p="md" bg="rgba(239, 68, 68, 0.1)" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <Group gap="sm" mb="xs">
                                <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: '#EF4444' }} />
                                <Text fw={700} c="red.4" size="sm">오늘의 고정지출 (예상)</Text>
                            </Group>
                            <Stack gap="xs">
                                {todaysFixedCosts.map(fc => (
                                    <Group key={fc.id} justify="space-between">
                                        <Text size="sm" c="white">{fc.name}</Text>
                                        <Text size="sm" fw={700} c="red.3">{fc.amount.toLocaleString()}원</Text>
                                    </Group>
                                ))}
                            </Stack>
                        </Paper>
                    )}

                    {/* Tabs for Details vs Timeline */}
                    <Tabs defaultValue="sales" variant="pills" radius="xl" color="teal">
                        <Tabs.List grow mb="md">
                            <Tabs.Tab value="sales" c="white">매출</Tabs.Tab>
                            <Tabs.Tab value="expenses" c="white">지출</Tabs.Tab>
                            <Tabs.Tab value="timeline" disabled={viewScope === 'all'} c="white">
                                타임라인 {viewScope === 'all' && '(개별 매장 전용)'}
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="sales">
                            <Stack gap="sm">
                                <Text fw={700} size="md" c="gray.3">매출 ({details.sales.length})</Text>
                                {loadingDetails ? <Loader size="sm" mx="auto" color="teal" /> :
                                    details.sales.length > 0 ? (
                                        details.sales.map((sale: any) => (
                                            <Paper key={sale.id} shadow="sm" radius="lg" p="md" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                                                <Group justify="space-between">
                                                    <Group gap="sm">
                                                        <ThemeIcon color="teal" variant="light" radius="xl" size="md">
                                                            <IconCoin size={16} />
                                                        </ThemeIcon>
                                                        <Text size="sm" fw={600} c="white">{sale.type === 'manual' ? '직접 입력' : '엑셀 업로드'}</Text>
                                                    </Group>
                                                    <Text fw={700} c="teal.4">+{sale.amount.toLocaleString()}원</Text>
                                                </Group>
                                            </Paper>
                                        ))
                                    ) : <Text c="dimmed" size="sm" ta="center">내역 없음</Text>}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="expenses">
                            <Stack gap="sm">
                                <Text fw={700} size="md" c="gray.3">지출 ({details.expenses.length})</Text>
                                {loadingDetails ? <Loader size="sm" mx="auto" color="teal" /> :
                                    details.expenses.length > 0 ? (
                                        details.expenses.map((expense: any) => (
                                            <Paper key={expense.id} shadow="sm" radius="lg" p="md" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                                                <Group justify="space-between">
                                                    <Group gap="sm">
                                                        <Avatar radius="xl" size="md" color="red" variant="light">
                                                            {expense.merchant_name?.[0]}
                                                        </Avatar>
                                                        <Stack gap={2}>
                                                            <Text size="sm" fw={600} c="white">{expense.merchant_name}</Text>
                                                            <Text size="xs" c="gray.4">{expense.category}</Text>
                                                        </Stack>
                                                    </Group>
                                                    <Text fw={700} c="red.4">-{expense.amount.toLocaleString()}원</Text>
                                                </Group>
                                            </Paper>
                                        ))
                                    ) : <Text c="dimmed" size="sm" ta="center">내역 없음</Text>}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="timeline">
                            <Stack gap="sm">
                                <TimelineSummaryCard date={date || new Date()} posts={details.posts} />

                                <Text size="sm" c="dimmed" px="xs">그날의 특이사항이나 기록을 확인하세요.</Text>
                                {loadingDetails ? <Loader size="sm" mx="auto" color="teal" /> :
                                    details.posts.length > 0 ? (
                                        details.posts.map((post: any) => (
                                            <TimelineItem key={post.id} post={post} />
                                        ))
                                    ) : (
                                        <Paper radius="lg" p="xl" bg="rgba(255,255,255,0.05)" withBorder={false}>
                                            <Text ta="center" c="dimmed">작성된 기록이 없습니다.</Text>
                                        </Paper>
                                    )}
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            )}

            <FixedCostModal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                storeId={viewScope}
                existingCosts={fixedCosts}
                onUpdate={() => setFixedCostRefreshKey(k => k + 1)}
            />
        </Stack>
    );
}
