import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader, ChevronRight, Settings, LogOut, Sun, Moon } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, Input, Avatar, ImageCropper, BottomSheet } from '../../src/components/ui';
import { useThemeStore } from '../../src/stores/theme-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { useColors } from '../../src/hooks/use-colors';
import { supabase } from '../../src/lib/supabase';
import { restUpdate } from '../../src/lib/supabase-rest';
import { SPACING, RADIUS, TYPOGRAPHY, GRADIENTS } from '../../src/constants/theme';
import { impact } from '../../src/utils/haptics';

function ThemeSegment() {
  const colors = useColors();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const indicatorX = useRef(new Animated.Value(theme === 'light' ? 0 : 72)).current;

  const handleSwitch = (t: 'light' | 'dark') => {
    impact('light');
    Animated.spring(indicatorX, { toValue: t === 'light' ? 0 : 72, damping: 18, stiffness: 200, useNativeDriver: true }).start();
    setTheme(t);
  };

  return (
    <View style={[styles.segmentTrack, { backgroundColor: colors.surface3 }]}>
      <Animated.View style={[styles.segmentIndicator, { backgroundColor: colors.surface2 }, { transform: [{ translateX: indicatorX }] }]} />
      <Pressable style={styles.segmentButton} onPress={() => handleSwitch('light')}>
        <Sun size={16} color={theme === 'light' ? colors.accent : colors.textTertiary} />
        <Text style={[styles.segmentLabel, { color: theme === 'light' ? colors.accent : colors.textTertiary }]}>Light</Text>
      </Pressable>
      <Pressable style={styles.segmentButton} onPress={() => handleSwitch('dark')}>
        <Moon size={16} color={theme === 'dark' ? colors.accent : colors.textTertiary} />
        <Text style={[styles.segmentLabel, { color: theme === 'dark' ? colors.accent : colors.textTertiary }]}>Dark</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, setProfile, reset } = useAuthStore();
  const queryClient = useQueryClient();
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [upiVpa, setUpiVpa] = useState(profile?.upi_vpa ?? '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        const { data, error: dbError } = await restUpdate('profiles', {
          full_name: fullName,
          upi_vpa: upiVpa || null,
        }, { eq: { id: profile!.id }, select: '*', single: true });

        if (dbError) throw new Error(dbError.message);
        setProfile(data);
      } else {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .update({ full_name: fullName, upi_vpa: upiVpa || null })
          .eq('id', profile!.id)
          .select()
          .single();

        if (dbError) throw dbError;
        setProfile(data);
      }
      setEditing(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    setError('');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera roll permission is needed to change your photo');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const pickedUri = asset.uri || '';
      const webImageUri = Platform.OS === 'web' && asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : pickedUri;

      if (Platform.OS === 'web') {
        if (!webImageUri) throw new Error('Unable to read selected image');
        setSelectedImageUri(webImageUri);
        setShowCropper(true);
      } else {
        if (!pickedUri) throw new Error('Unable to read selected image');
        await uploadAvatar(pickedUri, asset.base64 ?? undefined);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to select image');
    }
  };

  const handleCropComplete = async (croppedImageUri: string) => {
    setShowCropper(false);
    setSelectedImageUri('');
    await uploadAvatar(croppedImageUri);
  };

  const uploadAvatar = async (imageUri: string, base64Data?: string) => {
    setUploadingAvatar(true);
    try {
      if (!imageUri) throw new Error('Invalid image selected');

      const fileName = `${profile!.id}/avatar.jpg`;

      let uploadResult;
      if (base64Data) {
        // Convert base64 → ArrayBuffer (reliable on iOS, no fetch needed)
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        uploadResult = await supabase.storage
          .from('avatars')
          .upload(fileName, bytes.buffer, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
      } else {
        // Web fallback
        const response = await fetch(imageUri);
        const blob = await response.blob();
        uploadResult = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
      }

      if (uploadResult.error) {
        console.error('[avatar] upload failed:', uploadResult.error);
        throw uploadResult.error;
      }
      console.log('[avatar] upload ok, file:', fileName);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to get image URL');

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('[avatar] public url:', avatarUrl);

      const { data: updatedProfile, error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile!.id)
        .select()
        .single();

      if (updateErr) {
        console.error('[avatar] profile update failed:', updateErr);
        throw updateErr;
      }

      console.log('[avatar] profile updated:', updatedProfile?.avatar_url);
      setProfile(updatedProfile ?? { ...profile!, avatar_url: avatarUrl });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    } catch (e: any) {
      setError(e.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    impact('medium');
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
  };

  if (!profile) return null;

  return (
    <Screen scrollable>
      {/* Gradient Hero */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
          <Pressable onPress={() => setShowSettings(true)} hitSlop={10}>
            <Settings size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
            <Avatar name={profile.full_name} uri={profile.avatar_url} size={112} ring />
            <LinearGradient
              colors={[...GRADIENTS.primary] as [string, string, ...string[]]}
              style={[styles.cameraOverlay, { borderColor: colors.background }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {uploadingAvatar
                ? <Loader size={16} color="#FFFFFF" />
                : <Camera size={16} color="#FFFFFF" />
              }
            </LinearGradient>
          </Pressable>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.full_name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>
          <Text style={[styles.changePhotoHint, { color: colors.textTertiary }]}>
            {uploadingAvatar ? 'Uploading...' : 'Tap photo to change'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {editing ? (
        <View style={[styles.groupedSection, { backgroundColor: colors.surface2 }]}>
          <View style={{ gap: SPACING.lg, padding: SPACING.lg }}>
            <Input label="Full Name" value={fullName} onChangeText={setFullName} />
            <Input label="UPI ID" value={upiVpa} onChangeText={setUpiVpa} placeholder="name@upi" autoCapitalize="none" />
            <View style={styles.editActions}>
              <Button title="Cancel" onPress={() => { setEditing(false); setError(''); }} variant="secondary" />
              <Button title="Save" onPress={handleSave} loading={loading} />
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.groupedSection, { backgroundColor: colors.surface2 }]}>
          <View style={[styles.groupedRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.phone_number ?? 'Not set'}</Text>
          </View>
          <View style={[styles.groupedRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>UPI ID</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.upi_vpa ?? 'Not set'}</Text>
          </View>
          <Pressable style={styles.groupedRow} onPress={() => setEditing(true)}>
            <Text style={[styles.label, { color: colors.accent }]}>Edit Profile</Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}

      {/* Theme section */}
      <View style={[styles.groupedSection, { backgroundColor: colors.surface2, marginTop: SPACING.lg }]}>
        <View style={[styles.groupedRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.label, { color: colors.textPrimary, fontWeight: '600' }]}>Appearance</Text>
          <ThemeSegment />
        </View>
      </View>

      {/* Sign out */}
      <View style={[styles.groupedSection, { backgroundColor: colors.surface2, marginTop: SPACING.lg }]}>
        <Pressable
          style={[styles.groupedRow, { borderBottomWidth: 0, justifyContent: 'center', gap: 8 }]}
          onPress={handleLogout}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.label, { color: colors.danger, fontWeight: '600' }]}>Sign Out</Text>
        </Pressable>
      </View>

      <ImageCropper
        visible={showCropper}
        imageUri={selectedImageUri}
        onCrop={handleCropComplete}
        onCancel={() => {
          setShowCropper(false);
          setSelectedImageUri('');
        }}
      />

      <BottomSheet visible={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <View style={{ padding: SPACING.lg, gap: SPACING.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={[{ ...TYPOGRAPHY.bodyLg, fontWeight: '600' }, { color: colors.textPrimary }]}>Theme</Text>
            <Text style={[{ ...TYPOGRAPHY.bodySm }, { color: colors.textTertiary }]}>Choose your preferred appearance</Text>
          </View>
          <ThemeSegment />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    marginBottom: SPACING.lg,
  },
  heroGradient: {
    position: 'absolute',
    top: -100,
    left: -20,
    right: -20,
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.displayMd,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  changePhotoHint: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  name: {
    ...TYPOGRAPHY.h2,
  },
  username: {
    ...TYPOGRAPHY.bodyMd,
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  groupedSection: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  groupedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...TYPOGRAPHY.bodyMd,
  },
  value: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 72,
    height: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButton: {
    width: 72,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  segmentLabel: {
    ...TYPOGRAPHY.labelSm,
    fontWeight: '600',
  },
});
