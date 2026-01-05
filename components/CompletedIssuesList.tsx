'use client';

import { CompletedIssuesByDate } from '@/types/jira';
import { format, parseISO } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { formatTimeEstimate } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

interface CompletedIssuesListProps {
  completedIssuesByDate: CompletedIssuesByDate[];
}

export default function CompletedIssuesList({ completedIssuesByDate }: CompletedIssuesListProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);

  if (completedIssuesByDate.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 font-heading">
          {t('completedIssues')}
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('noCompletedIssues')}
        </div>
      </div>
    );
  }

  // Helper function to extract project key from issue key (e.g., "MATRIX-461" -> "MATRIX")
  const getProjectKey = (issueKey: string): string => {
    const match = issueKey.match(/^([A-Z]+)-/);
    return match ? match[1] : 'UNKNOWN';
  };

  const totalCompleted = completedIssuesByDate.reduce(
    (sum, group) => sum + group.issues.length,
    0
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-heading">
          {t('completedIssues')}
        </h2>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
          {totalCompleted} {t('issues')}
        </span>
      </div>

      <div className="space-y-6">
        {completedIssuesByDate.map((group) => {
          // Group issues by project within this date
          const issuesByProject = group.issues.reduce((acc, issue) => {
            const projectKey = getProjectKey(issue.key);
            if (!acc[projectKey]) {
              acc[projectKey] = [];
            }
            acc[projectKey].push(issue);
            return acc;
          }, {} as Record<string, typeof group.issues>);

          const sortedProjects = Object.keys(issuesByProject).sort();

          return (
            <div key={group.date} className="border-l-4 border-green-500 dark:border-green-600 pl-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                {format(parseISO(group.date), 'EEEE, dd MMMM yyyy', { locale: settings.language === 'vi' ? vi : enUS })}
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({group.issues.length} {t('issues')})
                </span>
              </h3>

              {/* Group by project */}
              <div className="space-y-4">
                {sortedProjects.map((projectKey) => {
                  const projectIssues = issuesByProject[projectKey];

                  return (
                    <div key={projectKey}>
                      {/* Project header */}
                      <div className="mb-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 rounded inline-block border border-primary-200 dark:border-primary-800">
                        <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{projectKey}</span>
                        <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">({projectIssues.length})</span>
                      </div>

                      {/* Issues */}
                      <div className="space-y-2">
                        {projectIssues.map((issue) => (
                          <div
                            key={issue.key}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">
                                    {issue.key}
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300">{issue.summary}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                      />
                                    </svg>
                                    <span>{issue.assignee}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="font-medium">
                                      {issue.timeSpent > 0
                                        ? formatTimeEstimate(issue.timeSpent)
                                        : t('noLogged')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
