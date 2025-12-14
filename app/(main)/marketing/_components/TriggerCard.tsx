'use client';

import { Paper, Text, Group, ThemeIcon, Badge, Stack, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import type { MarketingTrigger } from '../actions';

interface TriggerCardProps {
    trigger: MarketingTrigger;
    selected: boolean;
    onSelect: (trigger: MarketingTrigger) => void;
}

export function TriggerCard({ trigger, selected, onSelect }: TriggerCardProps) {
    return (
        <UnstyledButton onClick={() => onSelect(trigger)} style={{ width: '100%' }}>
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: selected
                        ? `linear-gradient(135deg, rgba(var(--mantine-color-${trigger.color}-filled-rgb), 0.2) 0%, rgba(var(--mantine-color-${trigger.color}-filled-rgb), 0.1) 100%)`
                        : '#1F2937',
                    border: selected ? `2px solid var(--mantine-color-${trigger.color}-5)` : '1px solid #374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                }}
            >
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <ThemeIcon
                            size="xl"
                            radius="xl"
                            variant={selected ? 'filled' : 'light'}
                            color={trigger.color}
                        >
                            <Text size="xl">{trigger.icon}</Text>
                        </ThemeIcon>
                        <Stack gap={2}>
                            <Group gap="xs">
                                <Text fw={700} c="white" size="sm">
                                    {trigger.label}
                                </Text>
                                {trigger.type === 'menu' && (
                                    <Badge size="xs" color={trigger.color} variant="light">
                                        {trigger.data?.menu?.type === 'star' ? '효자' : '보석'}
                                    </Badge>
                                )}
                                {trigger.type === 'weather' && (
                                    <Badge size="xs" color="blue" variant="light">
                                        +{trigger.data?.demandIncrease || 0}% 수요
                                    </Badge>
                                )}
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                                {trigger.description}
                            </Text>
                        </Stack>
                    </Group>
                    <ThemeIcon
                        variant="subtle"
                        color={selected ? trigger.color : 'gray'}
                        size="sm"
                    >
                        <IconChevronRight size={16} />
                    </ThemeIcon>
                </Group>
            </Paper>
        </UnstyledButton>
    );
}

// 그리드용 컴팩트 버전
interface TriggerBadgeProps {
    trigger: MarketingTrigger;
    selected: boolean;
    onSelect: (trigger: MarketingTrigger) => void;
}

export function TriggerBadge({ trigger, selected, onSelect }: TriggerBadgeProps) {
    return (
        <Badge
            size="lg"
            radius="md"
            variant={selected ? 'filled' : 'light'}
            color={selected ? trigger.color : 'gray'}
            leftSection={<Text size="sm">{trigger.icon}</Text>}
            style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selected ? 'none' : '1px solid #374151',
                padding: '12px 16px',
                height: 'auto'
            }}
            onClick={() => onSelect(trigger)}
        >
            {trigger.label}
        </Badge>
    );
}
