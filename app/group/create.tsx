import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, Input } from '../../src/components/ui';
import { useCreateGroup } from '../../src/hooks/use-groups';
import { COLORS, SPACING } from '../../src/constants/theme';

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const createGroup = useCreateGroup();

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      console.log('Creating group:', name.trim());
      const group = await createGroup.mutateAsync({ name: name.trim() });
      console.log('Group created:', group);
      router.replace(`/group/${group.id}`);
    } catch (e: any) {
      console.error('Group creation error:', e);
      setError(e.message || 'Failed to create group');
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Button title="Cancel" onPress={() => router.push('/(tabs)')} variant="ghost" size="sm" />
        <Text style={styles.title}>New Group</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.form}>
        <Input
          label="Group Name"
          placeholder="e.g. Goa Trip, Flat Expenses"
          value={name}
          onChangeText={setName}
          error={error || undefined}
          autoFocus
        />

        <Button
          title="Create Group"
          onPress={handleCreate}
          loading={createGroup.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  form: {
    marginTop: SPACING.xxl,
    gap: SPACING.xl,
  },
});
