'use client';

import { useEffect, useState, useCallback } from 'react';
import { Title, Text, Group, Stack, Badge, ActionIcon, Loader, Center, Affix, Button, Transition, Paper, Select, Avatar, ThemeIcon, Box } from '@mantine/core';
import { IconReceipt, IconCamera, IconBuildingStore, IconCreditCard } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { getExpenseList } from './actions'; // We might need to update this action to accept storeId
import { Expense } from './_repositories/expenses-repository';
import { useStore } from '../_contexts/store-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { ExpenseAnalytics } from './_components/ExpenseAnalytics';
import { ManualExpenseModal } from './_components/ManualExpenseModal';
import { EmptyState } from '../_components/EmptyState';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function ExpensesPage() {
    const router = useRouter();
    const { currentStore, myStores } = useStore();

    // View Scope: 'all' or storeId
    const [viewScope, setViewScope] = useState<string>('all');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [manualModalOpened, setManualModalOpened] = useState(false);

    // Sync viewScope initial state
    useEffect(() => {
        if (currentStore) setViewScope(currentStore.id);
    }, [currentStore]);

    // Fetch Expenses
    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getExpenseList(viewScope);
            setExpenses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [viewScope]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Calculate Total
    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    // Group by Date for better UI
    const groupedExpenses = expenses.reduce((acc, expense) => {
        const date = expense.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(expense);
        return acc;
    }, {} as Record<string, Expense[]>);

    const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Dropdown Data
    const selectData = [
        { value: 'all', label: '전체 매장 합계' },
        ...myStores.map(s => ({ value: s.id, label: s.name }))
    ];

    // Helper for badge colors
    const getCategoryColor = (category?: string) => {
        switch (category) {
            case '식자재': return 'teal';
            case '배달비': return 'orange';
            case '인건비': return 'cyan';
            case '임대료': return 'indigo';
            case '공과금': return 'blue';
            case '마케팅': return 'grape';
            case '쇼핑': return 'pink';
            case '기타': return 'gray';
            default: return 'gray';
        }
    };

    // Responsive Check
    const isMobile = useMediaQuery('(max-width: 48em)');

    if (loading && expenses.length === 0) {
        return <Center h="50vh"><Loader color="red" /></Center>;
    }

    return (
        <Stack gap="xl" pb={120}>
            {/* Tab Navigation */}
            <TabNavigation tabs={TAB_GROUPS.transaction} />

            {/* Header with Selector */}
            <Group justify="space-between" align="center">
                <Stack gap={0} style={{ flex: 1 }}>
                    <Select
                        variant="unstyled"
                        size="md"
                        styles={{
                            input: {
                                fontSize: 22,
                                fontWeight: 800,
                                color: 'white'
                            },
                            dropdown: {
                                color: 'black'
                            }
                        }}
                        value={viewScope}
                        onChange={(val) => val && setViewScope(val)}
                        data={selectData}
                        allowDeselect={false}
                        leftSection={<IconBuildingStore size={22} color="white" />}
                    />
                    <Text size="sm" c="gray.5" fw={600} mt={4} pl={4}>지출 내역 관리</Text>
                </Stack>
            </Group>

            {/* Analytics Section (Replaces Old Hero) */}
            <ExpenseAnalytics expenses={expenses} />

            {/* Empty State */}
            {expenses.length === 0 && !loading ? (
                <EmptyState
                    icon={<IconCreditCard size={36} />}
                    title="지출 내역이 없습니다"
                    description="영수증을 촬영하거나 직접 입력하여 지출을 등록해보세요."
                    actionLabel="지출 입력하기"
                    onAction={() => setManualModalOpened(true)}
                />
            ) : (
                /* Grouped List */
                <Stack gap="lg">
                    {sortedDates.map(date => (
                        <Stack key={date} gap="sm">
                            <Text size="sm" c="dimmed" fw={700} px="xs">
                                {dayjs(date).format('M월 D일 dddd')}
                            </Text>
                            {groupedExpenses[date].map(expense => (
                                <Paper key={expense.id} radius="md" p="md" onClick={() => { }} style={{ cursor: 'pointer' }}>
                                    <Group justify="space-between">
                                        <Group gap="md">
                                            <ThemeIcon size={42} radius="md" color="gray.1" c="gray.6">
                                                <IconReceipt size={24} />
                                            </ThemeIcon>
                                            <Stack gap={0}>
                                                <Text size="sm" fw={600} c="white">{expense.merchant_name}</Text>
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={getCategoryColor(expense.category)}
                                                    fw={500}
                                                >
                                                    {expense.category || '미분류'}
                                                </Badge>
                                            </Stack>
                                        </Group>
                                        <Text fw={700} c="expense.6" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            -{expense.amount.toLocaleString()}원
                                        </Text>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    ))}
                </Stack>
            )}

            {/* Floating Action Button */}
            {/* Sticky Bottom Action Button */}


            {/* Sticky Bottom Action Bar */}
            <Box
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '65px' : '24px', // Adjust for desktop (no bottom nav)
                    left: 0,
                    right: 0,
                    width: '100%',
                    maxWidth: isMobile ? '100%' : '500px', // Constrain on desktop
                    margin: '0 auto', // Center on desktop
                    padding: '16px',
                    paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : '16px',
                    background: 'linear-gradient(to top, #111C44 80%, rgba(17, 28, 68, 0))',
                    zIndex: 90,
                    borderRadius: isMobile ? 0 : '12px' // Rounded approach on desktop
                }}
            >
                <Group gap="sm" grow>
                    <Button
                        size={isMobile ? "xl" : "lg"} // Slightly smaller on desktop
                        radius="md"
                        variant="default"
                        bg="#1F2937"
                        c="white"
                        leftSection={<IconCreditCard size={20} />}
                        onClick={() => setManualModalOpened(true)}
                        styles={{ root: { border: '1px solid #374151' } }}
                    >
                        직접 입력
                    </Button>
                    <Button
                        size={isMobile ? "xl" : "lg"}
                        radius="md"
                        color="indigo"
                        leftSection={<IconCamera size={20} />}
                        onClick={() => router.push('/expenses/upload')}
                        style={{ boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                    >
                        스캔하기
                    </Button>
                </Group>
            </Box>

            <ManualExpenseModal
                opened={manualModalOpened}
                onClose={() => setManualModalOpened(false)}
                onSuccess={fetchExpenses}
            />
        </Stack>
    );
}
