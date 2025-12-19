'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Group, Paper, Stack, Indicator, Loader, ThemeIcon, Badge, Avatar, Tabs, ScrollArea, Box, Divider, Select, Center, ActionIcon, Button } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { getMonthlyData, getDailyDetails, getFixedCosts } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { IconCoin, IconMessageCircle, IconBuildingStore, IconSettings } from '@tabler/icons-react';
import { useStore } from '../_contexts/store-context';
import { AIDailyBriefing } from './_components/AIDailyBriefing';
import { TimelineSummaryCard } from './_components/TimelineSummaryCard';
import { TimelineItem } from './_components/TimelineItem';
import { FixedCostModal } from './_components/FixedCostModal';

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
    }, [currentStore?.id]);



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

    const handleMonthChange = (newMonth: Date) => {
        setMonth(newMonth);
    };

    const getDayProps = (date: Date) => ({
        selected: dayjs(date).isSame(date, 'date'),
        onClick: () => setDate(date),
    });

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

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: status?.bg || 'transparent',
                    border: status?.border || 'none',
                    borderRadius: 8,
                    position: 'relative'
                }}
            >
                <Text size="sm" c={status?.c || 'gray.4'}>{dayNum}</Text>

                {/* Fixed Cost Indicator */}
                {hasFixedCost && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#EF4444',
                            zIndex: 10
                        }}
                    />
                )}

                {/* Desktop: Show Amount */}
                <Box visibleFrom="xs" style={{ fontSize: '10px', color: status?.c }}>
                    {dayData && (dayData.sales - dayData.expense > 0 ? '+' : '')}
                    {dayData && Math.round((dayData.sales - dayData.expense) / 10000) + '만'}
                </Box>
            </div>
        );
    };

    const selectedData = date ? data[dayjs(date).format('YYYY-MM-DD')] : null;

    // Filter today's fixed costs
    const todaysFixedCosts = date ? fixedCosts.filter(fc => fc.day_of_month === dayjs(date).date()) : [];

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
            {/* Header with Selector & Monthly Summary */}
            <Stack gap="xs">
                <Group justify="space-between" align="center">
                    <Select
                        variant="unstyled"
                        size="md"
                        styles={{
                            input: { fontSize: 22, fontWeight: 800, color: 'white' },
                            dropdown: { color: 'black' }
                        }}
                        value={viewScope}
                        onChange={(val) => val && setViewScope(val)}
                        data={selectData}
                        allowDeselect={false}
                        leftSection={<IconBuildingStore size={22} color="white" />}
                    />
                    <Group gap="xs">
                        <Button
                            variant="default"
                            size="xs"
                            leftSection={<IconSettings size={14} />}
                            onClick={() => setModalOpen(true)}
                            styles={{ root: { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#374151' } }}
                        >
                            고정지출 설정
                        </Button>
                        <Text size="sm" c="dimmed" fw={600}>
                            {dayjs(month).format('YYYY년 M월')}
                        </Text>
                    </Group>
                </Group>

                <Group grow>
                    <Box
                        onClick={() => setViewMode('sales')}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: viewMode === 'sales' ? '#374151' : 'transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: viewMode === 'sales' ? '1px solid #60A5FA' : '1px solid transparent',
                            color: viewMode === 'sales' ? 'white' : 'gray'
                        }}
                    >
                        <Text size="sm" fw={700}>📊 매출 기준</Text>
                    </Box>
                    <Box
                        onClick={() => setViewMode('cashflow')}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: viewMode === 'cashflow' ? '#374151' : 'transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: viewMode === 'cashflow' ? '1px solid #34D399' : '1px solid transparent',
                            color: viewMode === 'cashflow' ? '#34D399' : 'gray'
                        }}
                    >
                        <Text size="sm" fw={700}>💸 실입금 기준</Text>
                    </Box>
                </Group>

                {/* Monthly Summary Card */}
                <Paper p="md" radius="lg" bg="#111C44" style={{ border: '1px solid #2C2E33' }}>
                    <Group grow>
                        <Stack gap={0} align="center">
                            <Text size="xs" c="gray.5">총 매출</Text>
                            <Text fw={700} c="white" size="md">{monthlyTotalSales.toLocaleString()}</Text>
                        </Stack>
                        <Divider orientation="vertical" />
                        <Stack gap={0} align="center">
                            <Text size="xs" c="gray.5">순수익</Text>
                            <Text fw={800} c={monthlyProfit >= 0 ? 'teal.4' : 'red.4'} size="lg">
                                {monthlyProfit.toLocaleString()}
                            </Text>
                        </Stack>
                        <Divider orientation="vertical" />
                        <Stack gap={0} align="center">
                            <Text size="xs" c="gray.5">마진율</Text>
                            <Text fw={700} c="blue.4" size="md">
                                {monthlyTotalSales > 0 ? Math.round((monthlyProfit / monthlyTotalSales) * 100) : 0}%
                            </Text>
                        </Stack>
                    </Group>
                </Paper>
            </Stack>

            {/* Calendar Card */}
            <Paper radius="xl" p="xs" shadow="sm" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                <Calendar
                    key={fixedCosts.map(c => c.id).join('-')} // Force re-render when costs change
                    static
                    date={date || undefined}
                    onDateChange={(val) => setDate(val ? new Date(val) : null)}
                    onNextMonth={(val) => handleMonthChange(new Date(val))}
                    onPreviousMonth={(val) => handleMonthChange(new Date(val))}
                    getDayProps={(dateVal) => getDayProps(new Date(dateVal))}
                    renderDay={(dateVal) => renderDay(new Date(dateVal))}
                    styles={{
                        calendarHeader: { color: 'white', maxWidth: '100%' },
                        day: { height: 56, borderRadius: 8, fontSize: 14, color: 'white' },
                        calendarHeaderLevel: { color: 'white', fontWeight: 700 },
                        calendarHeaderControl: { color: 'gray' }
                    }}
                    locale="ko"
                />
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
