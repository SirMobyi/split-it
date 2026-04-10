import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { useColors } from '../../hooks/use-colors';
import { CURRENCY } from '../../constants/theme';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  prefix?: string;
  duration?: number;
}

export function AnimatedNumber({ value, style, prefix = CURRENCY.symbol, duration = 600 }: AnimatedNumberProps) {
  const colors = useColors();
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const num = Math.abs(display);
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <Text
      style={[
        {
          color: colors.textPrimary,
          fontSize: 34,
          fontWeight: '800',
          padding: 0,
        },
        style,
      ]}
    >
      {prefix}{formatted}
    </Text>
  );
}
