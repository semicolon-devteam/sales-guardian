'use client';

import { useState } from 'react';
import { Group, Title, Button, Modal, TextInput, Menu, ActionIcon, Text, Stack, Select } from '@mantine/core';
import { IconChevronDown, IconPlus, IconBuildingStore, IconUsers } from '@tabler/icons-react';
import { useStore } from '../_contexts/store-context';

export function TimelineHeader() {
    const { currentStore, myStores, setCurrentStore, createStore } = useStore();
    const [opened, setOpened] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!newStoreName.trim()) return;
        setIsCreating(true);
        const error = await createStore(newStoreName);
        setIsCreating(false);
        if (error) {
            alert(error);
        } else {
            setOpened(false);
            setNewStoreName('');
        }
    };

    return (
        <>
            <Group justify="space-between" align="center" mb="lg">
                <Group gap="xs">
                    <Select
                        value={currentStore?.id}
                        onChange={(val) => {
                            const store = myStores.find(s => s.id === val);
                            if (store) setCurrentStore(store);
                        }}
                        data={myStores.map(s => ({ value: s.id, label: s.name }))}
                        allowDeselect={false}
                        styles={{
                            input: {
                                backgroundColor: 'transparent',
                                borderColor: 'transparent',
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '24px',
                                paddingLeft: 0,
                                width: 'auto',
                                minWidth: '150px'
                            },
                            dropdown: {
                                backgroundColor: '#1F2937',
                                borderColor: '#374151',
                                color: 'white',
                            },
                            option: {
                                color: 'white',
                                // '&:hover': { backgroundColor: '#374151' },
                                // '&[data-checked]': { backgroundColor: '#2563eb', color: 'white' }
                            }
                        }}
                        rightSection={<IconChevronDown color="white" />}
                    />
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="lg"
                        radius="xl"
                        onClick={() => setOpened(true)}
                        title="새 가게 추가"
                    >
                        <IconPlus size={24} />
                    </ActionIcon>
                </Group>

                <Button
                    variant="light"
                    color="gray"
                    size="sm"
                    radius="xl"
                    leftSection={<IconUsers size={16} />}
                    onClick={() => window.location.href = '/store/members'}
                >
                    팀원 관리
                </Button>
            </Group>

            {/* Create Store Modal */}
            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title="새로운 가게 만들기"
                centered
                radius="lg"
                styles={{
                    header: {
                        backgroundColor: '#1F2937',
                        color: 'white',
                    },
                    content: {
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                    },
                    title: {
                        fontWeight: 700,
                    },
                    close: {
                        color: 'gray',
                        '&:hover': {
                            backgroundColor: '#374151',
                            color: 'white'
                        }
                    }
                }}
            >
                <Stack>
                    <TextInput
                        label="가게 이름"
                        placeholder="예: 강남점, 테이스티버거 등"
                        description="운영하시는 가게의 애칭이나 지점명을 입력해주세요."
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.currentTarget.value)}
                        data-autofocus
                        styles={{
                            input: {
                                backgroundColor: '#111827',
                                borderColor: '#374151',
                                color: 'white'
                            },
                            label: { color: 'white' }
                        }}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setOpened(false)} color="dark">취소</Button>
                        <Button
                            color="teal"
                            onClick={handleCreate}
                            loading={isCreating}
                            disabled={!newStoreName.trim()}
                        >
                            가게 생성 완료
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
