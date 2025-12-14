'use client';

import { Container, Stack, Title, Text, Group, Select, Button } from '@mantine/core';
import { TimelinePostEditor } from '../_components/TimelinePostEditor';
import { TimelineFeed } from '../_components/TimelineFeed';
import { TimelineHeader } from '../_components/TimelineHeader';
import { useStore } from '../_contexts/store-context';
import { useState } from 'react';
import { TabNavigation, TAB_GROUPS } from '../_components/TabNavigation';

export default function TimelinePage() {
    const { currentStore, myStores, setCurrentStore, isLoading, createDefaultStore } = useStore();
    const [feedTrigger, setFeedTrigger] = useState(0);

    const refreshFeed = () => setFeedTrigger(prev => prev + 1);

    const handleCreateStore = async () => {
        const error = await createDefaultStore();
        if (error) {
            alert(`매장 생성 실패: ${error}`);
        } else {
            alert('1호점이 생성되었습니다! 환영합니다. 🎉');
        }
    };

    if (isLoading) return null;

    if (!currentStore) {
        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="md" mt={100}>
                    <Text ta="center" size="lg" fw={700}>아직 매장이 없습니다.</Text>
                    <Text ta="center" c="dimmed" size="sm">
                        매장을 생성하고 타임라인을 시작해보세요.
                    </Text>
                    <Button onClick={handleCreateStore} variant="filled" color="teal">
                        1호점 바로 만들기 🚀
                    </Button>
                </Stack>
            </Container>
        );
    }

    return (
        <Container size="sm" p={0}>
            <Stack gap="lg">
                {/* Tab Navigation */}
                <TabNavigation tabs={TAB_GROUPS.schedule} />

                {/* Header / Store Switcher */}
                <TimelineHeader />

                {/* Write Widget */}
                <TimelinePostEditor onPostCreated={refreshFeed} />

                {/* Feed */}
                <TimelineFeed keyTrigger={feedTrigger} />
            </Stack>
        </Container>
    );
}
