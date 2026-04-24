
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props} 
      attribute="class" 
      defaultTheme="light"
      enableSystem={false}
      themes={['light', 'dark', 'purple', 'blue', 'green', 'orange', 'blue-gray']}
      value={{
        light: 'theme-light',
        dark: 'theme-dark',
        purple: 'theme-purple',
        blue: 'theme-blue',
        green: 'theme-green',
        orange: 'theme-orange',
        'blue-gray': 'theme-blue-gray',
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
