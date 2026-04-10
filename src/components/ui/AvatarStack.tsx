import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from './Avatar';
import { useColors } from '../../hooks/use-colors';
import { TYPOGRAPHY } from '../../constants/theme';

interface AvatarStackItem {
  name: string;
  uri?: string | null;
}

interface AvatarStackProps {
  items: AvatarStackItem[];
  max?: number;
  size?: number;
}

export function AvatarStack({ items, max = 4, size = 28 }: AvatarStackProps) {
  const colors = useColors();
  const visible = items.slice(0, max);
  const overflow = items.length - max;
  const overlap = size * 0.3;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((item, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: visible.length - i,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: colors.background,
            borderStyle: 'solid',
            overflow: 'hidden',
          }}
        >
          <Avatar name={item.name} uri={item.uri} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: -overlap,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accentDim,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.background,
            zIndex: 0,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: size * 0.35, fontWeight: '700' }}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
