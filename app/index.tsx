import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/constants/theme';

// Navigation is handled entirely by AuthGate in _layout.tsx.
// This screen only renders briefly as a loading placeholder.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}
