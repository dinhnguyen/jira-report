'use client';

import { useState, useRef, useEffect } from 'react';
import { useSettings, JiraConfig } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { settings, setTheme, setLanguage, setTimeCalculationMethod, setJiraConfig, isJiraConfigured } = useSettings();
  const t = useTranslation(settings.language);

  // Local state for Jira config form
  const [jiraForm, setJiraForm] = useState<JiraConfig>({
    domain: '',
    email: '',
    apiToken: '',
  });
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Sync local form with settings when modal opens or settings change
  useEffect(() => {
    setJiraForm(settings.jiraConfig);
  }, [settings.jiraConfig, isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveJiraConfig = () => {
    setJiraConfig(jiraForm);
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
        aria-label={t('settings')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 text-gray-700 dark:text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {/* Status indicator */}
        <span className={`w-2 h-2 rounded-full ${isJiraConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('settings')}
            </h3>
          </div>

          <div className="p-4 space-y-5">
            {/* Jira Configuration */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">
                {t('jiraConfiguration')}
                <span className={`text-xs px-2 py-0.5 rounded-full ${isJiraConfigured ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                  {isJiraConfigured ? '✓' : '!'}
                </span>
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('jiraDomain')}</label>
                  <input
                    type="text"
                    value={jiraForm.domain}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder={t('jiraDomainPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('jiraEmail')}</label>
                  <input
                    type="email"
                    value={jiraForm.email}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('jiraEmailPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('jiraApiToken')}</label>
                  <input
                    type="password"
                    value={jiraForm.apiToken}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, apiToken: e.target.value }))}
                    placeholder={t('jiraApiTokenPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveJiraConfig}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {showSavedMessage ? t('configSaved') : t('saveConfig')}
                </button>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Theme Toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('theme')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 ${settings.theme === 'light'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{t('lightMode')}</span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 ${settings.theme === 'dark'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{t('darkMode')}</span>
                </button>
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('language')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 ${settings.language === 'en'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <span className="text-sm font-medium">{t('english')}</span>
                </button>

                <button
                  onClick={() => setLanguage('vi')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 ${settings.language === 'vi'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <span className="text-sm font-medium">{t('vietnamese')}</span>
                </button>
              </div>
            </div>

            {/* Time Calculation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('timeCalculationMethod')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeCalculationMethod('original')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 ${settings.timeCalculationMethod === 'original'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <span className="text-sm font-medium">{t('byOriginalEstimate')}</span>
                </button>

                <button
                  onClick={() => setTimeCalculationMethod('remaining')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 ${settings.timeCalculationMethod === 'remaining'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <span className="text-sm font-medium">{t('byRemainingEstimate')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

