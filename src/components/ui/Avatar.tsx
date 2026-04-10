import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useColors } from '../../hooks/use-colors';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  status?: 'online' | 'away';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#E8DAEF', '#D5C8F0', '#C4B5FD', '#DDD6FE',
  '#EDE9FE', '#F3E8FF', '#E9D5FF', '#D8B4FE',
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ uri, name, size = 40, ring = false, status }: AvatarProps) {
  const colors = useColors();
  const [imgError, setImgError] = useState(false);
  const ringWidth = ring ? 2 : 0;
  const totalSize = size + ringWidth * 2;

  const statusColors = {
    online: colors.success,
    away: colors.warning,
  };

  const showImage = !!uri && !imgError;

  const content = showImage ? (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface,
      }}
      onError={() => setImgError(true)}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getColorForName(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: size * 0.38, fontWeight: '600' }}>
        {getInitials(name)}
      </Text>
    </View>
  );

  return (
    <View style={{ width: totalSize, height: totalSize, alignItems: 'center', justifyContent: 'center' }}>
      {ring && (
        <View
          style={{
            position: 'absolute',
            width: totalSize,
            height: totalSize,
            borderRadius: totalSize / 2,
            borderWidth: ringWidth,
            borderColor: colors.accent,
          }}
        />
      )}
      {content}
      {status && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: statusColors[status],
            borderWidth: 2,
            borderColor: colors.background,
          }}
        />
      )}
    </View>
  );
}
