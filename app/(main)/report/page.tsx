'use client';

import { useState } from 'react';
import { Title, Text, Button, Stack, Card, Center, ThemeIcon } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconFileTypePdf, IconCalendar } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import '@mantine/dates/styles.css';

export default function ReportSelectPage() {
    const router = useRouter();
    const [value, setValue] = useState<Date | null>(new Date());

    const handleGenerate = () => {
        if (!value) return;
        const year = value.getFullYear();
        const month = value.getMonth() + 1;
        router.push(`/report/view?year=${year}&month=${month}`);
    };

    return (
        <Center h="calc(100vh - 160px)">
            <Stack align="center" gap="xl">
                <ThemeIcon size={80} radius="100%" variant="light" color="teal">
                    <IconFileTypePdf size={40} />
                </ThemeIcon>

                <Stack align="center" gap="xs">
                    <Title order={2}>월말 세무 리포트</Title>
                    <Text c="dimmed" ta="center">
                        세무사에게 보낼 리포트를<br />
                        1초 만에 만들어드립니다.
                    </Text>
                </Stack>

                <Card withBorder radius="md" p="xl" w="100%" maw={350}>
                    <Stack>
                        <MonthPickerInput
                            leftSection={<IconCalendar size={16} />}
                            label="조회할 월 선택"
                            placeholder="날짜 선택"
                            value={value}
                            onChange={(date) => setValue(date as Date | null)}
                            maxDate={new Date()}
                        />
                        <Button
                            fullWidth
                            size="md"
                            color="teal"
                            onClick={handleGenerate}
                            disabled={!value}
                        >
                            리포트 생성하기
                        </Button>
                    </Stack>
                </Card>
            </Stack>
        </Center>
    );
}
