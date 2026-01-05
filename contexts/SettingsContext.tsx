'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'vi';

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
}

interface Settings {
  theme: Theme;
  language: Language;
  jiraConfig: JiraConfig;
}

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleTheme: () => void;
  setJiraConfig: (config: JiraConfig) => void;
  isJiraConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'jira-report-theme';
const STORAGE_KEY_LANGUAGE = 'jira-report-language';
const STORAGE_KEY_JIRA_CONFIG = 'jira-report-jira-config';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    language: 'vi',
    jiraConfig: {
      domain: '',
      email: '',
      apiToken: '',
    },
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
    const savedLanguage = localStorage.getItem(STORAGE_KEY_LANGUAGE) as Language | null;
    const savedJiraConfig = localStorage.getItem(STORAGE_KEY_JIRA_CONFIG);

    let jiraConfig: JiraConfig = { domain: '', email: '', apiToken: '' };
    if (savedJiraConfig) {
      try {
        jiraConfig = JSON.parse(savedJiraConfig);
      } catch (e) {
        console.error('Failed to parse saved Jira config:', e);
      }
    }

    setSettings({
      theme: savedTheme || 'light',
      language: savedLanguage || 'vi',
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
    <SettingsContext.Provider value={{ settings, setTheme, setLanguage, toggleTheme, setJiraConfig, isJiraConfigured }}>
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
