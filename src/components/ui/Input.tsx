import React, { forwardRef } from 'react';
import { View, TextInput, Text, TextInputProps, Platform } from 'react-native';
import { RADIUS, SPACING } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, prefix, suffix, style, multiline, ...props }, ref) => {
    const colors = useColors();
    return (
      <View style={{ gap: 6 }}>
        {label && (
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
        )}
        <View style={[
          {
            flexDirection: 'row',
            alignItems: 'center' as const,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: RADIUS.lg, // 16px
            paddingHorizontal: SPACING.lg,
            minHeight: 52,
          },
          multiline && { alignItems: 'flex-start' as const, paddingVertical: SPACING.lg },
        ]}>
          {prefix && <Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 4 }}>{prefix}</Text>}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textTertiary}
            multiline={multiline}
            style={[
              { flex: 1, color: colors.textPrimary, fontSize: 16, paddingVertical: 0, minHeight: 24 },
              multiline && { textAlignVertical: 'top' as const, minHeight: 60 },
              Platform.OS === 'web' && { outlineStyle: 'none' } as any,
              style,
            ]}
            {...props}
          />
          {suffix}
        </View>
        {error && <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

