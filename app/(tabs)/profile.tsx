import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, Card, Button, Input, Avatar, ImageCropper } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { useColors } from '../../src/hooks/use-colors';
import { supabase } from '../../src/lib/supabase';
import { restUpdate } from '../../src/lib/supabase-rest';
import { COLORS, SPACING } from '../../src/constants/theme';

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
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera roll permission is needed to change your photo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web', // Use our custom cropper on web
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
        if (!webImageUri) {
          throw new Error('Unable to read selected image');
        }
        // On web, show cropper with data URL or URI
        setSelectedImageUri(webImageUri);
        setShowCropper(true);
      } else {
        if (!pickedUri) {
          throw new Error('Unable to read selected image');
        }
        // On native, upload directly (already cropped by image picker)
        await uploadAvatar(pickedUri);
      }
    } catch (e: any) {
      console.error('Image picker error:', e);
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
      // Validate image
      if (!imageUri) {
        throw new Error('Invalid image selected');
      }

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const mimeType = blob.type || 'image/jpeg';
      const extFromMime = mimeType.split('/')[1] || 'jpg';
      const extFromUri = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const ext = extFromUri && extFromUri.length <= 4 ? extFromUri : extFromMime;
      const fileName = `${profile!.id}/avatar.${ext}`;

      const uploadResult = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Optimistic UI update with local preview while upload completes
      const optimisticAvatar = imageUri;
      if (profile) {
        setProfile({ ...profile, avatar_url: optimisticAvatar });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get image URL');
      }

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache bust

      // Update profile
      let updateResult;
      if (Platform.OS === 'web') {
        updateResult = await restUpdate('profiles', {
          avatar_url: avatarUrl,
        }, { eq: { id: profile!.id }, select: '*', single: true });
        if (updateResult.error) throw new Error(updateResult.error.message);
      } else {
        updateResult = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', profile!.id)
          .select()
          .single();
        if (updateResult.error) throw updateResult.error;
      }

      // Only update local state if database update succeeded
      setProfile(updateResult.data);

      // Invalidate group caches so the new avatar propagates instantly
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });

    } catch (e: any) {
      console.error('Avatar upload error:', e);
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
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
          <Avatar name={profile.full_name} uri={profile.avatar_url} size={80} />
          <View style={styles.cameraOverlay}>
            {uploadingAvatar
              ? <Loader size={14} color="#FFFFFF" />
              : <Camera size={14} color="#FFFFFF" />
            }
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.changePhotoHint}>
          {uploadingAvatar ? 'Uploading...' : Platform.OS === 'web' ? 'Tap photo to change (square images work best)' : 'Tap photo to change'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Card style={{ gap: SPACING.lg }}>
        {editing ? (
          <>
            <Input label="Full Name" value={fullName} onChangeText={setFullName} />
            <Input label="UPI ID" value={upiVpa} onChangeText={setUpiVpa} placeholder="name@upi" autoCapitalize="none" />
            <View style={styles.editActions}>
              <Button title="Cancel" onPress={() => { setEditing(false); setError(''); }} variant="secondary" />
              <Button title="Save" onPress={handleSave} loading={loading} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile.phone_number ?? 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>UPI ID</Text>
              <Text style={styles.value}>{profile.upi_vpa ?? 'Not set'}</Text>
            </View>
            <Button title="Edit Profile" onPress={() => setEditing(true)} variant="secondary" fullWidth />
          </>
        )}
      </Card>

      <View style={{ marginTop: SPACING.xxl }}>
        <Button title="Sign Out" onPress={handleLogout} variant="danger" fullWidth />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  cameraIcon: {
    fontSize: 14,
  },
  changePhotoHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  username: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorBox: {
    backgroundColor: COLORS.dangerDim,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
});
