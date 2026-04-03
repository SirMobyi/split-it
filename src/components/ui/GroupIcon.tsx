import React from 'react';
import { View } from 'react-native';
import { 
  Users, Home, Plane, Pizza, PartyPopper, Building2, 
  GraduationCap, Briefcase, Dumbbell, Gamepad2, ShoppingCart, Heart 
} from 'lucide-react-native';
import { COLORS } from '../../constants/theme';

export type GroupIconName = 
  | 'Users' | 'Home' | 'Plane' | 'Pizza' | 'PartyPopper' | 'Building2' 
  | 'GraduationCap' | 'Briefcase' | 'Dumbbell' | 'Gamepad2' | 'ShoppingCart' | 'Heart';

export const GROUP_ICON_NAMES: GroupIconName[] = [
  'Users', 'Home', 'Plane', 'Pizza', 'PartyPopper', 'Building2',
  'GraduationCap', 'Briefcase', 'Dumbbell', 'Gamepad2', 'ShoppingCart', 'Heart'
];

interface GroupIconProps {
  name: string | null | undefined;
  size?: number;
  color?: string;
}

export function GroupIcon({ name, size = 20, color = COLORS.textPrimary }: GroupIconProps) {
  const iconProps = { size, color };
  
  switch (name) {
    case 'Home': return <Home {...iconProps} />;
    case 'Plane': return <Plane {...iconProps} />;
    case 'Pizza': return <Pizza {...iconProps} />;
    case 'PartyPopper': return <PartyPopper {...iconProps} />;
    case 'Building2': return <Building2 {...iconProps} />;
    case 'GraduationCap': return <GraduationCap {...iconProps} />;
    case 'Briefcase': return <Briefcase {...iconProps} />;
    case 'Dumbbell': return <Dumbbell {...iconProps} />;
    case 'Gamepad2': return <Gamepad2 {...iconProps} />;
    case 'ShoppingCart': return <ShoppingCart {...iconProps} />;
    case 'Heart': return <Heart {...iconProps} />;
    case 'Users':
    default: 
      return <Users {...iconProps} />;
  }
}
