import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Modal } from 'react-native';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from './Button';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface ImageCropperProps {
  visible: boolean;
  imageUri: string;
  onCrop: (croppedImageUri: string) => void;
  onCancel: () => void;
}

type CroppedArea = Area | null;

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const outputWidth = Math.max(80, Math.round(pixelCrop.width));
  const outputHeight = Math.max(80, Math.round(pixelCrop.height));

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.clearRect(0, 0, outputWidth, outputHeight);

  ctx.save();
  ctx.beginPath();
  ctx.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from cropped image'));
          return;
        }
        const croppedImageUrl = URL.createObjectURL(blob);
        resolve(croppedImageUrl);
      },
      'image/jpeg',
      0.95
    );
  });
};

export function ImageCropper({ visible, imageUri, onCrop, onCancel }: ImageCropperProps) {
  const colors = useColors();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedImageUri = await getCroppedImg(imageUri, croppedAreaPixels);
      onCrop(croppedImageUri);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Crop Your Photo</Text>

          <View style={styles.cropArea}>
            <Cropper
              image={imageUri}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              objectFit="horizontal-cover"
            />
            <View style={styles.cropMask} pointerEvents="none" />
          </View>

          {Platform.OS === 'web' && (
            <View style={styles.zoomControl}>
              <Text style={[styles.zoomLabel, { color: colors.textSecondary }]}>Zoom</Text>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={styles.zoomSlider as any}
              />
            </View>
          )}

          <View style={styles.actions}>
            <Button title="Cancel" onPress={onCancel} variant="secondary" />
            <Button title={saving ? 'Saving...' : 'Apply'} onPress={handleApply} disabled={!croppedAreaPixels || saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  cropArea: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 330,
    backgroundColor: '#1A1035',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: SPACING.md,
  },
  cropMask: {
    position: 'absolute',
    inset: 0,
    borderRadius: RADIUS.lg,
    boxSizing: 'border-box',
    borderWidth: 1,
    borderColor: 'rgba(179, 148, 246, 0.7)',
  },
  zoomControl: {
    marginBottom: SPACING.md,
  },
  zoomLabel: {
    ...TYPOGRAPHY.bodySm,
    marginBottom: 6,
  },
  zoomSlider: {
    width: '100%',
    cursor: 'pointer',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
});
