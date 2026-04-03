import React from 'react';
import { View, ActivityIndicator } from 'react-native';
// Navigation is handled entirely by AuthGate in _layout.tsx.
// This screen only renders briefly as a loading placeholder.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#6C5CE7" />
    </View>
  );
}
