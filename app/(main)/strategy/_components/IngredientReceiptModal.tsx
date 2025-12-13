'use client';

import {
    Modal, Stack, Text, Button, Group, Paper, Table, NumberInput,
    TextInput, ActionIcon, Badge, LoadingOverlay, Progress, Alert
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import {
    IconUpload, IconPhoto, IconX, IconCheck, IconAlertCircle,
    IconReceipt, IconEdit, IconTrash, IconSparkles
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import {
    extractIngredientsFromReceipt,
    processExpenseOcrForIngredients,
    type ParsedIngredientItem
} from '../live-cost-actions';

interface IngredientReceiptModalProps {
    opened: boolean;
    onClose: () => void;
    storeId?: string;
    onComplete?: (result: any) => void;
}

type ProcessingStep = 'upload' | 'extracting' | 'review' | 'processing' | 'complete';

export function IngredientReceiptModal({ opened, onClose, storeId, onComplete }: IngredientReceiptModalProps) {
    const [step, setStep] = useState<ProcessingStep>('upload');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [items, setItems] = useState<ParsedIngredientItem[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const resetModal = useCallback(() => {
        setStep('upload');
        setImagePreview(null);
        setImageBase64(null);
        setItems([]);
        setEditingIndex(null);
        setResult(null);
        setError(null);
    }, []);

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleDrop = async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        setError(null);

        // 이미지 미리보기
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setImagePreview(result);
            // base64 데이터만 추출 (data:image/jpeg;base64, 제거)
            const base64 = result.split(',')[1];
            setImageBase64(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleExtract = async () => {
        if (!imageBase64) return;

        setStep('extracting');
        setError(null);

        try {
            const response = await extractIngredientsFromReceipt(imageBase64);

            if (response.success && response.data) {
                setItems(response.data.items || []);
                setStep('review');

                if (response.data.items.length === 0) {
                    setError('영수증에서 식자재를 찾지 못했습니다. 수동으로 입력해주세요.');
                }
            } else {
                setError(response.error || 'AI 분석에 실패했습니다.');
                setStep('upload');
            }
        } catch (err: any) {
            setError(err.message);
            setStep('upload');
        }
    };

    const handleItemChange = (index: number, field: keyof ParsedIngredientItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, { name: '', price: 0, quantity: 1, unit: 'kg' }]);
        setEditingIndex(items.length);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = async () => {
        if (items.length === 0) {
            setError('처리할 식자재가 없습니다.');
            return;
        }

        setStep('processing');
        setError(null);

        try {
            const response = await processExpenseOcrForIngredients(items, storeId);

            if (response.success && response.data) {
                setResult(response.data);
                setStep('complete');

                // 알림 표시
                if (response.data.alerts.length > 0) {
                    notifications.show({
                        title: '🔥 마진 위험 감지!',
                        message: `${response.data.alerts.length}개 메뉴의 마진이 위험 수준입니다.`,
                        color: 'red',
                        autoClose: 5000
                    });
                } else if (response.data.matched.length > 0) {
                    notifications.show({
                        title: '✅ 원가 업데이트 완료',
                        message: `${response.data.matched.length}개 식자재의 가격이 업데이트되었습니다.`,
                        color: 'teal',
                        autoClose: 3000
                    });
                }

                onComplete?.(response.data);
            } else {
                setError(response.error || '처리에 실패했습니다.');
                setStep('review');
            }
        } catch (err: any) {
            setError(err.message);
            setStep('review');
        }
    };

    const renderStep = () => {
        switch (step) {
            case 'upload':
                return (
                    <Stack gap="md">
                        <Text size="sm" c="dimmed" ta="center">
                            식자재 영수증을 업로드하면 AI가 자동으로 분석하여<br />
                            메뉴 원가를 실시간으로 업데이트합니다.
                        </Text>

                        <Dropzone
                            onDrop={handleDrop}
                            accept={IMAGE_MIME_TYPE}
                            maxSize={10 * 1024 ** 2}
                            multiple={false}
                            styles={{
                                root: {
                                    backgroundColor: '#374151',
                                    borderColor: '#4B5563',
                                    minHeight: 200
                                }
                            }}
                        >
                            <Stack gap="md" align="center" justify="center" style={{ minHeight: 180 }}>
                                <Dropzone.Accept>
                                    <IconUpload size={50} color="teal" stroke={1.5} />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX size={50} color="red" stroke={1.5} />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconReceipt size={50} color="gray" stroke={1.5} />
                                </Dropzone.Idle>

                                <div>
                                    <Text size="lg" ta="center" c="white" fw={500}>
                                        영수증 사진을 드래그하거나 클릭하세요
                                    </Text>
                                    <Text size="xs" c="dimmed" ta="center" mt={4}>
                                        JPG, PNG 파일 (최대 10MB)
                                    </Text>
                                </div>
                            </Stack>
                        </Dropzone>

                        {imagePreview && (
                            <Paper p="md" radius="md" bg="rgba(0,0,0,0.2)">
                                <Group justify="space-between" mb="sm">
                                    <Text size="sm" c="white" fw={500}>미리보기</Text>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => {
                                            setImagePreview(null);
                                            setImageBase64(null);
                                        }}
                                    >
                                        <IconX size={16} />
                                    </ActionIcon>
                                </Group>
                                <img
                                    src={imagePreview}
                                    alt="Receipt preview"
                                    style={{
                                        width: '100%',
                                        maxHeight: 300,
                                        objectFit: 'contain',
                                        borderRadius: 8
                                    }}
                                />
                                <Button
                                    fullWidth
                                    mt="md"
                                    color="teal"
                                    leftSection={<IconSparkles size={16} />}
                                    onClick={handleExtract}
                                >
                                    AI로 분석하기
                                </Button>
                            </Paper>
                        )}

                        {error && (
                            <Alert color="red" icon={<IconAlertCircle size={16} />}>
                                {error}
                            </Alert>
                        )}
                    </Stack>
                );

            case 'extracting':
                return (
                    <Stack gap="md" align="center" py="xl">
                        <IconSparkles size={48} color="#20c997" className="animate-pulse" />
                        <Text size="lg" c="white" fw={500}>AI가 영수증을 분석하고 있습니다...</Text>
                        <Progress value={100} animated color="teal" w="100%" />
                        <Text size="xs" c="dimmed">잠시만 기다려주세요</Text>
                    </Stack>
                );

            case 'review':
                return (
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text size="sm" c="white" fw={500}>
                                추출된 식자재 ({items.length}개)
                            </Text>
                            <Button
                                variant="subtle"
                                color="teal"
                                size="xs"
                                leftSection={<IconEdit size={14} />}
                                onClick={handleAddItem}
                            >
                                항목 추가
                            </Button>
                        </Group>

                        {error && (
                            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                                {error}
                            </Alert>
                        )}

                        <Paper p="xs" radius="md" bg="rgba(0,0,0,0.2)" style={{ maxHeight: 400, overflow: 'auto' }}>
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th style={{ color: '#9CA3AF' }}>식자재명</Table.Th>
                                        <Table.Th style={{ color: '#9CA3AF' }}>가격</Table.Th>
                                        <Table.Th style={{ color: '#9CA3AF' }}>수량</Table.Th>
                                        <Table.Th style={{ color: '#9CA3AF' }}>단위</Table.Th>
                                        <Table.Th style={{ width: 40 }}></Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {items.map((item, index) => (
                                        <Table.Tr key={index}>
                                            <Table.Td>
                                                <TextInput
                                                    value={item.name}
                                                    onChange={(e) => handleItemChange(index, 'name', e.currentTarget.value)}
                                                    size="xs"
                                                    styles={{ input: { backgroundColor: '#374151', color: 'white', border: 'none' } }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <NumberInput
                                                    value={item.price}
                                                    onChange={(v) => handleItemChange(index, 'price', v || 0)}
                                                    size="xs"
                                                    thousandSeparator
                                                    suffix="원"
                                                    styles={{ input: { backgroundColor: '#374151', color: 'white', border: 'none' } }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <NumberInput
                                                    value={item.quantity || 1}
                                                    onChange={(v) => handleItemChange(index, 'quantity', v || 1)}
                                                    size="xs"
                                                    min={0.01}
                                                    step={0.1}
                                                    decimalScale={2}
                                                    styles={{ input: { backgroundColor: '#374151', color: 'white', border: 'none', width: 60 } }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    value={item.unit || 'kg'}
                                                    onChange={(e) => handleItemChange(index, 'unit', e.currentTarget.value)}
                                                    size="xs"
                                                    styles={{ input: { backgroundColor: '#374151', color: 'white', border: 'none', width: 50 } }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(index)}
                                                >
                                                    <IconTrash size={14} />
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Paper>

                        <Group justify="space-between" mt="md">
                            <Button variant="subtle" color="gray" onClick={() => setStep('upload')}>
                                다시 업로드
                            </Button>
                            <Button
                                color="teal"
                                leftSection={<IconCheck size={16} />}
                                onClick={handleProcess}
                                disabled={items.length === 0}
                            >
                                원가 업데이트
                            </Button>
                        </Group>
                    </Stack>
                );

            case 'processing':
                return (
                    <Stack gap="md" align="center" py="xl">
                        <LoadingOverlay visible={true} />
                        <Text size="lg" c="white" fw={500}>원가를 업데이트하고 있습니다...</Text>
                        <Progress value={100} animated color="teal" w="100%" />
                    </Stack>
                );

            case 'complete':
                return (
                    <Stack gap="md">
                        <Paper p="lg" radius="md" bg="rgba(32, 201, 151, 0.1)" style={{ border: '1px solid #20c99740' }}>
                            <Stack gap="sm" align="center">
                                <IconCheck size={48} color="#20c997" />
                                <Text size="lg" c="white" fw={700}>업데이트 완료!</Text>
                            </Stack>
                        </Paper>

                        {result && (
                            <Stack gap="sm">
                                {/* 매칭된 항목 */}
                                {result.matched.length > 0 && (
                                    <Paper p="md" radius="md" bg="rgba(0,0,0,0.2)">
                                        <Text size="sm" c="white" fw={500} mb="xs">
                                            ✅ 업데이트된 식자재 ({result.matched.length})
                                        </Text>
                                        <Stack gap={4}>
                                            {result.matched.map((m: any, i: number) => (
                                                <Group key={i} justify="space-between">
                                                    <Text size="sm" c="gray.3">{m.item.name}</Text>
                                                    <Badge color="teal" variant="light">
                                                        {m.item.price.toLocaleString()}원
                                                    </Badge>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}

                                {/* 매칭 안 된 항목 */}
                                {result.unmatched.length > 0 && (
                                    <Paper p="md" radius="md" bg="rgba(255, 212, 59, 0.1)">
                                        <Text size="sm" c="white" fw={500} mb="xs">
                                            ⚠️ 등록되지 않은 식자재 ({result.unmatched.length})
                                        </Text>
                                        <Text size="xs" c="dimmed" mb="xs">
                                            식자재 관리에서 먼저 등록해주세요.
                                        </Text>
                                        <Stack gap={4}>
                                            {result.unmatched.map((item: any, i: number) => (
                                                <Group key={i} justify="space-between">
                                                    <Text size="sm" c="gray.3">{item.name}</Text>
                                                    <Badge color="yellow" variant="light">
                                                        {item.price.toLocaleString()}원
                                                    </Badge>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}

                                {/* 마진 위험 알림 */}
                                {result.alerts.length > 0 && (
                                    <Paper p="md" radius="md" bg="rgba(255, 107, 107, 0.1)" style={{ border: '1px solid #fa525280' }}>
                                        <Text size="sm" c="white" fw={500} mb="xs">
                                            🔥 마진 위험 메뉴 ({result.alerts.length})
                                        </Text>
                                        <Stack gap={4}>
                                            {result.alerts.map((alert: any, i: number) => (
                                                <Text key={i} size="sm" c="red.3">
                                                    • {alert.message}
                                                </Text>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        )}

                        <Button fullWidth color="teal" onClick={handleClose}>
                            완료
                        </Button>
                    </Stack>
                );
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <IconReceipt size={20} />
                    <Text fw={700}>라이브 원가 엔진</Text>
                    <Badge color="pink" variant="light" size="sm">AI</Badge>
                </Group>
            }
            size="lg"
            centered
            styles={{
                header: { backgroundColor: '#1F2937', color: 'white' },
                body: { backgroundColor: '#1F2937' },
                close: { color: 'gray' }
            }}
        >
            {renderStep()}
        </Modal>
    );
}
