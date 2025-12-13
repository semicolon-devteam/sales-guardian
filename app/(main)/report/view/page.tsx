'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { getMonthlyReport, MonthlyReportData } from '../actions';
import { Title, Text, Table, Button, Group, Stack, Card, Center, Loader, Divider, ActionIcon } from '@mantine/core';
import { IconPrinter, IconArrowLeft } from '@tabler/icons-react';

function ReportViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    const [data, setData] = useState<MonthlyReportData | null>(null);

    useEffect(() => {
        if (year && month) {
            getMonthlyReport(year, month).then(setData);
        }
    }, [year, month]);

    if (!data) return <Center h="100vh"><Loader color="teal" /></Center>;

    return (
        <div style={{ paddingBottom: 100 }}>
            {/* Toolbar (Hidden when printing) */}
            <div className="print-hidden">
                <Group justify="space-between" mb="lg">
                    <ActionIcon variant="subtle" onClick={() => router.back()}>
                        <IconArrowLeft />
                    </ActionIcon>
                    <Button leftSection={<IconPrinter size={16} />} color="dark" onClick={() => window.print()}>
                        PDF 저장 / 인쇄
                    </Button>
                </Group>
            </div>

            {/* A4 Paper Style Container */}
            <div
                style={{
                    backgroundColor: 'white',
                    maxWidth: '210mm',
                    minHeight: '297mm',
                    margin: '0 auto',
                    padding: '10mm', // Inner padding
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    boxSizing: 'border-box'
                }}
                className="a4-container"
            >
                {/* Header */}
                <Stack align="center" mb={40}>
                    <Title order={1}>{data.year}년 {data.month}월 결산 리포트</Title>
                    <Text size="lg" c="dimmed">Sales Keeper Monthly Report</Text>
                </Stack>

                {/* Summary Box */}
                <Card withBorder radius="md" padding="xl" mb={40} bg="gray.0">
                    <Group grow>
                        <Stack gap={0} align="center">
                            <Text size="sm" c="dimmed">총 매출</Text>
                            <Text fw={700} size="xl" c="blue">{data.totalSales.toLocaleString()}원</Text>
                        </Stack>
                        <Stack gap={0} align="center">
                            <Text size="sm" c="dimmed">총 지출 (고정+변동)</Text>
                            <Text fw={700} size="xl" c="red">{(data.totalExpenses + data.totalFixedCost).toLocaleString()}원</Text>
                        </Stack>
                        <Stack gap={0} align="center">
                            <Text size="sm" c="dimmed">순수익</Text>
                            <Text fw={700} size="xl" c="teal">{data.netIncome.toLocaleString()}원</Text>
                        </Stack>
                    </Group>
                </Card>

                {/* Section 1: Expense Breakdown */}
                <Title order={3} mb="md">1. 지출 상세 내역</Title>
                <Table withTableBorder withColumnBorders mb={40}>
                    <Table.Thead>
                        <Table.Tr bg="gray.1">
                            <Table.Th>구분</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>금액</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        <Table.Tr>
                            <Table.Td fw={700}>고정비 합계 (월세 등)</Table.Td>
                            <Table.Td style={{ textAlign: 'right' }} fw={700}>{data.totalFixedCost.toLocaleString()}원</Table.Td>
                        </Table.Tr>
                        {Object.entries(data.expenseByCategory).map(([cat, amount]) => (
                            <Table.Tr key={cat}>
                                <Table.Td>{cat}</Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>{amount.toLocaleString()}원</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>

                {/* Section 2: Daily Sales Brief */}
                <Title order={3} mb="md">2. 일별 매출 요약 (Top 10)</Title>
                <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr bg="gray.1">
                            <Table.Th>날짜</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>매출액</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {data.dailysales
                            .sort((a, b) => b.amount - a.amount) // Sort by highest sales
                            .slice(0, 10)
                            .map((day) => (
                                <Table.Tr key={day.date}>
                                    <Table.Td>{day.date}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{day.amount.toLocaleString()}원</Table.Td>
                                </Table.Tr>
                            ))}
                    </Table.Tbody>
                </Table>

                <Divider my={40} />
                <Center>
                    <Text size="xs" c="dimmed">본 리포트는 Sales Keeper 앱에서 자동 생성되었습니다.</Text>
                </Center>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                    .a4-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        max-width: none !important;
                    }
                    /* Hide Default Layout Elements */
                    header, footer, nav { display: none !important; }
                    /* Bruteforce hiding Mantine layout containers if needed */
                    .mantine-AppShell-navbar, .mantine-AppShell-header { display: none !important; }
                }
            `}</style>
        </div>
    );
}

export default function ReportViewPage() {
    return (
        <Suspense fallback={<Center h="100vh"><Loader color="teal" /></Center>}>
            <ReportViewContent />
        </Suspense>
    );
}
