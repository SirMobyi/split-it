import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING } from '../../src/constants/theme';

export default function OTPScreen() {
  const colors = useColors();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const isEmail = !!email;
  const OTP_LENGTH = isEmail ? 8 : 6;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Error', `Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp(
      isEmail
        ? { email: email!, token: code, type: 'email' }
        : { phone: phone!, token: code, type: 'sms' },
    );
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(auth)/profile-setup');
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEmail ? 'Check your email' : 'Verify your number'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter the code sent to {isEmail ? email : phone}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[
                styles.otpInput,
                {
                  backgroundColor: digit ? colors.accentDim : colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <Button
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          fullWidth
        />

        <Button
          title="Resend code"
          onPress={async () => {
            try {
              const { error: resendErr } = await supabase.auth.signInWithOtp(
                isEmail ? { email: email! } : { phone: phone! },
              );
              if (resendErr) throw resendErr;
              Alert.alert('Sent', 'A new code has been sent');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to resend code');
            }
          }}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    gap: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 17,
    marginTop: -12,
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});
