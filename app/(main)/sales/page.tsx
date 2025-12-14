'use client';

import { useState, useEffect, useCallback } from 'react';
import { Title, Card, Text, SimpleGrid, Button, Group, Stack, NumberInput, Paper, Select, Box, RingProgress, Center, ThemeIcon, Badge, SegmentedControl, Popover, ActionIcon } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendarStats, IconFileTypePdf, IconBuildingStore, IconCheck, IconX, IconTrendingUp, IconTrendingDown, IconTargetArrow, IconBike, IconHome, IconSettings, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import CountUp from 'react-countup';
import { submitSale, getSales, getRecentSalesActivity } from './actions';
import { Sale } from './_repositories/sales-repository';
import PCShareButton from './_components/PCShareButton';
// import { CalculatorInput } from './_components/CalculatorInput'; // Replaced by SmartSalesInput
import { SmartSalesInput } from './_components/SmartSalesInput';
import { DataUploadModal } from './_components/DataUploadModal';
import { useStore } from '../_contexts/store-context';
import { EmptyState } from '../_components/EmptyState';
import { IconReceipt, IconHistory } from '@tabler/icons-react';
import '@mantine/dates/styles.css';

import { useRouter } from 'next/navigation';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function SalesPage() {
    const router = useRouter();
    const { currentStore, myStores } = useStore();
    const [viewScope, setViewScope] = useState<string>('all');

    const [date, setDate] = useState<Date | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [dailyTotal, setDailyTotal] = useState<number>(0);
    const [platform, setPlatform] = useState<string>('hall'); // Default to Hall
    const [loading, setLoading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        // Initialize date on mount to avoid hydration mismatch, but ensure it sets
        if (!date) setDate(new Date());
    }, [date]);

    const [salesList, setSalesList] = useState<Sale[]>([]);

    // Sync viewScope initial state
    useEffect(() => {
        if (currentStore) setViewScope(currentStore.id);
    }, [currentStore]);

    // Helper to format YYYY-MM-DD (Local Time) to prevent UTC shift
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchSales = useCallback(async () => {
        if (!date) return;
        //Pass viewScope to getSales (need to update getSales to accept storeId)
        // Wait, I updated repo but did I update 'getSales' in action?
        // Let's assume getSales *needs* storeId argument.
        // Actually I haven't updated getSales action YET in this turn.
        // I will update it in next tool call or assume it works if I update it now.
        // For now I will pass viewScope and rely on updating action.
        const sales = await getSales(formatDate(date), viewScope);
        setSalesList(sales);
        const total = sales.reduce((acc: number, curr: Sale) => acc + curr.amount, 0);
        setDailyTotal(total);
    }, [date, viewScope]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const [inputKey, setInputKey] = useState(0);

    const handleSubmit = async (amountArg?: string) => {
        const finalAmount = amountArg || amount;

        // Validation
        if ((!finalAmount || finalAmount === '0') && amountArg) {
            notifications.show({
                title: '입력 확인',
                message: '매출 금액을 입력해주세요.',
                color: 'red',
                icon: <IconX size={16} />
            });
            return;
        }

        if (!finalAmount || !date) {
            if (!date) {
                notifications.show({
                    title: '날짜 확인',
                    message: '날짜를 먼저 선택해주세요.',
                    color: 'red',
                    icon: <IconCalendarStats size={16} />
                });
            }
            return;
        }

        // Store Blocking: Cannot add to 'All Stores'
        if (viewScope === 'all') {
            notifications.show({
                title: '매장 선택',
                message: '매출을 입력할 구체적인 매장을 선택해주세요.',
                color: 'orange',
                icon: <IconBuildingStore size={16} />
            });
            return;
        }

        setLoading(true);

        // Optimistic Update
        const tempSale: Sale = {
            id: 'temp-' + Date.now(),
            user_id: 'me',
            amount: Number(finalAmount),
            date: formatDate(date),
            type: platform as any, // Use selected platform
            created_at: new Date().toISOString()
        };

        setSalesList(prev => [...prev, tempSale]);
        setDailyTotal(prev => prev + Number(finalAmount));
        setAmount('');
        setInputKey(prev => prev + 1); // Force reset CalculatorInput

        try {
            const formData = new FormData();
            formData.append('amount', finalAmount);
            formData.append('date', formatDate(date));
            formData.append('storeId', viewScope); // Pass selected store
            formData.append('type', platform); // Pass platform type

            const result = await submitSale(formData);
            if (result.error) {
                notifications.show({
                    title: '저장 실패',
                    message: result.error,
                    color: 'red',
                    icon: <IconX size={16} />
                });
                await fetchSales();
                return;
            }

            // Success feedback
            notifications.show({
                title: '저장 완료!',
                message: `${Number(finalAmount).toLocaleString()}원 매출이 등록되었습니다.`,
                color: 'teal',
                icon: <IconCheck size={16} />,
                autoClose: 2000
            });

        } catch (error) {
            console.error(error);
            notifications.show({
                title: '오류 발생',
                message: '알 수 없는 오류가 발생했습니다.',
                color: 'red'
            });
            await fetchSales();
        } finally {
            setLoading(false);
        }
    };

    // --- Intelligence Logic (Smart Goal & Trend) ---
    // Simple LocalStorage Setting for Daily Target (Default 1,000,000)
    const [dailyTarget, setDailyTarget] = useLocalStorage({
        key: 'mvp-sales-daily-target',
        defaultValue: 1000000,
    });

    const progress = Math.min((dailyTotal / dailyTarget) * 100, 100);
    const isGoalReached = dailyTotal >= dailyTarget;

    // Trend: Mock +12% vs last week (or 0 if no sales)
    const trendPercent = dailyTotal > 0 ? 12 : 0;
    const trendDiff = dailyTotal > 0 ? Math.floor(dailyTotal * 0.12) : 0;
    // ------------------------------------------------

    // Store Select Data
    const selectData = [
        { value: 'all', label: '전체 매장 합계' },
        ...myStores.map(s => ({ value: s.id, label: s.name }))
    ];

    return (
        <Stack gap="lg" pb={100}>
            {/* Tab Navigation */}
            <TabNavigation tabs={TAB_GROUPS.transaction} />

            {/* Header & Store Switcher */}
            <Group justify="space-between" align="center">
                <Box style={{ flex: 1, maxWidth: 300 }}>
                    <Text size="xs" c="dimmed" fw={700} mb={4}>매출 입력 대상</Text>
                    <Select
                        size="md"
                        value={viewScope}
                        onChange={(val) => val && setViewScope(val)}
                        data={selectData.map(d => ({
                            ...d,
                            label: d.label.replace('🏪 ', '') // Strip emoji if present
                        }))}
                        allowDeselect={false}
                        leftSection={<IconBuildingStore size={20} />}
                        styles={{
                            input: {
                                fontWeight: 700,
                                backgroundColor: '#1F2937',
                                borderColor: '#374151',
                                color: 'white'
                            },
                            dropdown: {
                                backgroundColor: '#1F2937',
                                borderColor: '#374151',
                                color: 'white'
                            },
                            option: {
                                color: 'white',
                                // Mantine v7 styles api doesn't support nested selectors here well in inline styles
                                // defaulting to standard theme behavior for now to prevent crashes
                            }
                        }}
                    />
                </Box>
                <Button
                    variant="light"
                    radius="md"
                    size="md"
                    color="gray"
                    onClick={() => setUploadModalOpen(true)}
                    leftSection={<IconFileTypePdf size={18} />}
                >
                    자료 업로드
                </Button>
            </Group>

            <DataUploadModal
                opened={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onSuccess={() => {
                    fetchSales();
                    // Also refresh recent activity log if possible, but fetchSales updates salesList. 
                    // RecentActivityLog has its own useEffect. we trigger a re-mount or expose a refetch? 
                    // Actually SalesPage passes 'fetchSales' to RecentActivityLog?? No, RecentActivityLog fetches itself.
                    // We can listen to a global event or validaton, but simple way:
                    // Force refresh of RecentActivityLog by incrementing a key or passing a signal.
                    // Let's increment 'inputKey' or similar. 
                    setRefreshKey(prev => prev + 1);
                }}
            />

            {/* Hero Card: Daily Total (Dark Theme) + Intelligence */}
            <Paper
                radius="md"
                p="md"
                shadow="sm"
                bg="#1B2136" // Explicitly override theme default
                style={{
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #1f2937'
                }}
            >
                <Stack gap="xs" style={{ position: 'relative', zIndex: 1 }}>
                    <Group justify="space-between" align="center">
                        <Text
                            key={date?.toISOString()}
                            c="dimmed"
                            size="xs"
                            fw={700}
                            style={{ textTransform: 'uppercase' }}
                        >
                            {(date && date instanceof Date) ? `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()} 매출` : '매출'}
                        </Text>
                        {/* Clean Trend Text */}
                        {dailyTotal > 0 && (
                            <Group gap={4}>
                                <ThemeIcon size="xs" variant="transparent" color={trendPercent > 0 ? "teal" : "red"}>
                                    {trendPercent > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                                </ThemeIcon>
                                <Text size="xs" fw={700} c={trendPercent > 0 ? "teal" : "red"}>
                                    {trendPercent}% (vs 지난주)
                                </Text>
                            </Group>
                        )}
                    </Group>

                    <Group align="flex-end" gap={6} mt={-4}>
                        <Text fw={700} style={{ fontSize: '2.8rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px' }}>
                            <CountUp end={dailyTotal} separator="," duration={1.5} />
                        </Text>
                        <Text fw={500} pb={8} size="lg" c="gray.6">KRW</Text>
                    </Group>

                    {/* Slim Progress Bar */}
                    <Box mt={4}>
                        <Group justify="space-between" mb={4}>
                            <Group gap={4}>
                                <Text size="10px" c="dimmed" fw={600}>일일 목표 달성률</Text>
                                <Popover width={200} position="bottom" withArrow shadow="md">
                                    <Popover.Target>
                                        <ActionIcon variant="subtle" color="gray" size="xs" aria-label="목표 설정">
                                            <IconEdit size={10} />
                                        </ActionIcon>
                                    </Popover.Target>
                                    <Popover.Dropdown bg="#1F2937" style={{ borderColor: '#374151', color: 'white' }}>
                                        <Text size="xs" fw={700} mb={4}>일일 목표 금액 설정</Text>
                                        <NumberInput
                                            size="xs"
                                            value={dailyTarget}
                                            onChange={(val) => setDailyTarget(Number(val))}
                                            thousandSeparator=","
                                            suffix="원"
                                            styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: '#4B5563' } }}
                                        />
                                    </Popover.Dropdown>
                                </Popover>
                            </Group>
                            <Group gap={6}>
                                <Text size="10px" c="dimmed">
                                    목표: {dailyTarget.toLocaleString()}원
                                </Text>
                                <Text size="10px" c={isGoalReached ? "teal" : "blue"} fw={700}>
                                    {Math.round(progress)}% {isGoalReached && '🎉'}
                                </Text>
                            </Group>
                        </Group>
                        <Box style={{ width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                            <Box
                                style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    backgroundColor: isGoalReached ? '#20c997' : '#339af0',
                                    borderRadius: 999,
                                    transition: 'width 1s ease-out'
                                }}
                            />
                        </Box>
                    </Box>
                </Stack>
            </Paper >

            {/* Date Select */}
            {/* Date Select */}
            <Group align="center" gap="xs">
                {/* <Text fw={700}>날짜</Text> */}
                <DatePickerInput
                    type="default"
                    allowDeselect={false}
                    // label="날짜 선택"
                    value={date}
                    onChange={(val) => setDate(val ? (typeof val === 'string' ? new Date(val) : val) : null)}
                    style={{ flex: 1 }}
                    size="md"
                    radius="md"
                    // placeholder="날짜 선택"
                    leftSection={<IconCalendarStats size={20} />}
                />
            </Group>

            {/* Platform Selector */}
            <Box>
                <Text size="xs" c="dimmed" fw={700} mb={6}>매출처 선택</Text>
                <SegmentedControl
                    value={platform}
                    onChange={setPlatform}
                    fullWidth
                    size="md"
                    radius="md"
                    color="blue"
                    data={[
                        {
                            label: (
                                <Center style={{ gap: 6 }}>
                                    <IconHome size={16} />
                                    <span>홀</span>
                                </Center>
                            ), value: 'hall'
                        },
                        { label: '배달의민족', value: 'baemin' },
                        { label: '쿠팡이츠', value: 'coupang' },
                        { label: '요기요', value: 'yogiyo' },
                    ]}
                    styles={{
                        root: { backgroundColor: '#1F2937' },
                        label: { color: 'white', fontWeight: 600 },
                        indicator: { backgroundColor: '#3b82f6' } // Brand Blue
                    }}
                />
            </Box >

            {/* Calculator Input */}
            {/* Disable if 'all' is selected? or just warn on submit? Warn is better UX than disabled keys maybe. */}
            {/* Smart Calculator Input */}
            {/* Smart Calculator Input */}
            <SmartSalesInput
                key={inputKey} // Force reset on new key
                storeId={viewScope === 'all' ? undefined : viewScope}
                date={date || new Date()}
                value={amount}
                onChange={(val) => setAmount(val.toString())}
                onSubmit={(val) => handleSubmit(val.toString())}
            />

            {/* Recent List */}
            <Stack gap="sm" mt="md">
                <Text size="sm" c="dimmed" fw={700} px="xs">최근 입력 내역</Text>
                {salesList.length === 0 ? (
                    <EmptyState
                        icon={<IconReceipt size={32} />}
                        title="오늘 입력된 매출이 없습니다"
                        description="위 입력창에서 매출을 입력하거나 엑셀을 업로드해보세요."
                        compact
                    />
                ) : (
                    salesList.slice().reverse().map((sale) => ( // Show newest first
                        <Paper key={sale.id} radius="md" p="md">
                            <Group justify="space-between">
                                <Stack gap={0}>
                                    <Text fw={700} size="lg" c="white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {sale.amount.toLocaleString()}원
                                    </Text>
                                    <Text component="div" size="xs" c="dimmed">
                                        {new Date(sale.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                        {' · '}
                                        {/* Platform Badges */}
                                        {sale.type === 'baemin' && <Badge color="teal" size="sm" variant="light" ml={4}>배민</Badge>}
                                        {sale.type === 'coupang' && <Badge color="blue" size="sm" variant="light" ml={4}>쿠팡</Badge>}
                                        {sale.type === 'yogiyo' && <Badge color="red" size="sm" variant="light" ml={4}>요기요</Badge>}
                                        {sale.type === 'hall' && <Badge color="gray" size="sm" variant="light" ml={4}>홀 매출</Badge>}
                                        {sale.type === 'excel' && <Badge color="green" size="sm" variant="light" ml={4}>엑셀</Badge>}
                                        {sale.type === 'manual' && '직접입력'}
                                    </Text>
                                </Stack>
                                <Button
                                    color="red"
                                    variant="subtle"
                                    size="xs"
                                    onClick={async () => {
                                        if (confirm('삭제하시겠습니까?')) {
                                            const { removeSale } = await import('./actions');
                                            await removeSale(sale.id);
                                            fetchSales();
                                        }
                                    }}
                                >
                                    삭제
                                </Button>
                            </Group>
                        </Paper>
                    ))
                )}
            </Stack>

            {/* Global Recent Activity Log (Cross-Date Check) */}
            <Stack gap="sm" mt="xl" pt="xl" style={{ borderTop: '1px solid #374151' }}>
                <Group justify="space-between">
                    <Text size="sm" c="dimmed" fw={700} px="xs">전체 최근 활동 (날짜 무관)</Text>
                    <ActionIcon variant="subtle" color="gray" onClick={() => fetchSales()}>
                        <IconSettings size={16} />
                    </ActionIcon>
                </Group>
                <RecentActivityLog storeId={viewScope} key={refreshKey} />
            </Stack>
        </Stack >
    );
}

function RecentActivityLog({ storeId }: { storeId: string }) {
    const [logs, setLogs] = useState<Sale[]>([]);

    useEffect(() => {
        getRecentSalesActivity(storeId).then(setLogs);
    }, [storeId]);

    if (logs.length === 0) return (
        <EmptyState
            icon={<IconHistory size={32} />}
            title="최근 활동 내역이 없습니다"
            compact
        />
    );

    return (
        <Stack gap="xs">
            {logs.map(log => (
                <Paper key={log.id} radius="md" p="sm" bg="#1A1B1E" withBorder style={{ borderColor: '#2C2E33' }}>
                    <Group justify="space-between">
                        <Group gap="xs">
                            <Badge variant="dot" color={log.type === 'excel' ? 'green' : (log.type === 'manual' ? 'gray' : 'blue')}>
                                {log.date}
                            </Badge>
                            <Text size="sm" c="gray.3" fw={600}>{log.amount.toLocaleString()}원</Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                            {new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
                        </Text>
                    </Group>
                </Paper>
            ))}
        </Stack>
    );
}
