import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface IconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  strokeWidth?: number;
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
};

function Icon({ icon: LucideIcon, size = 'md', className = '', strokeWidth = 1.5 }: IconProps) {
  const pixelSize = sizeMap[size];

  return (
    <LucideIcon
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}

export default Icon;
