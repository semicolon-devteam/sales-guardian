'use client';

import { Tabs, Box } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';

interface TabItem {
    value: string;
    label: string;
    href: string;
}

interface TabNavigationProps {
    tabs: TabItem[];
}

export function TabNavigation({ tabs }: TabNavigationProps) {
    const pathname = usePathname();
    const router = useRouter();

    // 현재 경로에 해당하는 탭 찾기
    const activeTab = tabs.find(tab => pathname === tab.href)?.value || tabs[0].value;

    return (
        <Box mb="lg">
            <Tabs
                value={activeTab}
                onChange={(value) => {
                    const tab = tabs.find(t => t.value === value);
                    if (tab) router.push(tab.href);
                }}
                color="blue"
                variant="default"
            >
                <Tabs.List style={{ borderBottom: '1px solid #374151' }}>
                    {tabs.map(tab => (
                        <Tabs.Tab
                            key={tab.value}
                            value={tab.value}
                            style={{
                                color: activeTab === tab.value ? '#60A5FA' : '#9CA3AF',
                                fontWeight: activeTab === tab.value ? 600 : 500,
                                borderColor: activeTab === tab.value ? '#60A5FA' : 'transparent',
                            }}
                        >
                            {tab.label}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
            </Tabs>
        </Box>
    );
}

// 탭 그룹 정의
export const TAB_GROUPS = {
    transaction: [
        { value: 'sales', label: '매출입력', href: '/sales' },
        { value: 'expenses', label: '지출관리', href: '/expenses' },
    ],
    strategy: [
        { value: 'strategy', label: '수익설계사', href: '/strategy' },
        { value: 'marketing', label: '마케팅', href: '/marketing' },
    ],
    schedule: [
        { value: 'calendar', label: '캘린더', href: '/calendar' },
        { value: 'timeline', label: '타임라인', href: '/timeline' },
    ],
};
