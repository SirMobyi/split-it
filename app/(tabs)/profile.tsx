import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader, ChevronRight } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, Button, Input, Avatar, ImageCropper, BottomSheet } from '../../src/components/ui';
import { useThemeStore } from '../../src/stores/theme-store';
import { Settings } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth-store';
import { useColors } from '../../src/hooks/use-colors';
import { supabase } from '../../src/lib/supabase';
import { restUpdate } from '../../src/lib/supabase-rest';
import { SPACING, RADIUS } from '../../src/constants/theme';

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
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

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
        base64: Platform.OS === 'web',
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
        await uploadAvatar(pickedUri);
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

  const uploadAvatar = async (imageUri: string) => {
    setUploadingAvatar(true);
    try {
      if (!imageUri) throw new Error('Invalid image selected');

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const mimeType = blob.type || 'image/jpeg';
      const extFromMime = mimeType.split('/')[1] || 'jpg';
      const extFromUri = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const ext = extFromUri && extFromUri.length <= 4 ? extFromUri : extFromMime;
      const fileName = `${profile!.id}/avatar.${ext}`;

      const uploadResult = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: mimeType });

      if (uploadResult.error) throw uploadResult.error;

      if (profile) setProfile({ ...profile, avatar_url: imageUri });

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to get image URL');

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      let updateResult;
      if (Platform.OS === 'web') {
        updateResult = await restUpdate('profiles', { avatar_url: avatarUrl }, { eq: { id: profile!.id }, select: '*', single: true });
        if (updateResult.error) throw new Error(updateResult.error.message);
      } else {
        updateResult = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile!.id).select().single();
        if (updateResult.error) throw updateResult.error;
      }

      setProfile(updateResult.data);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    } catch (e: any) {
      setError(e.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
  };

  if (!profile) return null;

  return (
    <Screen scrollable>
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}> 
        <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Settings size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
          <Avatar name={profile.full_name} uri={profile.avatar_url} size={96} />
          <View style={[styles.cameraOverlay, { backgroundColor: colors.accent }]}>
            {uploadingAvatar
              ? <Loader size={14} color="#FFFFFF" />
              : <Camera size={14} color="#FFFFFF" />
            }
          </View>
        </TouchableOpacity>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.full_name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>
        <Text style={[styles.changePhotoHint, { color: colors.textTertiary }]}>
          {uploadingAvatar ? 'Uploading...' : 'Tap photo to change'}
        </Text>
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
          <TouchableOpacity style={styles.groupedRow} onPress={() => setEditing(true)}>
            <Text style={[styles.label, { color: colors.accent }]}>Edit Profile</Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ marginTop: SPACING.xxxl, alignItems: 'center' }}>
        <TouchableOpacity onPress={handleLogout} style={{ paddingVertical: SPACING.md }}>
          <Text style={{ fontSize: 17, color: colors.danger, fontWeight: '500' }}>Sign Out</Text>
        </TouchableOpacity>
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
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>Theme</Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>Choose Light or Dark</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Light" onPress={() => { setTheme('light'); setShowSettings(false); }} variant={theme === 'light' ? 'primary' : 'secondary'} />
              <Button title="Dark" onPress={() => { setTheme('dark'); setShowSettings(false); }} variant={theme === 'dark' ? 'primary' : 'secondary'} />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xxl,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoHint: {
    fontSize: 13,
    marginTop: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  username: {
    fontSize: 15,
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  groupedSection: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  groupedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 15,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
});
