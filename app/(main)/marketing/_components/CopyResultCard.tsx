'use client';

import { Paper, Text, Group, Stack, Badge, Button, CopyButton, Tooltip, ActionIcon, Box, Divider } from '@mantine/core';
import { IconCopy, IconCheck, IconExternalLink, IconBrandInstagram } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { GeneratedCopy } from '../actions';

interface CopyResultCardProps {
    copy: GeneratedCopy;
}

export function CopyResultCard({ copy }: CopyResultCardProps) {
    const channelColors: Record<string, string> = {
        baemin: 'cyan',
        yogiyo: 'pink',
        instagram: 'grape',
        danggeun: 'orange',
        pop: 'blue'
    };

    const channelBgColors: Record<string, string> = {
        baemin: 'rgba(34, 211, 238, 0.1)',
        yogiyo: 'rgba(244, 114, 182, 0.1)',
        instagram: 'linear-gradient(135deg, rgba(131, 58, 180, 0.1) 0%, rgba(253, 29, 29, 0.1) 50%, rgba(252, 176, 69, 0.1) 100%)',
        danggeun: 'rgba(251, 146, 60, 0.1)',
        pop: 'rgba(59, 130, 246, 0.1)'
    };

    const color = channelColors[copy.channel] || 'gray';
    const bgColor = channelBgColors[copy.channel] || 'rgba(100, 100, 100, 0.1)';

    // 복사할 전체 텍스트 (해시태그 포함)
    const fullCopyText = copy.hashtags
        ? `${copy.content}\n\n${copy.hashtags.join(' ')}`
        : copy.content;

    return (
        <Paper
            p="md"
            radius="lg"
            style={{
                background: bgColor,
                border: `1px solid var(--mantine-color-${color}-5, #374151)`,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Decorative gradient line */}
            <Box
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: copy.channel === 'instagram'
                        ? 'linear-gradient(90deg, #833AB4, #FD1D1D, #FCB045)'
                        : `var(--mantine-color-${color}-5)`
                }}
            />

            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <Group gap="sm">
                        <Text size="xl">{copy.channelIcon}</Text>
                        <Stack gap={0}>
                            <Text fw={700} c="white" size="sm">
                                {copy.channelName}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {copy.tone}
                            </Text>
                        </Stack>
                    </Group>
                    <CopyButton value={fullCopyText}>
                        {({ copied, copy: doCopy }) => (
                            <Tooltip label={copied ? '복사됨!' : '클립보드에 복사'}>
                                <Button
                                    size="xs"
                                    variant={copied ? 'filled' : 'light'}
                                    color={copied ? 'teal' : color}
                                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    onClick={() => {
                                        doCopy();
                                        notifications.show({
                                            title: '복사 완료!',
                                            message: `${copy.channelName} 문구가 클립보드에 복사되었습니다.`,
                                            color: 'teal',
                                            icon: <IconCheck size={16} />
                                        });
                                    }}
                                >
                                    {copied ? '복사됨' : '복사하기'}
                                </Button>
                            </Tooltip>
                        )}
                    </CopyButton>
                </Group>

                {/* Content */}
                <Paper
                    p="md"
                    radius="md"
                    bg="rgba(0,0,0,0.3)"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <Text
                        size="sm"
                        c="gray.2"
                        style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            fontFamily: copy.channel === 'pop' ? 'inherit' : 'inherit'
                        }}
                    >
                        {copy.content}
                    </Text>

                    {/* Hashtags for Instagram */}
                    {copy.hashtags && copy.hashtags.length > 0 && (
                        <>
                            <Divider my="sm" color="gray.8" />
                            <Group gap={6} wrap="wrap">
                                {copy.hashtags.map((tag, idx) => (
                                    <Badge
                                        key={idx}
                                        size="sm"
                                        variant="outline"
                                        color={color}
                                        style={{ fontWeight: 400 }}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </Group>
                        </>
                    )}
                </Paper>

                {/* Quick Actions */}
                {copy.channel === 'instagram' && (
                    <Group gap="xs">
                        <Button
                            size="xs"
                            variant="subtle"
                            color="grape"
                            leftSection={<IconBrandInstagram size={14} />}
                            component="a"
                            href="https://www.instagram.com/"
                            target="_blank"
                        >
                            인스타그램 열기
                        </Button>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}

// 로딩 스켈레톤
export function CopyResultSkeleton() {
    return (
        <Paper
            p="md"
            radius="lg"
            bg="#1F2937"
            style={{ border: '1px solid #374151' }}
        >
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Box w={40} h={40} bg="gray.8" style={{ borderRadius: 8 }} />
                        <Stack gap={4}>
                            <Box w={100} h={16} bg="gray.8" style={{ borderRadius: 4 }} />
                            <Box w={60} h={12} bg="gray.8" style={{ borderRadius: 4 }} />
                        </Stack>
                    </Group>
                    <Box w={80} h={28} bg="gray.8" style={{ borderRadius: 4 }} />
                </Group>
                <Paper p="md" radius="md" bg="rgba(0,0,0,0.3)">
                    <Stack gap="xs">
                        <Box w="100%" h={14} bg="gray.8" style={{ borderRadius: 4 }} />
                        <Box w="90%" h={14} bg="gray.8" style={{ borderRadius: 4 }} />
                        <Box w="75%" h={14} bg="gray.8" style={{ borderRadius: 4 }} />
                        <Box w="60%" h={14} bg="gray.8" style={{ borderRadius: 4 }} />
                    </Stack>
                </Paper>
            </Stack>
        </Paper>
    );
}
