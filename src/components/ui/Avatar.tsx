import React from 'react';
import { View, Text, Image } from 'react-native';
import { useColors } from '../../hooks/use-colors';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
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
  '#E8DAEF', '#D5F5E3', '#D6EAF8', '#FADBD8',
  '#FCF3CF', '#D5D8DC', '#AED6F1', '#F5CBA7',
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const colors = useColors();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
        }}
      />
    );
  }

  return (
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
      <Text style={{ color: '#3C3C43', fontSize: size * 0.38, fontWeight: '600' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
