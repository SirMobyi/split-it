import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useColors } from '../src/hooks/use-colors';

// Navigation is handled entirely by AuthGate in _layout.tsx.
// This screen only renders briefly as a loading placeholder.
export default function Index() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
