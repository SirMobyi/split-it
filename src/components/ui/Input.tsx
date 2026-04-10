import React, { forwardRef, useState, useCallback, useRef } from 'react';
import { View, TextInput, Text, TextInputProps, Platform, Animated } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useColors, useShadows } from '../../hooks/use-colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, prefix, suffix, style, multiline, onFocus, onBlur, ...props }, ref) => {
    const colors = useColors();
    const shadows = useShadows();
    const [focused, setFocused] = useState(false);

    const handleFocus = useCallback((e: any) => {
      setFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: any) => {
      setFocused(false);
      onBlur?.(e);
    }, [onBlur]);

    return (
      <View style={{ gap: 6 }}>
        {label && (
          <Text style={{ color: colors.textSecondary, ...TYPOGRAPHY.labelMd }}>{label}</Text>
        )}
        <View style={[
          {
            flexDirection: 'row',
            alignItems: 'center' as const,
            backgroundColor: focused ? colors.accentSurface : colors.surface,
            borderRadius: RADIUS.md,
            paddingHorizontal: SPACING.lg,
            minHeight: 52,
            borderWidth: 1,
            borderColor: focused ? colors.accent : (error ? colors.danger : colors.borderLight),
          },
          focused && {
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
          },
          multiline && { alignItems: 'flex-start' as const, paddingVertical: SPACING.lg },
        ]}>
          {prefix && <Text style={{ color: colors.textSecondary, ...TYPOGRAPHY.bodyLg, marginRight: 4 }}>{prefix}</Text>}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textTertiary}
            multiline={multiline}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              { flex: 1, color: colors.textPrimary, ...TYPOGRAPHY.bodyLg, paddingVertical: 0, minHeight: 24 },
              multiline && { textAlignVertical: 'top' as const, minHeight: 60 },
              Platform.OS === 'web' && { outlineStyle: 'none' } as any,
              style,
            ]}
            {...props}
          />
          {suffix}
        </View>
        {error && <Text style={{ color: colors.danger, ...TYPOGRAPHY.bodySm }}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
