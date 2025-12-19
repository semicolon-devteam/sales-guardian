'use client';

import { Paper, Text, Stack, Group, ThemeIcon, Button, ScrollArea, Avatar, Box, TextInput, ActionIcon } from '@mantine/core';
import { IconRobot, IconSparkles, IconSend } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';
import { useTypewriter } from '@/app/_shared/hooks/useTypewriter';

type AiMessage = {
    id: string;
    role: 'ai' | 'user';
    text: string;
};

type ActionChip = {
    id: string;
    label: string;
    action: () => void;
};

interface AiCommandConsoleProps {
    initialAlerts?: { message: string, type: string }[];
    contextData?: any; // Received from parent (Server Component)
}

import { askAiAssistant } from '../ai-actions';

export function AiCommandConsole({ initialAlerts = [], contextData = {} }: AiCommandConsoleProps) {
    const [messages, setMessages] = useState<AiMessage[]>([
        { id: 'init', role: 'ai', text: '사장님, 좋은 아침입니다. ☀️\n오늘 매장 상태를 분석할 준비가 되었습니다.' }
    ]);

    const [alertsProcessed, setAlertsProcessed] = useState(false);

    useEffect(() => {
        if (initialAlerts.length > 0 && !alertsProcessed) {
            const alertText = initialAlerts.map(a => `🔔 [알림] ${a.message}`).join('\n');
            const newMsg: AiMessage = {
                id: `alert-${Date.now()}`,
                role: 'ai',
                text: `확인해야 할 사항이 있습니다:\n${alertText}`
            };
            setMessages(prev => [...prev, newMsg]);
            setAlertsProcessed(true);
        }
    }, [initialAlerts, alertsProcessed]);

    const [typingText, setTypingText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Loading state for API
    const viewport = useRef<HTMLDivElement>(null);

    // Initial typewriter effect for the *last* AI message
    const { displayedText, isComplete } = useTypewriter(typingText, 20);

    // Auto-scroll logic
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
            setIsTyping(true);
        } else {
            setIsTyping(false);
        }
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        // 1. Add User Message
        const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        // 2. Call Server Action
        try {
            // Include alerts in context if not strictly passed
            const enrichedContext = { ...contextData, currentAlerts: initialAlerts };
            const response = await askAiAssistant(text, enrichedContext);

            const aiMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response.text || "죄송합니다. 응답을 받을 수 없습니다."
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
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

    const handleChipClick = (label: string) => {
        handleSendMessage(label);
    };

    const chips: ActionChip[] = [
        {
            id: 'cost',
            label: '식자재 비용 분석해줘 🥩',
            action: () => handleChipClick('식자재 비용 분석해줘')
        },
        {
            id: 'predict',
            label: '오늘 매출 예측해줘 🔮',
            action: () => handleChipClick('오늘 매출 예측해줘')
        },
        {
            id: 'praise',
            label: '칭찬해줘 👏',
            action: () => handleChipClick('칭찬해줘')
        }
    ];

    // Input handling state
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
                    <ThemeIcon variant="light" color="indigo" radius="xl" size="sm">
                        <IconRobot size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={700} c="indigo.2" tt="uppercase" style={{ letterSpacing: '1px' }}>
                        AI Command Center
                    </Text>
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
                </Stack>
            </ScrollArea>

            {/* Input / Chips Area */}
            <Box mt="md" pt="sm" style={{ borderTop: '1px solid #374151' }}>
                {isLoading ? (
                    <Text size="sm" c="dimmed" ta="center" className="animate-pulse">
                        <IconSparkles size={16} style={{ marginRight: 4, display: 'inline' }} />
                        AI가 분석 중입니다...
                    </Text>
                ) : (
                    <>
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
                                rightSection={
                                    <ActionIcon
                                        variant="filled"
                                        color="indigo"
                                        size="sm"
                                        onClick={() => {
                                            handleSendMessage(inputValue);
                                            setInputValue('');
                                        }}
                                    >
                                        <IconSend size={14} />
                                    </ActionIcon>
                                }
                            />
                        </Group>
                        <Text size="xs" c="dimmed" mb="xs" fw={600}>추천 질문:</Text>
                        <Group gap="xs">
                            {chips.map(chip => (
                                <Button
                                    key={chip.id}
                                    variant="light"
                                    color="indigo"
                                    size="compact-sm"
                                    radius="xl"
                                    onClick={chip.action}
                                    style={{ border: '1px solid rgba(79, 70, 229, 0.2)' }}
                                >
                                    {chip.label}
                                </Button>
                            ))}
                        </Group>
                    </>
                )}
            </Box>
        </Paper>
    );
}
