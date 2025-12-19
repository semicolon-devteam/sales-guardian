'use client';

import { Paper, Text, Group, Box } from '@mantine/core';
import { IconArrowUpRight } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesTrendGraphProps {
    data: {
        date: string;
        amount: number;
    }[];
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                minWidth: '150px'
            }}>
                <Text size="xs" c="gray.4" mb={4}>{label}</Text>
                <Text size="lg" fw={800} c="white">
                    {new Intl.NumberFormat('ko-KR').format(payload[0].value)}원
                </Text>
                <Text size="xs" c="indigo.3" fw={600}>
                    지난주 대비 +{Math.floor(Math.random() * 20)}%
                </Text>
            </div>
        );
    }
    return null;
};

export function SalesTrendGraph({ data }: SalesTrendGraphProps) {
    // Mock Comparison Data Generation (Ghost Line)
    const chartData = data.map(d => ({
        ...d,
        prevAmount: d.amount * (0.8 + Math.random() * 0.4) // Random variation for demo
    }));

    // Calculate Summary Metrics
    const totalAmount = data.reduce((acc, curr) => acc + curr.amount, 0);
    const averageAmount = Math.round(totalAmount / data.length);

    return (
        <Paper radius="xl" p="xl" withBorder style={{
            backgroundColor: '#1F2937',
            borderColor: '#374151',
            overflow: 'hidden',
            height: '100%'
        }}>
            {/* Header: Professional Data Summary instead of redundant title */}
            <Group justify="space-between" align="flex-end" mb="lg">
                <Box>
                    <Text size="xs" c="dimmed" mb={4} fw={600}>이번 주 총 매출</Text>
                    <Group align="flex-end" gap="sm">
                        <Text size="2rem" fw={800} c="white" style={{ lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                            {new Intl.NumberFormat('ko-KR').format(totalAmount)}원
                        </Text>
                        <Group gap={4} mb={4}>
                            <IconArrowUpRight size={16} color="#4ade80" />
                            <Text size="sm" c="green.4" fw={700}>+12.5%</Text>
                        </Group>
                    </Group>
                </Box>
                <Box style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed" mb={4} fw={600}>일 평균</Text>
                    <Text size="lg" fw={700} c="gray.3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Intl.NumberFormat('ko-KR').format(averageAmount)}원
                    </Text>
                </Box>
            </Group>

            <Box h={250} w="100%" style={{ marginLeft: -20, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height={250} minHeight={250}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dy={10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }} />

                        {/* Comparison Line (Ghost) */}
                        <Area
                            type="monotone"
                            dataKey="prevAmount"
                            stroke="#4b5563"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="url(#colorPrev)"
                            animationDuration={1500}
                        />

                        {/* Main Line */}
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#6366f1"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorAmount)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
