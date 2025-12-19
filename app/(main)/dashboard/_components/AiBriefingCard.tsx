'use client';

import { Paper, Text, Stack, Box, Group, ThemeIcon, Button, RingProgress } from '@mantine/core';
import { IconSparkles, IconArrowRight } from '@tabler/icons-react';
import { useTypewriter } from '@/app/_shared/hooks/useTypewriter';

type AiBriefingProps = {
    username: string;
    metrics: {
        sales: number;
        target: number;
        growthRate: number; // Percentage (e.g., 12 for +12%)
    };
    health: 'good' | 'bad' | 'neutral'; // Determines Theme
};

export function AiBriefingCard({ username, metrics, health }: AiBriefingProps) {
    // Determine gradient based on health
    const bgGradient = health === 'good'
        ? 'linear-gradient(135deg, #1B2136 0%, #1c3b6b 100%)' // Navy to Deep Blue
        : health === 'bad'
            ? 'linear-gradient(135deg, #2a1215 0%, #1B2136 100%)' // Dark Red to Navy
            : 'linear-gradient(135deg, #1B2136 0%, #252b42 100%)'; // Neutral

    const accentColor = health === 'good' ? '#fbbf24' : health === 'bad' ? '#f87171' : '#9ca3af';

    // Generate Greeting Message (Mock AI)
    const getGreeting = () => {
        if (health === 'good') return `좋은 아침입니다, ${username} 사장님! ☀️\n목표 달성이 코앞이에요. 이 기세를 몰아보시죠!`;
        if (health === 'bad') return `안녕하세요, ${username} 사장님. 🌧️\n어제는 조금 아쉬웠지만, 오늘은 반등할 기회입니다.`;
        return `반갑습니다, ${username} 사장님.\n꾸준함이 장사의 비결이죠. 오늘도 화이팅하세요!`;
    };

    const message = getGreeting();
    const { displayedText, isComplete } = useTypewriter(message, 30);

    return (
        <Paper
            radius="lg"
            p="xl"
            shadow="lg"
            style={{
                background: bgGradient,
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '180px'
            }}
        >
            {/* Ambient Glow */}
            <Box style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle, ${accentColor} 30%, transparent 70%)`,
                opacity: 0.15,
                filter: 'blur(60px)',
                zIndex: 0
            }} />

            <Stack style={{ position: 'relative', zIndex: 1 }} gap="lg">
                <Group align="flex-start" justify="space-between">
                    <Stack gap="xs" style={{ maxWidth: '70%' }}>
                        {/* AI Label */}
                        <Group gap="xs">
                            <ThemeIcon size="sm" radius="xl" color="dark" variant="light" bg="rgba(255,255,255,0.1)">
                                <IconSparkles size={12} color={accentColor} />
                            </ThemeIcon>
                            <Text size="xs" fw={700} c={accentColor} tt="uppercase" style={{ letterSpacing: '1px' }}>
                                AI 비서
                            </Text>
                        </Group>

                        {/* Typewriter Message */}
                        <Text
                            fw={700}
                            size="lg"
                            style={{
                                whiteSpace: 'pre-line',
                                lineHeight: 1.4,
                                minHeight: '56px' // Prevent layout shift
                            }}
                        >
                            {displayedText}
                            {!isComplete && <span className="animate-pulse">|</span>}
                        </Text>
                    </Stack>

                    {/* Mini Target Ring */}
                    <Stack align="center" gap={4}>
                        <RingProgress
                            size={80}
                            thickness={8}
                            roundCaps
                            sections={[{ value: (metrics.sales / metrics.target) * 100, color: health === 'bad' ? 'red' : 'blue' }]}
                            label={
                                <Text ta="center" size="xs" fw={700}>
                                    {Math.min(Math.round((metrics.sales / metrics.target) * 100), 100)}%
                                </Text>
                            }
                        />
                        <Text size="xs" c="dimmed">목표 달성</Text>
                    </Stack>
                </Group>

                {/* Insight / Action */}
                {isComplete && (
                    <Box
                        p="xs"
                        px="md"
                        style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${accentColor}`,
                            animation: 'fadeIn 0.5s ease-in-out'
                        }}
                    >
                        <Group justify="space-between">
                            <Text size="sm" fw={500}>
                                💡 팁: 최근 &apos;점심 세트 A&apos; 주문이 15% 늘었어요.
                            </Text>
                            <Button
                                variant="subtle"
                                color="gray"
                                size="compact-xs"
                                rightSection={<IconArrowRight size={14} />}
                            >
                                상세 보기
                            </Button>
                        </Group>
                    </Box>
                )}
            </Stack>
        </Paper>
    );
}
