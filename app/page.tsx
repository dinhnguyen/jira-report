'use client';

import { useState } from 'react';
import BoardSelector from '@/components/BoardSelector';
import BurndownChart from '@/components/BurndownChart';
import CompletedIssuesList from '@/components/CompletedIssuesList';
import SprintIssuesList from '@/components/SprintIssuesList';
import { TimeData, CompletedIssuesByDate, JiraIssue } from '@/types/jira';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

export default function Home() {
  const { settings, isJiraConfigured } = useSettings();
  const t = useTranslation(settings.language);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [burndownData, setBurndownData] = useState<{
    timeline: TimeData[];
    totalEstimate: number;
    totalSpent: number;
  }>({
    timeline: [],
    totalEstimate: 0,
    totalSpent: 0,
  });
  const [completedIssues, setCompletedIssues] = useState<CompletedIssuesByDate[]>([]);
  const [sprintInfo, setSprintInfo] = useState<Array<{ boardId: string; sprintName: string; startDate?: string; endDate?: string }>>([]);
  const [sprintDates, setSprintDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [allSprintIssues, setAllSprintIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateChart = async () => {
    if (selectedBoardIds.length === 0) {
      setError('Please select at least one board');
      return;
    }

    if (!isJiraConfigured) {
      setError(t('jiraNotConfigured'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/burndown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIds: selectedBoardIds,
          domain: settings.jiraConfig.domain,
          email: settings.jiraConfig.email,
          apiToken: settings.jiraConfig.apiToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate burndown chart');
      }

      const data = await response.json();
      setBurndownData({
        timeline: data.timeline,
        totalEstimate: data.totalEstimate,
        totalSpent: data.totalSpent,
      });
      setCompletedIssues(data.completedIssuesByDate || []);
      setSprintInfo(data.sprintInfo || []);
      setSprintDates({
        startDate: data.sprintStartDate,
        endDate: data.sprintEndDate,
      });
      setAllSprintIssues(data.allIssues || []);

      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-heading">
            {t('appTitle')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('appSubtitle')}
          </p>

        </div>

        {/* Board Selection */}
        <div className="mb-6">
          <BoardSelector onBoardsSelected={setSelectedBoardIds} />
        </div>

        {/* Generate Button */}
        <div className="mb-6">
          <button
            onClick={handleGenerateChart}
            disabled={loading || selectedBoardIds.length === 0}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${loading || selectedBoardIds.length === 0
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-700 shadow-md hover:shadow-lg'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('generatingChart')}
              </span>
            ) : (
              t('generateChart')
            )}
          </button>

          {selectedBoardIds.length === 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('enterBoardHint')}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
        {sprintInfo.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {sprintInfo.map((info, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                >
                  Board {info.boardId}: {info.sprintName}
                </span>
              ))}
            </div>
            {sprintDates.startDate && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{t('sprintTimeline')}:</span>{' '}
                {new Date(sprintDates.startDate).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {sprintDates.endDate
                  ? new Date(sprintDates.endDate).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                  : t('noEndDate')}
              </div>
            )}
          </div>
        )}
        {/* Burndown Chart */}
        <BurndownChart
          timeline={burndownData.timeline}
          totalEstimate={burndownData.totalEstimate}
          totalSpent={burndownData.totalSpent}
          allIssues={allSprintIssues}
        />

        {/* Sprint Issues List */}
        {allSprintIssues.length > 0 && (
          <div className="mt-6">
            <SprintIssuesList issues={allSprintIssues} />
          </div>
        )}

        {/* Completed Issues List */}
        {completedIssues.length > 0 && (
          <div className="mt-6">
            <CompletedIssuesList completedIssuesByDate={completedIssues} />
          </div>
        )}
      </div>
    </div>
  );
}
