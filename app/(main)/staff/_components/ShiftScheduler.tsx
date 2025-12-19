'use client';

import { Paper, Title, Text, Button, Group, Stack, Badge, Modal, Select, TextInput, ActionIcon, Loader } from '@mantine/core';
import { IconPlus, IconTrash, IconClock } from '@tabler/icons-react';
import { Calendar } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useStore } from '../../_contexts/store-context';
import { getStoreMembers } from '../../store/members/actions';
import { createSchedule, deleteSchedule, getSchedules } from '../actions';
import dayjs from 'dayjs';
import { TimeInput } from '@mantine/dates';

export function ShiftScheduler() {
    const { currentStore } = useStore();
    const [date, setDate] = useState<Date | null>(new Date());
    const [members, setMembers] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [opened, { open, close }] = useDisclosure(false);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('18:00');
    const [memo, setMemo] = useState('');

    useEffect(() => {
        if (currentStore) {
            getStoreMembers(currentStore.id).then(setMembers);
        }
    }, [currentStore]);

    const fetchSchedules = async () => {
        if (!currentStore || !date) return;
        setLoading(true);
        // Fetch for the whole month to show dots? Or just the selected day first.
        // Let's fetch selected day range.
        const start = dayjs(date).startOf('day').toISOString();
        const end = dayjs(date).endOf('day').toISOString();
        const data = await getSchedules(currentStore.id, start, end);
        setSchedules(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedules();
    }, [date, currentStore]);

    const handleCreate = async () => {
        if (!currentStore || !selectedMember || !date) return;

        // Construct ISO strings
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        const start = dayjs(`${dateStr} ${startTime}`).toISOString();
        const end = dayjs(`${dateStr} ${endTime}`).toISOString();

        // The user_id in store_members is store_members.user_id (the uuid of user).
        // Wait, getStoreMembers returns { id (memberId?), user_id, ... }
        // getStoreMembers actions.ts returns: id (member.id), user_id (member.user_id)
        // createSchedule expects user_id. Correct.

        // Find the user_id from the selected memberId (which might be member table id or user id?)
        // The Select value will use user_id.

        await createSchedule(currentStore.id, selectedMember, start, end, memo);
        close();
        fetchSchedules();

        // Reset form
        setMemo('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('일정을 삭제하시겠습니까?')) return;
        await deleteSchedule(id);
        fetchSchedules();
    };

    // Calendar Indicators
    // Doing "dots" requires fetching the whole month. 
    // For MVP, let's keep it simple: just show list on right.

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Text size="lg" fw={700} c="white">
                    {dayjs(date).format('M월 D일')} 근무 일정
                </Text>
                <Button leftSection={<IconPlus size={16} />} color="teal" onClick={open}>
                    근무 추가
                </Button>
            </Group>

            <Group align="flex-start" grow preventGrowOverflow={false}>
                {/* Calendar */}
                <Paper p="md" radius="lg" bg="#1F2937" style={{ border: '1px solid #374151', maxWidth: 350 }}>
                    <Calendar
                        static
                        date={date || undefined}
                        onDateChange={(val) => setDate(val ? new Date(val) : null)}
                        size="md"
                        styles={{
                            calendarHeader: { color: 'white' },
                            day: { color: 'white', borderRadius: 8 },
                            calendarHeaderControl: { color: 'gray' },
                            levelsGroup: { height: 280 }
                        }}
                    />
                </Paper>

                {/* Schedule List */}
                <Paper p="lg" radius="lg" bg="#1F2937" style={{ border: '1px solid #374151', minHeight: 320 }}>
                    <Stack gap="sm">
                        {loading ? <Loader color="teal" size="sm" mx="auto" /> :
                            schedules.length === 0 ? (
                                <Stack align="center" justify="center" h={200} opacity={0.5}>
                                    <IconClock size={40} />
                                    <Text size="sm">일정이 없습니다.</Text>
                                </Stack>
                            ) : (
                                schedules.map(sch => {
                                    const member = members.find(m => m.user_id === sch.user_id);
                                    const memberName = sch.store_members?.alias || (member?.role === 'owner' ? '사장님' : '직원');

                                    return (
                                        <Paper key={sch.id} p="sm" bg="rgba(255,255,255,0.05)">
                                            <Group justify="space-between">
                                                <Group>
                                                    <Badge color={member?.color || 'teal'} variant="light" size="lg" radius="sm">
                                                        {dayjs(sch.start_time).format('HH:mm')} ~ {dayjs(sch.end_time).format('HH:mm')}
                                                    </Badge>
                                                    <Stack gap={0}>
                                                        <Text fw={700} c="white" size="sm">{memberName}</Text>
                                                        <Text size="xs" c="dimmed">{sch.memo || '메모 없음'}</Text>
                                                    </Stack>
                                                </Group>
                                                <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(sch.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Paper>
                                    );
                                })
                            )}
                    </Stack>
                </Paper>
            </Group>

            {/* Add Schedule Modal */}
            <Modal opened={opened} onClose={close} title="새 근무 일정 등록" centered
                styles={{ header: { backgroundColor: '#1F2937', color: 'white' }, body: { backgroundColor: '#1F2937' } }}>
                <Stack>
                    <Select
                        label={<Text c="gray.3" size="sm">직원 선택</Text>}
                        placeholder="근무할 직원을 선택하세요"
                        data={members.map(m => ({ value: m.user_id, label: m.alias || `직원 (${m.user_id.slice(0, 4)})` }))}
                        value={selectedMember}
                        onChange={setSelectedMember}
                        styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: '#4B5563' }, dropdown: { backgroundColor: '#374151', color: 'white' } }}
                    />

                    <Group grow>
                        <TextInput
                            label={<Text c="gray.3" size="sm">시작 시간</Text>}
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: '#4B5563' } }}
                        />
                        <TextInput
                            label={<Text c="gray.3" size="sm">종료 시간</Text>}
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: '#4B5563' } }}
                        />
                    </Group>

                    <TextInput
                        label={<Text c="gray.3" size="sm">메모</Text>}
                        placeholder="예: 오픈 준비"
                        value={memo}
                        onChange={(e) => setMemo(e.currentTarget.value)}
                        styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: '#4B5563' } }}
                    />

                    <Button fullWidth color="teal" onClick={handleCreate} mt="md">
                        등록하기
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
