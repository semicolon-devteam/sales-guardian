'use client';

import { Group, Text, UnstyledButton, Center, Stack, Box, Container } from '@mantine/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    IconChartPie,
    IconCash,
    IconTargetArrow,
    IconCalendarStats,
    IconUsers,
    IconMessageCircle,
    IconReceipt
} from '@tabler/icons-react';
import { useStore } from '../_contexts/store-context';

export function MobileBottomNav() {
    const pathname = usePathname();
    const { role } = useStore();

    // 메뉴 활성화 체크 (그룹 내 어떤 경로든 활성화)
    const isActive = (hrefs: string[]) => hrefs.some(h => pathname === h);

    // Define menus based on role
    const getMenuItems = () => {
        if (role === 'staff') {
            return [
                { icon: IconMessageCircle, label: '타임라인', href: '/timeline', hrefs: ['/timeline'] },
                { icon: IconReceipt, label: '지출관리', href: '/expenses', hrefs: ['/expenses'] },
            ];
        }

        // Owner / Manager - 5개로 통합
        return [
            { icon: IconChartPie, label: '대시보드', href: '/dashboard', hrefs: ['/dashboard'] },
            { icon: IconCash, label: '매출/지출', href: '/sales', hrefs: ['/sales', '/expenses'] },
            { icon: IconTargetArrow, label: '전략실', href: '/strategy', hrefs: ['/strategy', '/marketing'] },
            { icon: IconCalendarStats, label: '일정', href: '/calendar', hrefs: ['/calendar', '/timeline'] },
            { icon: IconUsers, label: '직원', href: '/staff', hrefs: ['/staff'] },
        ];
    };

    const items = getMenuItems();

    // Use specific container styling for Mobile Bottom Bar
    return (
        <Box
            hiddenFrom="sm" // Hidden on PC
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: '#1F2937', // Dark Navy for consistency
                borderTop: '1px solid #374151',
                paddingBottom: 'env(safe-area-inset-bottom)',
                height: '65px'
            }}
        >
            <Container size="sm" p={0} h="100%">
                <Group justify="space-around" h="100%" align="center" gap={0} px="xs">
                    {items.map((item) => (
                        <NavButton
                            key={item.href}
                            icon={<item.icon size={24} stroke={1.5} />}
                            label={item.label}
                            href={item.href}
                            active={isActive(item.hrefs)}
                        />
                    ))}
                </Group>
            </Container>
        </Box>
    );
}

function NavButton({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <UnstyledButton component={Link} href={href} style={{ height: '100%', flex: 1 }}>
            <Center style={{ height: '100%' }}>
                <Stack gap={4} align="center">
                    <Box c={active ? 'blue.4' : 'gray.5'} style={{ transition: 'color 0.2s' }}>
                        {icon}
                    </Box>
                    <Text size="10px" fw={active ? 600 : 500} c={active ? 'blue.4' : 'gray.5'}>
                        {label}
                    </Text>
                </Stack>
            </Center>
        </UnstyledButton>
    );
}
