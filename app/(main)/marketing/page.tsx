'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Title, Text, Stack, Paper, Group, ThemeIcon, Badge, Button,
    SimpleGrid, ScrollArea, TextInput, Skeleton, Center, Loader, Box, Divider
} from '@mantine/core';
import {
    IconPalette, IconSparkles, IconRefresh, IconBulb, IconWand,
    IconChevronRight, IconAlertCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useStore } from '../_contexts/store-context';
import { useSearchParams } from 'next/navigation';

import { TriggerCard, TriggerBadge } from './_components/TriggerCard';
import { CopyResultCard, CopyResultSkeleton } from './_components/CopyResultCard';
import {
    fetchMarketingTriggers,
    generateMarketingCopy,
    type MarketingTrigger,
    type GeneratedCopy,
    type MarketingContext
} from './actions';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function MarketingPage() {
    const { currentStore } = useStore();
    const searchParams = useSearchParams();

    // URL 파라미터에서 메뉴 정보 가져오기 (strategy 페이지에서 연결 시)
    const menuFromUrl = searchParams.get('menu');
    const menuPriceFromUrl = searchParams.get('price');
    const menuMarginFromUrl = searchParams.get('margin');

    // State
    const [triggers, setTriggers] = useState<MarketingTrigger[]>([]);
    const [selectedTrigger, setSelectedTrigger] = useState<MarketingTrigger | null>(null);
    const [copies, setCopies] = useState<GeneratedCopy[]>([]);
    const [customPrompt, setCustomPrompt] = useState('');

    const [loadingTriggers, setLoadingTriggers] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Load triggers on mount
    const loadTriggers = useCallback(async () => {
        setLoadingTriggers(true);
        try {
            const result = await fetchMarketingTriggers(currentStore?.id);
            if (result.success && result.data) {
                let allTriggers = result.data;

                // URL에서 메뉴가 전달된 경우 해당 메뉴를 트리거로 추가
                if (menuFromUrl) {
                    const urlMenuTrigger: MarketingTrigger = {
                        id: `url-menu-${menuFromUrl}`,
                        type: 'menu',
                        label: `${menuFromUrl} ${menuMarginFromUrl ? `(마진 ${menuMarginFromUrl}%)` : ''}`,
                        description: '메뉴 전략 페이지에서 선택한 메뉴',
                        icon: '📣',
                        color: 'teal',
                        priority: 0,
                        data: {
                            menu: {
                                name: menuFromUrl,
                                price: menuPriceFromUrl ? Number(menuPriceFromUrl) : 0,
                                margin: menuMarginFromUrl ? Number(menuMarginFromUrl) : 0
                            }
                        }
                    };
                    allTriggers = [urlMenuTrigger, ...allTriggers];
                    setSelectedTrigger(urlMenuTrigger);
                }

                setTriggers(allTriggers);

                // 기본 선택 (URL 메뉴가 없을 때)
                if (!menuFromUrl && allTriggers.length > 0 && !selectedTrigger) {
                    setSelectedTrigger(allTriggers[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load triggers:', error);
            notifications.show({
                title: '로드 실패',
                message: '마케팅 트리거를 불러오는데 실패했습니다.',
                color: 'red'
            });
        } finally {
            setLoadingTriggers(false);
        }
    }, [currentStore?.id, menuFromUrl, menuPriceFromUrl, menuMarginFromUrl]);

    useEffect(() => {
        if (currentStore) {
            loadTriggers();
        }
    }, [currentStore, loadTriggers]);

    // Generate marketing copies
    const handleGenerate = async () => {
        if (!selectedTrigger) {
            notifications.show({
                title: '선택 필요',
                message: '홍보할 상황을 선택해주세요.',
                color: 'yellow'
            });
            return;
        }

        setGenerating(true);
        setCopies([]);

        try {
            const context: MarketingContext = {
                storeName: currentStore?.name,
                triggerType: selectedTrigger.type,
                triggerReason: selectedTrigger.description,
                customPrompt: customPrompt || undefined
            };

            // 메뉴 정보 추가
            if (selectedTrigger.type === 'menu' && selectedTrigger.data?.menu) {
                const menu = selectedTrigger.data.menu;
                context.menuName = menu.name;
                context.menuPrice = menu.price;
                context.menuMargin = menu.margin;
            }

            // 날씨 정보 추가
            if (selectedTrigger.type === 'weather' && selectedTrigger.data) {
                context.weatherInfo = selectedTrigger.label;
            }

            const result = await generateMarketingCopy(context);

            if (result.success && result.data) {
                setCopies(result.data);
                notifications.show({
                    title: '생성 완료!',
                    message: `${result.data.length}개 채널의 홍보 문구가 생성되었습니다.`,
                    color: 'teal'
                });
            } else {
                throw new Error(result.error || '문구 생성 실패');
            }
        } catch (error: any) {
            console.error('Generation failed:', error);
            notifications.show({
                title: '생성 실패',
                message: error.message || '문구 생성 중 오류가 발생했습니다.',
                color: 'red'
            });
        } finally {
            setGenerating(false);
        }
    };

    // Early return for loading
    if (!currentStore) {
        return (
            <Center h="50vh">
                <Loader color="teal" />
            </Center>
        );
    }

    return (
        <Stack gap="xl" pb={100}>
            {/* Tab Navigation */}
            <TabNavigation tabs={TAB_GROUPS.strategy} />

            {/* Header */}
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
                    border: '1px solid rgba(147, 51, 234, 0.3)'
                }}
            >
                <Group gap="md" align="flex-start">
                    <ThemeIcon
                        size={60}
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'grape', to: 'indigo' }}
                    >
                        <IconPalette size={32} />
                    </ThemeIcon>
                    <Stack gap={4} style={{ flex: 1 }}>
                        <Group gap="xs">
                            <Title order={2} c="white">AI 마케팅 스튜디오</Title>
                            <Badge color="grape" variant="light" size="lg">BETA</Badge>
                        </Group>
                        <Text c="gray.4" size="sm">
                            데이터 분석 결과를 기반으로 매출을 부르는 홍보 문구를 자동 생성합니다.
                        </Text>
                        <Text c="dimmed" size="xs">
                            복사해서 배달앱, SNS, 매장 POP에 바로 붙여넣기하세요!
                        </Text>
                    </Stack>
                </Group>
            </Paper>

            {/* Step 1: Select Trigger */}
            <Stack gap="md">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="grape" size="sm">
                        <IconBulb size={14} />
                    </ThemeIcon>
                    <Text fw={700} c="white">1. 무엇을 홍보할까요?</Text>
                </Group>

                {loadingTriggers ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} height={80} radius="lg" />
                        ))}
                    </SimpleGrid>
                ) : triggers.length === 0 ? (
                    <Paper p="lg" radius="lg" bg="#1F2937" style={{ border: '1px solid #374151' }}>
                        <Group gap="sm">
                            <IconAlertCircle size={20} color="#fbbf24" />
                            <Text c="gray.4" size="sm">
                                트리거를 불러올 수 없습니다. 메뉴 전략 페이지에서 메뉴 데이터를 먼저 입력해주세요.
                            </Text>
                        </Group>
                    </Paper>
                ) : (
                    <>
                        {/* Badge Grid - Quick Selection */}
                        <ScrollArea type="never" offsetScrollbars={false}>
                            <Group gap="xs" wrap="nowrap" pb="xs">
                                {triggers.map((trigger) => (
                                    <TriggerBadge
                                        key={trigger.id}
                                        trigger={trigger}
                                        selected={selectedTrigger?.id === trigger.id}
                                        onSelect={setSelectedTrigger}
                                    />
                                ))}
                            </Group>
                        </ScrollArea>

                        {/* Detailed Card for Selected */}
                        {selectedTrigger && (
                            <TriggerCard
                                trigger={selectedTrigger}
                                selected={true}
                                onSelect={() => { }}
                            />
                        )}
                    </>
                )}
            </Stack>

            {/* Step 2: Custom Prompt (Optional) */}
            <Stack gap="xs">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="indigo" size="sm">
                        <IconWand size={14} />
                    </ThemeIcon>
                    <Text fw={700} c="white">2. 추가 요청 (선택)</Text>
                </Group>
                <TextInput
                    placeholder="예: 리뷰 이벤트 강조해줘, 더 유머러스하게, 젊은 층 타겟으로..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    styles={{
                        input: {
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            color: 'white'
                        }
                    }}
                />
            </Stack>

            {/* Generate Button */}
            <Button
                size="lg"
                radius="xl"
                variant="gradient"
                gradient={{ from: 'grape', to: 'indigo' }}
                leftSection={<IconSparkles size={20} />}
                loading={generating}
                onClick={handleGenerate}
                disabled={!selectedTrigger || loadingTriggers}
                fullWidth
            >
                {generating ? 'AI가 문구를 작성하고 있어요...' : 'AI 홍보 문구 생성하기'}
            </Button>

            {/* Step 3: Results */}
            {(copies.length > 0 || generating) && (
                <Stack gap="md">
                    <Divider color="gray.8" />
                    <Group gap="xs">
                        <ThemeIcon variant="light" color="teal" size="sm">
                            <IconSparkles size={14} />
                        </ThemeIcon>
                        <Text fw={700} c="white">AI가 작성한 홍보 문구</Text>
                        {copies.length > 0 && (
                            <Badge color="teal" variant="light" size="sm">
                                {copies.length}개 채널
                            </Badge>
                        )}
                    </Group>

                    {generating ? (
                        <Stack gap="md">
                            {[1, 2, 3, 4].map((i) => (
                                <CopyResultSkeleton key={i} />
                            ))}
                        </Stack>
                    ) : (
                        <Stack gap="md">
                            {copies.map((copy, index) => (
                                <CopyResultCard key={`${copy.channel}-${index}`} copy={copy} />
                            ))}
                        </Stack>
                    )}

                    {/* Regenerate Button */}
                    {copies.length > 0 && !generating && (
                        <Button
                            variant="light"
                            color="gray"
                            leftSection={<IconRefresh size={16} />}
                            onClick={handleGenerate}
                        >
                            다시 생성하기
                        </Button>
                    )}
                </Stack>
            )}

            {/* Tips */}
            {copies.length === 0 && !generating && (
                <Paper
                    p="md"
                    radius="lg"
                    bg="rgba(79, 70, 229, 0.1)"
                    style={{ border: '1px solid rgba(79, 70, 229, 0.3)' }}
                >
                    <Stack gap="sm">
                        <Group gap="xs">
                            <IconBulb size={16} color="#a78bfa" />
                            <Text fw={600} c="indigo.3" size="sm">사용 팁</Text>
                        </Group>
                        <Stack gap={4}>
                            <Text size="xs" c="dimmed">
                                1. 메뉴 전략 페이지에서 [📣 이 메뉴 홍보하기] 버튼을 누르면 해당 메뉴로 바로 연결됩니다.
                            </Text>
                            <Text size="xs" c="dimmed">
                                2. 날씨 기반 트리거는 자동으로 배달 수요 증가 시점을 감지합니다.
                            </Text>
                            <Text size="xs" c="dimmed">
                                3. 생성된 문구는 각 채널 특성에 맞게 최적화되어 있어요.
                            </Text>
                            <Text size="xs" c="dimmed">
                                4. [복사하기] 버튼으로 클립보드에 복사한 뒤 바로 붙여넣기하세요!
                            </Text>
                        </Stack>
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
}
