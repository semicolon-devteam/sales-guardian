'use client';

import { useState, useEffect } from 'react';
import { Button, Paper, Text, Group, Transition, CloseButton, Stack } from '@mantine/core';
import { IconDeviceMobile, IconShare } from '@tabler/icons-react';
import { useOs } from '@mantine/hooks';

export function InstallPrompt() {
    const os = useOs();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // iOS Detection
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        if (isIOSDevice) {
            // Show prompt for iOS after a small delay if not standalone
            // In real app, might want to check cookie to not show every time
            const lastDismissed = localStorage.getItem('a2hs_dismissed');
            if (!lastDismissed) {
                setTimeout(() => setShowPrompt(true), 3000);
            }
        }

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            const lastDismissed = localStorage.getItem('a2hs_dismissed');
            if (!lastDismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowPrompt(false);
            }
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Hide for 24 hours or permanently? For MVP, just hide until refresh/revisit or per session.
        // Let's store timestamp to hide for a while.
        localStorage.setItem('a2hs_dismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div style={{ position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 1000 }}>
            <Transition mounted={showPrompt} transition="slide-up" duration={400} timingFunction="ease">
                {(styles) => (
                    <Paper shadow="xl" radius="md" p="md" withBorder style={styles} bg="white">
                        <Stack gap="sm">
                            <Group justify="space-between" align="start">
                                <Group>
                                    <IconDeviceMobile size={24} color="#20c997" />
                                    <div>
                                        <Text fw={700}>앱으로 설치하고 더 편하게 쓰세요!</Text>
                                        <Text size="xs" c="dimmed">홈 화면에서 바로 접속하고 알림도 받아보세요.</Text>
                                    </div>
                                </Group>
                                <CloseButton onClick={handleDismiss} />
                            </Group>

                            {isIOS ? (
                                <Paper bg="gray.0" p="xs" radius="sm">
                                    <Group gap="xs">
                                        <Text size="sm">1. 브라우저 하단 <IconShare size={14} style={{ display: 'inline' }} /> 공유 버튼 누르기</Text>
                                    </Group>
                                    <Text size="sm">2. <strong>&apos;홈 화면에 추가&apos;</strong> 선택하기</Text>
                                </Paper>
                            ) : (
                                <Button fullWidth color="teal" onClick={handleInstallClick}>
                                    앱 설치하기
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                )}
            </Transition>
        </div>
    );
}
