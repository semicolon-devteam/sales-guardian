'use client';

import { Paper, Title, Text, Button, Group, Stack, Badge, Loader, ThemeIcon } from '@mantine/core';
import { IconClockPlay, IconClockStop, IconHistory } from '@tabler/icons-react';
import { useStore } from '../../_contexts/store-context';
import { useState, useEffect, useCallback } from 'react';
import { getStoreMembers } from '../../store/members/actions';
import { getTodayLog, clockIn, clockOut, getWorkLogs } from '../actions';
import dayjs from 'dayjs';

export function AttendanceCard() {
    const { currentStore, user } = useStore();
    const [status, setStatus] = useState<'working' | 'idle' | 'loading'>('loading');
    const [currentLog, setCurrentLog] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [userMemberInfo, setUserMemberInfo] = useState<any>(null);

    const fetchMyInfo = useCallback(async () => {
        if (!currentStore) return;
        const members = await getStoreMembers(currentStore.id);
        const me = members.find((m: any) => m.user_id === user?.id);
        setUserMemberInfo(me);
    }, [currentStore, user]);

    const fetchStatus = useCallback(async () => {
        if (!currentStore || !user) return;
        const log = await getTodayLog(currentStore.id, user.id);
        if (log && !log.clock_out) {
            setStatus('working');
            setCurrentLog(log);
        } else {
            setStatus('idle');
            setCurrentLog(null);
        }
    }, [currentStore, user]);

    const fetchLogs = useCallback(async () => {
        if (!currentStore) return;
        const data = await getWorkLogs(currentStore.id);
        setLogs(data);
    }, [currentStore]);

    useEffect(() => {
        if (currentStore && user) {
            fetchStatus();
            fetchLogs();
            fetchMyInfo();
        }
    }, [currentStore, user, fetchStatus, fetchLogs, fetchMyInfo]);

    const handleClockIn = async () => {
        if (!currentStore || !user || !userMemberInfo) {
            alert('직원 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        try {
            await clockIn(currentStore.id, user.id, userMemberInfo.hourly_wage || 9860);
            setStatus('working'); // Optimistic update
            fetchStatus();
            fetchLogs();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleClockOut = async () => {
        if (!currentLog) return;
        try {
            await clockOut(currentLog.id);
            setStatus('idle');
            fetchStatus();
            fetchLogs();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <Stack gap="lg">
            {/* Control Panel */}
            <Paper p="xl" radius="lg" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                <Group justify="space-between" align="center">
                    <Stack gap={4}>
                        <Text fw={700} c="white" size="lg">현재 상태: {status === 'working' ? '근무 중 🔥' : '휴식 중 ☕'}</Text>
                        {status === 'working' && currentLog && (
                            <Text c="dimmed" size="sm">
                                출근 시간: {dayjs(currentLog.clock_in).format('HH:mm')} ~
                            </Text>
                        )}
                    </Stack>

                    {status === 'idle' ? (
                        <Button
                            size="lg"
                            color="teal"
                            leftSection={<IconClockPlay size={24} />}
                            onClick={handleClockIn}
                            loading={!userMemberInfo}
                        >
                            출근하기
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            color="red"
                            variant="light"
                            leftSection={<IconClockStop size={24} />}
                            onClick={handleClockOut}
                        >
                            퇴근하기
                        </Button>
                    )}
                </Group>
            </Paper>

            {/* Log History */}
            <Stack gap="sm">
                <Text fw={700} c="gray.3" size="md">최근 근무 기록</Text>
                {logs.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">아직 기록이 없습니다.</Text>
                ) : (
                    logs.map(log => {
                        const duration = log.clock_out
                            ? (dayjs(log.clock_out).diff(dayjs(log.clock_in), 'hour', true)).toFixed(1)
                            : '진행 중';

                        return (
                            <Paper key={log.id} p="md" bg="rgba(255,255,255,0.05)" radius="md">
                                <Group justify="space-between">
                                    <Group>
                                        <Badge
                                            size="lg"
                                            variant="dot"
                                            color={log.status === 'working' ? 'green' : 'gray'}
                                        >
                                            {dayjs(log.clock_in).format('M/D')}
                                        </Badge>
                                        <Stack gap={0}>
                                            <Text fw={700} c="white">{log.store_members?.alias || '직원'}</Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(log.clock_in).format('HH:mm')} ~ {log.clock_out ? dayjs(log.clock_out).format('HH:mm') : '...'}
                                            </Text>
                                        </Stack>
                                    </Group>
                                    <Badge variant="outline" color="gray">
                                        {duration} 시간
                                    </Badge>
                                </Group>
                            </Paper>
                        );
                    })
                )}
            </Stack>
        </Stack>
    );
}
