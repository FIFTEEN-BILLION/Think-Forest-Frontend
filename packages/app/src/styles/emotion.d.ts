import '@emotion/react';
import type { AppTheme } from './theme';

declare module '@emotion/react' {
  export interface Theme {
    colors: AppTheme['colors'];
    spacing: AppTheme['spacing'];
  }
}
