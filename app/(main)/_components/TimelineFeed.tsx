'use client';

import { useEffect, useState } from 'react';
import { Card, Group, Avatar, Text, Stack, ActionIcon, Badge, Loader, Center, Image, Box, ThemeIcon, Button } from '@mantine/core';
import { IconHeart, IconMessageCircle, IconDotsVertical, IconAlertTriangle, IconBoxSeam, IconCheck } from '@tabler/icons-react';
import { useStore } from '../_contexts/store-context';
import { createClient } from '@/app/_shared/utils/supabase/client';
import { TimelineSummaryCard } from '../calendar/_components/TimelineSummaryCard';

import { ManualExpenseModal } from '../expenses/_components/ManualExpenseModal';

type Post = {
    id: string;
    content: string;
    image_url: string | null;
    post_type: string;
    created_at: string;
    author_id: string;
    status?: string; // Add status type
};

export function TimelineFeed({ keyTrigger }: { keyTrigger: number }) {
    const { currentStore } = useStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Interaction State
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [activePost, setActivePost] = useState<Post | null>(null);
    const [ocrLoading, setOcrLoading] = useState<string | null>(null); // Post ID being processed
    const [ocrResult, setOcrResult] = useState<any>(null);

    const handleProcessReceipt = async (post: Post) => {
        setActivePost(post);
        setOcrLoading(post.id);

        let initial = {
            date: new Date(post.created_at),
            merchant_name: '',
            amount: '' as any,
            category: '기타'
        };

        if (post.image_url) {
            try {
                const { parseAndSuggestExpense } = await import('../timeline/actions');
                const result = await parseAndSuggestExpense(post.image_url);
                if (result.success && 'data' in result && result.data && typeof result.data === 'object') {
                    const data = result.data as any;
                    if ('date' in data && 'merchant_name' in data && 'amount' in data && 'category' in data) {
                        initial = {
                            date: new Date(data.date),
                            merchant_name: data.merchant_name,
                            amount: data.amount,
                            category: data.category
                        };
                    }
                }
            } catch (e) {
                console.error("OCR Error", e);
            }
        }

        setOcrResult(initial);
        setOcrLoading(null);
        setExpenseModalOpen(true);
    };

    const fetchPosts = async () => {
        if (!currentStore) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('timeline_posts')
                .select('*')
                .eq('store_id', currentStore.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [currentStore, keyTrigger]);

    if (!currentStore) return null;
    if (loading && posts.length === 0) return <Center p="xl"><Loader size="sm" color="teal" /></Center>;

    // Filter posts for today for the AI Summary
    const todaysPosts = posts.filter(p => {
        const today = new Date();
        const postDate = new Date(p.created_at);
        return postDate.getDate() === today.getDate() &&
            postDate.getMonth() === today.getMonth() &&
            postDate.getFullYear() === today.getFullYear();
    });

    return (
        <Stack gap="lg" pb={100}>
            {/* AI Summary Card - Only for Today */}
            <TimelineSummaryCard date={new Date()} posts={todaysPosts} />

            {posts.map((post) => (
                <PostCard key={post.id} post={post} onProcess={handleProcessReceipt} />
            ))}

            <ManualExpenseModal
                opened={expenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                onSuccess={() => {
                    fetchPosts(); // Refresh to update status
                }}
                linkedPostId={activePost?.id}
                initialData={{
                    date: activePost ? new Date(activePost.created_at) : new Date(),
                    merchant_name: '', // Could try even simpler extraction later
                    category: '기타'
                }}
            />
            {posts.length === 0 && (
                <Stack align="center" gap="xs" py="xl" opacity={0.6}>
                    <Text size="xl">📭</Text>
                    <Text c="dimmed" size="sm" ta="center">
                        아직 소식이 없습니다.<br />첫 글을 남겨보세요!
                    </Text>
                </Stack>
            )}
        </Stack>
    );
}

function PostCard({ post, onProcess, loading }: { post: Post, onProcess?: (post: Post) => void, loading?: boolean }) {
    // Mock for nicer UI
    const isNotice = post.post_type === 'notice';
    const dateStr = new Date(post.created_at).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const [liked, setLiked] = useState(false);

    // AI Tagging Logic
    const content = post.content || '';
    let tag = null;

    if (content.match(/고장|불만|사고|파손|문제|부서|부셨|깨짐|깨졌|망가|박살|컴플레인|항의/)) {
        tag = { label: '이슈', color: 'red', icon: IconAlertTriangle };
    } else if (content.match(/부족|주문|재고|도착|없음|떨어|모자|비품/)) {
        tag = { label: '물품', color: 'orange', icon: IconBoxSeam };
    } else if (content.match(/완료|청소|마감|체크|정산|오픈|준비/)) {
        tag = { label: '업무', color: 'blue', icon: IconCheck };
    }

    const TagIcon = tag?.icon;

    return (
        <Card shadow="md" radius="lg" p="md" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <Group justify="space-between" mb="sm" align="flex-start">
                <Group gap="sm">
                    <Avatar radius="xl" size="md" color="teal" variant="light">
                        직
                    </Avatar>
                    <Stack gap={0}>
                        <Group gap={6} align="center">
                            <Text size="sm" fw={700} c="white">직원</Text>
                            <Badge size="xs" variant="light" color="gray" circle>N</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{dateStr}</Text>
                    </Stack>
                </Group>

                <Group gap={4}>
                    {tag && TagIcon && (
                        <Badge variant="light" color={tag.color} leftSection={<TagIcon size={12} />}>
                            {tag.label}
                        </Badge>
                    )}
                    {isNotice ? (
                        <Badge color="red" variant="light">공지</Badge>
                    ) : (
                        <ActionIcon variant="transparent" color="gray" size="sm">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    )}
                </Group>
            </Group>

            {/* Content */}
            <Text
                size="md"
                c="white"
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                mb={post.image_url ? 'md' : 'xs'}
            >
                {post.content}
            </Text>

            {/* AI Action Area: Receipt Detection */}
            {post.status !== 'done' && (post.image_url || post.content.includes('#영수증') || post.content.includes('영수증')) && (
                <Button
                    variant="light"
                    color="lime"
                    fullWidth
                    size="sm"
                    mb="sm"
                    leftSection={<IconAlertTriangle size={16} />} // Using Alert/Check icon 
                    onClick={() => onProcess?.(post)}
                    style={{ border: '1px solid #82c91e', color: '#82c91e', backgroundColor: 'rgba(130, 201, 30, 0.1)' }}
                >
                    🧾 지출 장부에 등록하기
                </Button>
            )}

            {post.status === 'done' && (
                <Badge color="teal" variant="light" fullWidth size="lg" mb="sm" leftSection={<IconCheck size={14} />}>
                    ✅ 장부 반영됨
                </Badge>
            )}

            {/* Image */}
            {post.image_url && (
                <Box mb="sm" style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
                    <Image
                        src={post.image_url}
                        w="100%"
                        fit="cover"
                        alt="Attached image"
                    />
                </Box>
            )}

            {/* Footer / Actions */}
            <Group gap="lg" mt="xs" pt="sm" style={{ borderTop: '1px solid #374151' }}>
                <Group
                    gap={6}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setLiked(!liked)}
                >
                    <IconHeart
                        size={20}
                        stroke={1.5}
                        color={liked ? '#fa5252' : 'gray'}
                        fill={liked ? '#fa5252' : 'none'}
                    />
                    <Text size="sm" c={liked ? 'red.5' : 'dimmed'} fw={500}>좋아요</Text>
                </Group>
                <Group gap={6} style={{ cursor: 'pointer' }}>
                    <IconMessageCircle size={20} stroke={1.5} color="gray" />
                    <Text size="sm" c="dimmed" fw={500}>댓글</Text>
                </Group>
            </Group>
        </Card>
    );
}
