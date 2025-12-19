'use client';

import { Paper, Text, Stack, Group, ThemeIcon, Badge, RingProgress } from '@mantine/core';
import { IconMessageCircle, IconThumbUp, IconThumbDown } from '@tabler/icons-react';

export function ReviewWidget() {
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
                    <ThemeIcon variant="light" color="violet" radius="md" size="sm">
                        <IconMessageCircle size={14} />
                    </ThemeIcon>
                    <Text size="xs" fw={700} c="gray.3" tt="uppercase">실시간 리뷰 분석</Text>
                </Group>
                <Badge variant="light" color="violet" size="xs">3건 분석됨</Badge>
            </Group>

            <Group align="center" justify="space-between" style={{ flex: 1 }}>
                {/* Left: Score */}
                <Stack gap={0} align="center">
                    <RingProgress
                        size={80}
                        thickness={8}
                        roundCaps
                        sections={[
                            { value: 85, color: 'violet' },
                            { value: 15, color: 'gray.8' }
                        ]}
                        label={
                            <Text ta="center" size="sm" fw={700} c="white">85점</Text>
                        }
                    />
                    <Text size="xs" c="dimmed">긍정 비율</Text>
                </Stack>

                {/* Right: Summary */}
                <Stack gap="xs" style={{ flex: 1 }}>
                    <Group gap="xs">
                        <IconThumbUp size={14} color="#a78bfa" />
                        <Text size="xs" c="gray.3" lineClamp={1}>&quot;국물이 진짜 진해요&quot;</Text>
                    </Group>
                    <Group gap="xs">
                        <IconThumbDown size={14} color="#f87171" />
                        <Text size="xs" c="gray.3" lineClamp={1}>&quot;배달이 좀 식어서 왔..&quot;</Text>
                    </Group>
                    <Badge variant="outline" color="gray" size="xs" fullWidth>
                        AI 요약 보기
                    </Badge>
                </Stack>
            </Group>
        </Paper>
    );
}
