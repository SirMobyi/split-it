import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Button } from '../../src/components/ui';
import { GradientBackground } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../src/constants/theme';
import { impact } from '../../src/utils/haptics';

// Supabase email OTP default. Change in Dashboard → Auth → Providers → Email → Email OTP Length
const OTP_LENGTH = 6;

export default function OTPScreen() {
  const colors = useColors();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const isEmail = !!email;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Entrance animation
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const formStyle = { opacity: formOpacity, transform: [{ translateY: formTranslateY }] };

  const fillOtp = (code: string) => {
    const digits = code.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    impact('light');
    // Focus last filled or next empty
    const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputs.current[nextIndex]?.focus();
  };

  const handleChange = (text: string, index: number) => {
    // iOS autofill / paste: text longer than 1 char → distribute across all boxes
    if (text.length > 1) {
      fillOtp(text);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text) {
      impact('light');
      if (index < OTP_LENGTH - 1) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Error', `Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    impact('medium');
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

  // Auto-verify when all digits filled
  useEffect(() => {
    if (otp.every((d) => d !== '') && otp.join('').length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  return (
    <GradientBackground variant="ambient">
      <SafeAreaView style={{ flex: 1 }}>
        <Screen scrollable>
          <Animated.View style={[styles.container, formStyle]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isEmail ? 'Check your email' : 'Verify your number'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the 6-digit code sent to {isEmail ? email : phone}
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
                      borderColor: focusedIndex === i ? colors.accent : digit ? colors.accentLight : colors.borderLight,
                      borderWidth: focusedIndex === i ? 2 : 1,
                    },
                  ]}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  onFocus={() => setFocusedIndex(i)}
                  keyboardType="number-pad"
                  textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={i === 0 ? OTP_LENGTH : 1}
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
          </Animated.View>
        </Screen>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    gap: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.displayMd,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyLg,
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
    borderRadius: RADIUS.lg,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});
