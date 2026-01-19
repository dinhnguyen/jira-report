'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'vi';
export type TimeCalculationMethod = 'original' | 'remaining';

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
}

interface Settings {
  theme: Theme;
  language: Language;
  timeCalculationMethod: TimeCalculationMethod;
  jiraConfig: JiraConfig;
}

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setTimeCalculationMethod: (method: TimeCalculationMethod) => void;
  toggleTheme: () => void;
  setJiraConfig: (config: JiraConfig) => void;
  isJiraConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'jira-report-theme';
const STORAGE_KEY_LANGUAGE = 'jira-report-language';
const STORAGE_KEY_TIME_CALC_METHOD = 'jira-report-time-calc-method';
const STORAGE_KEY_JIRA_CONFIG = 'jira-report-jira-config';

// Default Jira config from environment variables (for development)
const getDefaultJiraConfig = (): JiraConfig => ({
  domain: process.env.NEXT_PUBLIC_JIRA_DOMAIN || '',
  email: process.env.NEXT_PUBLIC_JIRA_EMAIL || '',
  apiToken: process.env.NEXT_PUBLIC_JIRA_API_TOKEN || '',
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    language: 'vi',
    timeCalculationMethod: 'original',
    jiraConfig: getDefaultJiraConfig(),
  });

  // Load settings from localStorage on mount, fallback to env vars
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
    const savedLanguage = localStorage.getItem(STORAGE_KEY_LANGUAGE) as Language | null;
    const savedTimeCalcMethod = localStorage.getItem(STORAGE_KEY_TIME_CALC_METHOD) as TimeCalculationMethod | null;
    const savedJiraConfig = localStorage.getItem(STORAGE_KEY_JIRA_CONFIG);

    const defaultConfig = getDefaultJiraConfig();
    let jiraConfig: JiraConfig = defaultConfig;

    if (savedJiraConfig) {
      try {
        const parsed = JSON.parse(savedJiraConfig);
        // Use saved config, but fallback to env vars for empty fields
        jiraConfig = {
          domain: parsed.domain || defaultConfig.domain,
          email: parsed.email || defaultConfig.email,
          apiToken: parsed.apiToken || defaultConfig.apiToken,
        };
      } catch (e) {
        console.error('Failed to parse saved Jira config:', e);
      }
    }

    setSettings({
      theme: savedTheme || 'light',
      language: savedLanguage || 'vi',
      timeCalculationMethod: savedTimeCalcMethod || 'original',
      jiraConfig,
    });
  }, []);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const setTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  };

  const setLanguage = (language: Language) => {
    setSettings(prev => ({ ...prev, language }));
    localStorage.setItem(STORAGE_KEY_LANGUAGE, language);
  };

  const setTimeCalculationMethod = (method: TimeCalculationMethod) => {
    setSettings(prev => ({ ...prev, timeCalculationMethod: method }));
    localStorage.setItem(STORAGE_KEY_TIME_CALC_METHOD, method);
  };

  const toggleTheme = () => {
    setTheme(settings.theme === 'light' ? 'dark' : 'light');
  };

  const setJiraConfig = (config: JiraConfig) => {
    setSettings(prev => ({ ...prev, jiraConfig: config }));
    localStorage.setItem(STORAGE_KEY_JIRA_CONFIG, JSON.stringify(config));
  };

  const isJiraConfigured = Boolean(
    settings.jiraConfig.domain &&
    settings.jiraConfig.email &&
    settings.jiraConfig.apiToken
  );

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setLanguage, setTimeCalculationMethod, toggleTheme, setJiraConfig, isJiraConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
