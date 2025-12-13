'use client';

import { useState, useEffect } from 'react';
import { Paper, SimpleGrid, Button, Text, Group, Stack } from '@mantine/core';
import { IconBackspace, IconPlus } from '@tabler/icons-react';

interface CalculatorInputProps {
    value?: number;
    onChange: (value: number) => void;
    onSubmit?: (value: number) => void;
}

export function CalculatorInput({ value = 0, onChange, onSubmit }: CalculatorInputProps) {
    const [displayValue, setDisplayValue] = useState<string>(value > 0 ? value.toString() : '');

    useEffect(() => {
        if (value === 0 && displayValue !== '') {
            setDisplayValue('');
        }
    }, [value, displayValue]);

    const vibrate = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const handleInput = (val: string) => {
        vibrate();
        setDisplayValue((prev) => {
            if (prev === '0') return val;
            return prev + val;
        });
    };

    const handleOperator = () => {
        vibrate();
        setDisplayValue((prev) => {
            if (prev.endsWith('+')) return prev;
            if (prev === '') return '';
            return prev + '+';
        });
    };

    const handleBackspace = () => {
        vibrate();
        setDisplayValue((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        vibrate();
        setDisplayValue('');
        onChange(0);
    };

    const handleCalculate = () => {
        vibrate();
        if (!displayValue) return;

        try {
            const parts = displayValue.split('+').map(p => parseInt(p.replace(/,/g, ''), 10));
            const sum = parts.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
            setDisplayValue(sum.toString());
            onChange(sum);
            if (onSubmit) onSubmit(sum);
        } catch (e) {
            console.error(e);
        }
    };

    const formatDisplay = (val: string) => {
        return val.split('+').map(part => {
            if (!part) return '';
            const num = parseInt(part, 10);
            return isNaN(num) ? part : num.toLocaleString();
        }).join(' + ');
    };

    const getProvisionalTotal = () => {
        if (!displayValue || displayValue.endsWith('+')) return null;
        if (!displayValue.includes('+')) return null;
        try {
            const parts = displayValue.split('+').map(p => parseInt(p, 10));
            const sum = parts.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
            return sum;
        } catch {
            return null;
        }
    };
    const provisional = getProvisionalTotal();

    // Keypad Button Component - using Button instead of UnstyledButton for better touch support
    const KeyBtn = ({
        label,
        onClick,
        variant = 'subtle',
        color = 'gray',
        icon
    }: {
        label?: string,
        onClick: () => void,
        variant?: 'subtle' | 'light' | 'filled',
        color?: string,
        icon?: React.ReactNode
    }) => (
        <Button
            variant={variant}
            color={color}
            onClick={onClick}
            h={60}
            radius="md"
            styles={{
                root: {
                    fontSize: '1.5rem',
                    fontWeight: 600,
                },
                label: {
                    color: color === 'gray' ? 'white' : undefined
                }
            }}
        >
            {icon || label}
        </Button>
    );

    return (
        <Stack gap="md">
            {/* Display Screen */}
            <div style={{ padding: '0 12px', textAlign: 'right', minHeight: 80 }}>
                <Text size="sm" c="dimmed" h={20}>
                    {provisional ? `= ${provisional.toLocaleString()}` : ''}
                </Text>
                <Text
                    style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        wordBreak: 'break-all',
                        color: displayValue ? 'white' : 'var(--mantine-color-gray-6)'
                    }}
                >
                    {displayValue ? formatDisplay(displayValue) : '0원'}
                </Text>
            </div>

            {/* Shortcut Chips */}
            <Group gap="xs" mb="xs" justify="flex-end">
                {[1, 5, 10].map((v) => (
                    <Button
                        key={v}
                        variant="light"
                        color="gray"
                        radius="xl"
                        size="xs"
                        onClick={() => {
                            vibrate();
                            const amount = v * 10000;
                            setDisplayValue(prev => {
                                if (prev === '') return amount.toString();
                                if (prev.endsWith('+')) return prev + amount.toString();
                                return prev + '+' + amount.toString();
                            });
                        }}
                    >
                        +{v}만
                    </Button>
                ))}
                <Button color="red" variant="subtle" size="xs" radius="xl" onClick={handleClear}>초기화</Button>
            </Group>

            {/* Keypad Grid */}
            <Paper radius="xl" p="sm" bg="#1F2937">
                <SimpleGrid cols={4} spacing="xs" verticalSpacing="xs">
                    <KeyBtn label="7" onClick={() => handleInput('7')} />
                    <KeyBtn label="8" onClick={() => handleInput('8')} />
                    <KeyBtn label="9" onClick={() => handleInput('9')} />
                    <KeyBtn icon={<IconBackspace size={24} />} onClick={handleBackspace} />

                    <KeyBtn label="4" onClick={() => handleInput('4')} />
                    <KeyBtn label="5" onClick={() => handleInput('5')} />
                    <KeyBtn label="6" onClick={() => handleInput('6')} />
                    <KeyBtn icon={<IconPlus size={24} />} onClick={handleOperator} variant="light" color="blue" />

                    <KeyBtn label="1" onClick={() => handleInput('1')} />
                    <KeyBtn label="2" onClick={() => handleInput('2')} />
                    <KeyBtn label="3" onClick={() => handleInput('3')} />
                    <KeyBtn label="00" onClick={() => handleInput('00')} />

                    <KeyBtn label="0" onClick={() => handleInput('0')} />
                    <div style={{ gridColumn: 'span 2' }}>
                        <Button
                            fullWidth
                            h={60}
                            radius="lg"
                            color="teal"
                            size="lg"
                            onClick={handleCalculate}
                        >
                            매출 입력 완료
                        </Button>
                    </div>
                    <div />
                </SimpleGrid>
            </Paper>
        </Stack>
    );
}
