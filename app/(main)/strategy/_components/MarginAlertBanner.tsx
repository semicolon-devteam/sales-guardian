'use client';

import { Paper, Text, Group, Stack, Badge, ActionIcon, Collapse, ThemeIcon, Button, Box } from '@mantine/core';
import { IconAlertTriangle, IconX, IconChevronDown, IconChevronUp, IconTrendingDown, IconFlame } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { fetchUnreadAlerts, readAlert } from '../live-cost-actions';
import type { MarginAlert } from '../_repositories/live-cost-repository';

interface MarginAlertBannerProps {
    storeId?: string;
    onAlertClick?: (alert: MarginAlert) => void;
}

export function MarginAlertBanner({ storeId, onAlertClick }: MarginAlertBannerProps) {
    const [alerts, setAlerts] = useState<MarginAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, { toggle }] = useDisclosure(false);

    useEffect(() => {
        loadAlerts();
    }, [storeId]);

    const loadAlerts = async () => {
        setLoading(true);
        const result = await fetchUnreadAlerts(storeId);
        if (result.success) {
            setAlerts(result.data || []);
        }
        setLoading(false);
    };

    const handleDismiss = async (alertId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await readAlert(alertId);
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const dangerAlerts = alerts.filter(a => a.severity === 'danger');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    if (loading || alerts.length === 0) {
        return null;
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'danger': return 'red';
            case 'warning': return 'yellow';
            default: return 'blue';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'danger': return <IconFlame size={16} />;
            case 'warning': return <IconTrendingDown size={16} />;
            default: return <IconAlertTriangle size={16} />;
        }
    };

    return (
        <Paper
            p="md"
            radius="lg"
            style={{
                background: dangerAlerts.length > 0
                    ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 212, 59, 0.15) 0%, rgba(255, 212, 59, 0.05) 100%)',
                border: `1px solid ${dangerAlerts.length > 0 ? '#fa525280' : '#fab00580'}`,
            }}
        >
            <Stack gap="sm">
                {/* Header */}
                <Group justify="space-between" onClick={toggle} style={{ cursor: 'pointer' }}>
                    <Group gap="sm">
                        <ThemeIcon
                            size="lg"
                            radius="xl"
                            color={dangerAlerts.length > 0 ? 'red' : 'yellow'}
                            variant="light"
                            className={dangerAlerts.length > 0 ? 'animate-pulse' : ''}
                        >
                            <IconAlertTriangle size={20} />
                        </ThemeIcon>
                        <Stack gap={0}>
                            <Text fw={700} c="white" size="sm">
                                마진 위험 알림
                                <Badge
                                    ml="xs"
                                    size="sm"
                                    color={dangerAlerts.length > 0 ? 'red' : 'yellow'}
                                    variant="filled"
                                >
                                    {alerts.length}
                                </Badge>
                            </Text>
                            <Text size="xs" c="dimmed">
                                {dangerAlerts.length > 0
                                    ? `🔥 ${dangerAlerts.length}개 메뉴의 마진이 위험 수준입니다!`
                                    : `⚠️ ${warningAlerts.length}개 식자재 가격이 급등했습니다.`
                                }
                            </Text>
                        </Stack>
                    </Group>
                    <ActionIcon variant="subtle" color="gray">
                        {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </ActionIcon>
                </Group>

                {/* Alert List */}
                <Collapse in={expanded}>
                    <Stack gap="xs" mt="xs">
                        {alerts.map(alert => (
                            <Paper
                                key={alert.id}
                                p="sm"
                                radius="md"
                                bg="rgba(0,0,0,0.2)"
                                style={{
                                    border: `1px solid ${getSeverityColor(alert.severity)}40`,
                                    cursor: onAlertClick ? 'pointer' : 'default'
                                }}
                                onClick={() => onAlertClick?.(alert)}
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="xs" wrap="nowrap">
                                        <ThemeIcon
                                            size="sm"
                                            radius="xl"
                                            color={getSeverityColor(alert.severity)}
                                            variant="light"
                                        >
                                            {getSeverityIcon(alert.severity)}
                                        </ThemeIcon>
                                        <Box style={{ flex: 1 }}>
                                            <Text size="sm" c="white" lineClamp={2}>
                                                {alert.message}
                                            </Text>
                                            {alert.change_percent && (
                                                <Text size="xs" c="dimmed" mt={2}>
                                                    변동: {alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(1)}%
                                                </Text>
                                            )}
                                        </Box>
                                    </Group>
                                    <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        color="gray"
                                        onClick={(e) => handleDismiss(alert.id, e)}
                                    >
                                        <IconX size={14} />
                                    </ActionIcon>
                                </Group>
                            </Paper>
                        ))}

                        <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            fullWidth
                            onClick={() => alerts.forEach(a => readAlert(a.id))}
                        >
                            모두 읽음 처리
                        </Button>
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    );
}
