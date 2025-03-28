declare module '@/components/theme-toggle-client' {
  import * as React from 'react';
  
  export interface ThemeToggleProps {
    size?: "default" | "sm" | "lg" | "icon"
    showLabel?: boolean
  }

  export const ClientThemeToggle: React.ComponentType<ThemeToggleProps>;
} 