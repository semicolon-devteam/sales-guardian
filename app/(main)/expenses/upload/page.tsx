'use client';

import { useState, useCallback } from 'react';
import { Title, Text, Button, Stack, Group, Card, Loader, TextInput, NumberInput, Center, ActionIcon, FileButton, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCamera, IconCheck, IconX, IconUpload, IconDeviceFloppy } from '@tabler/icons-react';
import Cropper, { Area } from 'react-easy-crop';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { analyzeReceipt, uploadReceiptAndSave } from '../actions';
import '@mantine/dates/styles.css';

// Helper to crop image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.src = url;
    });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
}

export default function ExpenseUploadPage() {
    const router = useRouter();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Process States
    const [step, setStep] = useState<'capture' | 'crop' | 'verify'>('capture');
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form Data
    const [ocrData, setOcrData] = useState({
        merchant_name: '',
        amount: 0,
        date: new Date(),
        category: '',
    });
    const [finalImageBlob, setFinalImageBlob] = useState<Blob | null>(null);

    const onFileChange = async (file: File | null) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImageSrc(url);
        setStep('crop');
    };

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropConfirm = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            setAnalyzing(true);
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            // Compress
            const compressedFile = await imageCompression(new File([croppedBlob], "receipt.jpg", { type: "image/jpeg" }), {
                maxSizeMB: 1,
                maxWidthOrHeight: 1280,
            });
            setFinalImageBlob(compressedFile);

            // Real OCR Analysis (Client Side)
            // Dynamic import to avoid SSR issues with Tesseract
            const { parseExpenseReceipt } = await import('../_utils/receipt-ocr');
            const result = await parseExpenseReceipt(compressedFile);

            if (result) {
                setOcrData({
                    merchant_name: result.merchant_name,
                    amount: result.amount,
                    date: new Date(result.date),
                    category: result.category,
                });
                setStep('verify');
            } else {
                alert('영수증 인식에 실패했습니다.');
            }

        } catch (e: any) {
            console.error(e);
            alert(`이미지 처리 중 오류가 발생했습니다: ${e.message}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!finalImageBlob) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('merchant_name', ocrData.merchant_name);
            formData.append('amount', ocrData.amount.toString());

            // Format Date as YYYY-MM-DD (Local Time)
            const dateObj = new Date(ocrData.date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            formData.append('date', dateStr);
            formData.append('category', ocrData.category || '기타');
            formData.append('image', finalImageBlob);

            const result = await uploadReceiptAndSave(formData);
            if (result.success) {
                router.push('/expenses'); // Go to list
            } else {
                alert(result.error);
            }
        } catch (e: any) {
            console.error(e);
            alert(`저장 실패: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack h="calc(100vh - 100px)" justify={step === 'crop' ? 'flex-start' : 'center'}>

            {/* STEP 1: Capture */}
            {step === 'capture' && (
                <Center h="100%">
                    <Stack align="center" gap="xl">
                        <Title order={2}>영수증 촬영 📸</Title>
                        <Text c="dimmed" ta="center">
                            영수증을 촬영하면<br />
                            AI가 내용을 자동으로 읽어줍니다.
                        </Text>

                        <Group>
                            <FileButton onChange={onFileChange} accept="image/*" capture="environment">
                                {(props) => (
                                    <Button {...props} size="xl" h={120} w={200} variant="light" color="teal">
                                        <Stack gap="xs" align="center">
                                            <IconCamera size={48} />
                                            <Text>카메라 켜기</Text>
                                        </Stack>
                                    </Button>
                                )}
                            </FileButton>
                        </Group>
                    </Stack>
                </Center>
            )}

            {/* STEP 2: Crop */}
            {step === 'crop' && imageSrc && (
                <div style={{ position: 'relative', height: '100%', width: '100%', backgroundColor: '#000' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 80 }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={3 / 4}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>

                    {/* Controls */}
                    <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', gap: 10 }}>
                        <Button
                            fullWidth
                            color="gray"
                            variant="filled"
                            onClick={() => setStep('capture')}
                            disabled={analyzing}
                        >
                            <IconX size={16} /> 취소
                        </Button>
                        <Button
                            fullWidth
                            color="teal"
                            variant="filled"
                            loading={analyzing}
                            onClick={handleCropConfirm}
                        >
                            <IconCheck size={16} style={{ marginRight: 4 }} /> 인식 시작
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: Verify & Save */}
            {step === 'verify' && (
                <Stack gap="lg">
                    <Title order={3}>내용 확인 ✅</Title>
                    <Text size="sm" c="dimmed">AI가 인식한 내용이 맞나요?</Text>

                    <Card withBorder radius="md">
                        <Stack gap="md">
                            <TextInput
                                label="사용처"
                                value={ocrData.merchant_name}
                                onChange={(e) => setOcrData({ ...ocrData, merchant_name: e.target.value })}
                            />
                            <NumberInput
                                label="금액"
                                suffix="원"
                                value={ocrData.amount}
                                onChange={(val) => setOcrData({ ...ocrData, amount: Number(val) })}
                            />
                            <Select
                                label="카테고리"
                                data={['식비', '간식', '쇼핑', '온라인쇼핑', '교통/차량', '주거/통신', '기타']}
                                value={ocrData.category || '기타'}
                                onChange={(val) => setOcrData({ ...ocrData, category: val || '기타' })}
                                allowDeselect={false}
                            />
                            <DatePickerInput
                                label="날짜"
                                value={ocrData.date}
                                onChange={(val) => {
                                    if (val) {
                                        const dateVal = typeof val === 'string' ? new Date(val) : val;
                                        setOcrData({ ...ocrData, date: dateVal });
                                    }
                                }}
                            />
                        </Stack>
                    </Card>

                    <Button size="xl" color="teal" onClick={handleSave} loading={saving}>
                        <IconDeviceFloppy size={20} style={{ marginRight: 8 }} /> 저장하기
                    </Button>
                </Stack>
            )}
        </Stack>
    );
}
