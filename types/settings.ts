export type Theme = 'light' | 'dark';
export type Language = 'en' | 'vi';

export interface Settings {
  theme: Theme;
  language: Language;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'vi',
};
