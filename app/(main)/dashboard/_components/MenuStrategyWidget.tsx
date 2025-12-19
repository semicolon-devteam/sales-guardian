'use client';

import { Paper, Text, Stack, Group, ThemeIcon, Box, Badge } from '@mantine/core';
import { IconChartPie, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

export function MenuStrategyWidget() {
    return (
        <Paper
            radius="lg"
            p="md"
            withBorder
            style={{
                background: '#1F2937',
                borderColor: '#374151',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Group justify="space-between" mb="xs">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="teal" radius="md" size="sm">
                        <IconChartPie size={14} />
                    </ThemeIcon>
                    <Text size="xs" fw={700} c="gray.3" tt="uppercase">메뉴 전략</Text>
                </Group>
                <Badge variant="light" color="teal" size="xs">분석 완료</Badge>
            </Group>

            <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="lg" fw={800} c="white">
                    &apos;김치찌개&apos; 가격 인상 추천
                </Text>
                <Text size="xs" c="dimmed" lh={1.4}>
                    주문량은 상위 10%인데, 마진율이 5% 미만입니다. <br />
                    <Text span c="teal.4" fw={700}>500원 인상 시 월 +35만원</Text> 예상이익.
                </Text>

                {/* Visual Representation (Mini Bars) */}
                <Box mt="auto">
                    <Group justify="space-between" mb={4}>
                        <Text size="xs" c="gray.5">인기도 (주문수)</Text>
                        <Group gap={4}>
                            <Box w={60} h={6} bg="blue.5" style={{ borderRadius: 4 }} />
                            <Text size="xs" c="blue.3">High</Text>
                        </Group>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="gray.5">순수익 (마진)</Text>
                        <Group gap={4}>
                            <Box w={20} h={6} bg="red.5" style={{ borderRadius: 4 }} />
                            <Text size="xs" c="red.3">Low</Text>
                        </Group>
                    </Group>
                </Box>
            </Stack>
        </Paper>
    );
}
