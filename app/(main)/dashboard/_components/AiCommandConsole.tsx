'use client';

import { Paper, Text, Stack, Group, ThemeIcon, Button, ScrollArea, Avatar, Box, TextInput, ActionIcon, Skeleton } from '@mantine/core';
import { IconRobot, IconSparkles, IconSend, IconBolt } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';
import { useTypewriter } from '@/app/_shared/hooks/useTypewriter';
import { askAiAssistant, generateSmartSuggestions, type SmartSuggestion } from '../ai-actions';

type AiMessage = {
    id: string;
    role: 'ai' | 'user';
    text: string;
};

interface AiCommandConsoleProps {
    initialAlerts?: { message: string, type: string }[];
    contextData?: any;
    storeId?: string;
}

export function AiCommandConsole({ initialAlerts = [], contextData = {}, storeId }: AiCommandConsoleProps) {
    const [messages, setMessages] = useState<AiMessage[]>([
        { id: 'init', role: 'ai', text: '사장님, 좋은 아침입니다! ☀️\n오늘 매장 상태를 분석할 준비가 되었습니다.\n\n실시간 원가 데이터와 연동되어 더 정확한 분석이 가능해요!' }
    ]);

    // Smart Suggestions (동적 추천 질문)
    const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);

    // Load smart suggestions on mount
    useEffect(() => {
        const loadSuggestions = async () => {
            setSuggestionsLoading(true);
            try {
                const smartSuggestions = await generateSmartSuggestions(storeId);
                setSuggestions(smartSuggestions);
            } catch (error) {
                // Fallback to default suggestions
                setSuggestions([
                    { id: 'cost', label: '식자재 비용 분석해줘 🥩', query: '식자재 비용을 분석해줘', priority: 1, icon: '🥩' },
                    { id: 'tips', label: '수익 개선 팁 알려줘 💡', query: '수익을 개선할 수 있는 팁을 알려줘', priority: 2, icon: '💡' },
                    { id: 'menu', label: '메뉴 전략 조언해줘 📊', query: '메뉴 전략에 대해 조언해줘', priority: 3, icon: '📊' }
                ]);
            } finally {
                setSuggestionsLoading(false);
            }
        };
        loadSuggestions();
    }, [storeId]);

    useEffect(() => {
        if (initialAlerts.length > 0) {
            const alertText = initialAlerts.map(a => `🔔 [알림] ${a.message}`).join('\n');
            const newMsg: AiMessage = { id: `alert-${Date.now()}`, role: 'ai', text: `확인해야 할 사항이 있습니다:\n${alertText}` };
            setMessages(prev => {
                // 이미 alert 메시지가 있으면 추가하지 않음
                if (prev.some(m => m.id.startsWith('alert-'))) return prev;
                return [...prev, newMsg];
            });
        }
    }, []);

    const [typingText, setTypingText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);

    const { displayedText, isComplete } = useTypewriter(typingText, 20);

    // Auto-scroll
    useEffect(() => {
        if (viewport.current) {
            viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, displayedText, isLoading]);

    // Sync typing text
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'ai') {
            setTypingText(lastMsg.text);
        }
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const enrichedContext = { ...contextData, storeId, currentAlerts: initialAlerts };
            const response = await askAiAssistant(text, enrichedContext);

            const aiMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response.text || "죄송합니다. 응답을 받을 수 없습니다."
            };
            setMessages(prev => [...prev, aiMsg]);

            // Refresh suggestions after each conversation
            const newSuggestions = await generateSmartSuggestions(storeId);
            setSuggestions(newSuggestions);
        } catch {
            const errorMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: "죄송합니다. 오류가 발생했습니다."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const [inputValue, setInputValue] = useState('');

    return (
        <Paper
            h="100%"
            radius="lg"
            p="md"
            style={{
                background: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
                border: '1px solid #374151',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header */}
            <Group justify="space-between" mb="md" align="center">
                <Group gap="xs">
                    <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'grape' }} radius="xl" size="sm">
                        <IconRobot size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={700} c="indigo.2" tt="uppercase" style={{ letterSpacing: '1px' }}>
                        AI Command Center
                    </Text>
                    <ThemeIcon variant="light" color="teal" size="xs" radius="xl">
                        <IconBolt size={10} />
                    </ThemeIcon>
                </Group>
                <ThemeIcon variant="subtle" color="gray" size="sm">
                    <IconSparkles size={14} />
                </ThemeIcon>
            </Group>

            {/* Chat Area */}
            <ScrollArea style={{ flex: 1 }} scrollbarSize={6} viewportRef={viewport}>
                <Stack gap="md" pb="xs">
                    {messages.map((msg, index) => {
                        const isLastAi = index === messages.length - 1 && msg.role === 'ai';
                        return (
                            <Group key={msg.id} align="flex-start" justify={msg.role === 'user' ? 'flex-end' : 'flex-start'} gap="xs">
                                {msg.role === 'ai' && (
                                    <Avatar size="sm" radius="xl" bg="indigo" color="white">AI</Avatar>
                                )}
                                <Box
                                    style={{
                                        maxWidth: '85%',
                                        padding: '10px 14px',
                                        borderRadius: '16px',
                                        borderTopLeftRadius: msg.role === 'ai' ? '2px' : '16px',
                                        borderTopRightRadius: msg.role === 'user' ? '2px' : '16px',
                                        backgroundColor: msg.role === 'user' ? '#4f46e5' : '#374151',
                                        color: 'white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Text size="sm" style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                                        {isLastAi ? displayedText : msg.text}
                                        {isLastAi && !isComplete && <span className="animate-pulse">|</span>}
                                    </Text>
                                </Box>
                            </Group>
                        );
                    })}
                    {isLoading && (
                        <Group align="flex-start" gap="xs">
                            <Avatar size="sm" radius="xl" bg="indigo" color="white">AI</Avatar>
                            <Box
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '16px',
                                    borderTopLeftRadius: '2px',
                                    backgroundColor: '#374151'
                                }}
                            >
                                <Group gap={4}>
                                    <IconSparkles size={14} className="animate-spin" color="#818cf8" />
                                    <Text size="sm" c="indigo.3">분석 중...</Text>
                                </Group>
                            </Box>
                        </Group>
                    )}
                </Stack>
            </ScrollArea>

            {/* Input / Chips Area */}
            <Box mt="md" pt="sm" style={{ borderTop: '1px solid #374151' }}>
                <Group gap={8} mb="sm">
                    <TextInput
                        placeholder="무엇이든 물어보세요..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                handleSendMessage(inputValue);
                                setInputValue('');
                            }
                        }}
                        style={{ flex: 1 }}
                        styles={{ input: { backgroundColor: '#374151', color: 'white', borderColor: 'transparent' } }}
                        disabled={isLoading}
                        rightSection={
                            <ActionIcon
                                variant="filled"
                                color="indigo"
                                size="sm"
                                onClick={() => {
                                    handleSendMessage(inputValue);
                                    setInputValue('');
                                }}
                                disabled={isLoading}
                            >
                                <IconSend size={14} />
                            </ActionIcon>
                        }
                    />
                </Group>

                <Group justify="space-between" align="center" mb="xs">
                    <Text size="xs" c="dimmed" fw={600}>스마트 추천:</Text>
                    {suggestions.some(s => s.priority === 1) && (
                        <Text size="xs" c="red.4" fw={600}>주의 필요</Text>
                    )}
                </Group>

                {suggestionsLoading ? (
                    <Group gap="xs">
                        <Skeleton height={28} width={120} radius="xl" />
                        <Skeleton height={28} width={100} radius="xl" />
                        <Skeleton height={28} width={140} radius="xl" />
                    </Group>
                ) : (
                    <Group gap="xs" wrap="wrap">
                        {suggestions.map(suggestion => (
                            <Button
                                key={suggestion.id}
                                variant={suggestion.priority === 1 ? 'filled' : 'light'}
                                color={suggestion.priority === 1 ? 'red' : 'indigo'}
                                size="compact-sm"
                                radius="xl"
                                onClick={() => handleSendMessage(suggestion.query)}
                                disabled={isLoading}
                                style={{
                                    border: suggestion.priority === 1
                                        ? '1px solid rgba(239, 68, 68, 0.5)'
                                        : '1px solid rgba(79, 70, 229, 0.2)'
                                }}
                            >
                                {suggestion.label}
                            </Button>
                        ))}
                    </Group>
                )}
            </Box>
        </Paper>
    );
}
