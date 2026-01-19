'use client';

import { useState } from 'react';
import { JiraIssue } from '@/types/jira';
import { formatTimeEstimate } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

interface SprintIssuesListProps {
  issues: JiraIssue[];
}

export default function SprintIssuesList({ issues }: SprintIssuesListProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Debug logging
  console.log('=== SPRINT ISSUES LIST DEBUG ===');
  console.log('Total issues received:', issues.length);
  console.log('All issue keys:', issues.map(i => i.key).join(', '));

  // Get all issue keys in sprint for quick lookup
  const issueKeysInSprint = new Set(issues.map(i => i.key));

  // Separate parent and child issues
  // Parent issues = no parent field OR parent not in current sprint (orphan subtasks)
  const allParentIssues = issues.filter(issue => {
    if (!issue.fields.parent) {
      return true; // True parent issue
    }
    // Check if parent is in current sprint
    const parentKey = issue.fields.parent.key;
    const isOrphan = !issueKeysInSprint.has(parentKey);
    return isOrphan; // Orphan subtask = treat as parent
  });

  // Child issues = has parent AND parent is in current sprint
  const childIssues = issues.filter(issue => {
    if (!issue.fields.parent) {
      return false;
    }
    const parentKey = issue.fields.parent.key;
    return issueKeysInSprint.has(parentKey);
  });

  console.log('Parent issues (including orphans):', allParentIssues.length, '-', allParentIssues.map(i => i.key).sort().join(', '));
  console.log('Child issues (parent in sprint):', childIssues.length, '-', childIssues.map(i => i.key).sort().join(', '));

  // Log orphan subtasks specifically
  const orphanSubtasks = issues.filter(issue => {
    if (!issue.fields.parent) return false;
    const parentKey = issue.fields.parent.key;
    return !issueKeysInSprint.has(parentKey);
  });
  if (orphanSubtasks.length > 0) {
    console.log('⚠️ Orphan subtasks (parent not in sprint):', orphanSubtasks.length, '-', orphanSubtasks.map(i => `${i.key} (parent: ${i.fields.parent?.key})`).join(', '));
  }

  // Group child issues by parent key
  const childrenByParent = childIssues.reduce((acc, issue) => {
    const parentKey = issue.fields.parent?.key;
    if (parentKey) {
      if (!acc[parentKey]) {
        acc[parentKey] = [];
      }
      acc[parentKey].push(issue);
    }
    return acc;
  }, {} as Record<string, JiraIssue[]>);

  // Extract all unique assignees from all issues (parents + children)
  const allAssignees = Array.from(
    new Set(
      issues
        .map(issue => issue.fields.assignee?.displayName)
        .filter(Boolean)
    )
  ).sort();

  // Filter issues by selected assignee
  const filterIssuesByAssignee = (issues: JiraIssue[]): JiraIssue[] => {
    if (selectedAssignee === 'all') {
      return issues;
    }

    return issues.filter(issue => {
      const issueAssignee = issue.fields.assignee?.displayName;

      // If this is a parent issue, check if it or any of its children match
      if (!issue.fields.parent || !issueKeysInSprint.has(issue.fields.parent.key)) {
        // Check if parent matches
        if (issueAssignee === selectedAssignee) {
          return true;
        }

        // Check if any child matches
        const children = childrenByParent[issue.key] || [];
        return children.some(child => child.fields.assignee?.displayName === selectedAssignee);
      }

      // For child issues, only show if assigned to selected user
      return issueAssignee === selectedAssignee;
    });
  };

  // Apply assignee filter to parent issues
  const parentIssues = filterIssuesByAssignee(allParentIssues);

  // Calculate filtered child count
  const filteredChildCount = selectedAssignee === 'all'
    ? childIssues.length
    : childIssues.filter(child => child.fields.assignee?.displayName === selectedAssignee).length;

  const toggleExpand = (issueKey: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueKey)) {
      newExpanded.delete(issueKey);
    } else {
      newExpanded.add(issueKey);
    }
    setExpandedIssues(newExpanded);
  };

  const expandAll = () => {
    const allParentKeys = parentIssues
      .filter(issue => (childrenByParent[issue.key] || []).length > 0)
      .map(issue => issue.key);
    setExpandedIssues(new Set(allParentKeys));
  };

  const collapseAll = () => {
    setExpandedIssues(new Set());
  };

  if (parentIssues.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 font-heading">
          {t('sprintIssues')}
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

  // Group issues by project
  const issuesByProject = parentIssues.reduce((acc, issue) => {
    const projectKey = getProjectKey(issue.key);
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(issue);
    return acc;
  }, {} as Record<string, JiraIssue[]>);

  // Sort projects alphabetically
  const sortedProjects = Object.keys(issuesByProject).sort();

  // Helper function to check if issue was carried over from previous sprint
  const isCarriedOver = (issue: JiraIssue): boolean => {
    const sprints = issue.fields.sprint;

    // Check if sprints exists and is an array
    if (!sprints || !Array.isArray(sprints) || sprints.length <= 1) return false;

    // If issue has multiple sprints, it was carried over
    // We check if there's at least one completed sprint in the history
    return sprints.some(sprint => sprint.state === 'closed');
  };

  // Calculate total estimate for filtered issues (parent + children)
  const totalEstimate = (() => {
    if (selectedAssignee === 'all') {
      return issues.reduce((sum, issue) => {
        return sum + (issue.fields.timetracking?.originalEstimateSeconds || 0);
      }, 0);
    }

    // Calculate estimate for filtered parent issues
    let total = parentIssues.reduce((sum, issue) => {
      return sum + (issue.fields.timetracking?.originalEstimateSeconds || 0);
    }, 0);

    // Add estimate for filtered child issues
    total += childIssues
      .filter(child => child.fields.assignee?.displayName === selectedAssignee)
      .reduce((sum, child) => {
        return sum + (child.fields.timetracking?.originalEstimateSeconds || 0);
      }, 0);

    return total;
  })();

  const hasAnySubtasks = childIssues.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      {/* Debug Info */}
      <details className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
        <summary className="cursor-pointer text-sm font-semibold text-yellow-900 dark:text-yellow-200">
          🔍 {t('debugIssues')}
        </summary>
        <div className="mt-2 text-xs space-y-2">
          <div>
            <strong>{t('debugTotalReceived')}:</strong> {issues.length}
          </div>
          <div>
            <strong>{t('debugParentIssues')}:</strong> {allParentIssues.length} ({parentIssues.length} {settings.language === 'vi' ? 'sau lọc' : 'filtered'}) - {allParentIssues.map(i => i.key).sort().join(', ')}
          </div>
          <div>
            <strong>{t('debugChildIssues')}:</strong> {childIssues.length} - {childIssues.map(i => i.key).sort().join(', ')}
          </div>
          {orphanSubtasks.length > 0 && (
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-300 dark:border-purple-800">
              <strong className="text-purple-900 dark:text-purple-200">{t('debugOrphanSubtasks')}:</strong> {orphanSubtasks.length}
              <div className="mt-1 font-mono text-xs text-purple-800 dark:text-purple-300">
                {orphanSubtasks.map(i => `${i.key} (parent: ${i.fields.parent?.key})`).join(', ')}
              </div>
            </div>
          )}
          <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded border border-yellow-300 dark:border-yellow-700">
            <strong>{t('debugAllIssues')}:</strong>
            <div className="mt-1 font-mono text-xs text-gray-800 dark:text-gray-300">
              {issues.map(i => i.key).sort().join(', ')}
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            💡 {t('debugCompareTip')}
          </div>
        </div>
      </details>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-heading">
          {t('sprintIssues')}
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Assignee Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="assignee-filter" className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {settings.language === 'vi' ? '👤 Người thực hiện:' : '👤 Assignee:'}
            </label>
            <select
              id="assignee-filter"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600"
            >
              <option value="all">{settings.language === 'vi' ? 'Tất cả' : 'All'}</option>
              {allAssignees.map(assignee => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          {hasAnySubtasks && (
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs px-2 py-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded border border-primary-300 dark:border-primary-700"
                title={t('expandAll')}
              >
                {t('expandAll')}
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                title={t('collapseAll')}
              >
                {t('collapseAll')}
              </button>
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              {parentIssues.length} {t('parent')} • {filteredChildCount} {t('subtasks')}
            </span>
            <span className="ml-2 font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              {t('totalEstimateLabel')}: {formatTimeEstimate(totalEstimate)}
            </span>
          </div>
        </div>
      </div>

      {/* Group by project */}
      {sortedProjects.map((projectKey) => {
        const projectIssues = issuesByProject[projectKey];
        const sortedProjectIssues = [...projectIssues].sort((a, b) => a.key.localeCompare(b.key));

        // Calculate estimate including subtasks
        let projectEstimate = 0;
        let projectDoneCount = 0;
        let projectTotalCount = 0;

        projectIssues.forEach(issue => {
          projectEstimate += issue.fields.timetracking?.originalEstimateSeconds || 0;
          projectTotalCount++;
          if (issue.fields.status.statusCategory.key === 'done') projectDoneCount++;

          // Add subtasks
          const children = childrenByParent[issue.key] || [];
          children.forEach(child => {
            projectEstimate += child.fields.timetracking?.originalEstimateSeconds || 0;
            projectTotalCount++;
            if (child.fields.status.statusCategory.key === 'done') projectDoneCount++;
          });
        });

        return (
          <div key={projectKey} className="mb-6 last:mb-0">
            {/* Project header */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-t-lg border-b-2 border-primary-500 dark:border-primary-600">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{projectKey}</h3>
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {projectDoneCount}/{projectTotalCount} {t('completed')}
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 font-medium">
                    {formatTimeEstimate(projectEstimate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Issues table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('code')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('title')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('assignee')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('timeEstimate')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('timeSpent')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('timeRemaining')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('lastUpdated')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedProjectIssues.map((issue) => {
                    const estimate = issue.fields.timetracking?.originalEstimateSeconds || 0;
                    const timeSpent = issue.fields.timetracking?.timeSpentSeconds || 0;
                    const timeRemaining = issue.fields.timetracking?.remainingEstimateSeconds || 0;
                    const lastUpdated = issue.fields.updated;
                    const isDone = issue.fields.status.statusCategory.key === 'done';
                    const carriedOver = isCarriedOver(issue);
                    const children = childrenByParent[issue.key] || [];
                    const hasChildren = children.length > 0;
                    const isExpanded = expandedIssues.has(issue.key);

                    // Check if this is an orphan subtask (has parent but parent not in sprint)
                    const isOrphan = issue.fields.parent && !issueKeysInSprint.has(issue.fields.parent.key);

                    return (
                      <>
                        {/* Parent Issue Row */}
                        <tr key={issue.key} className={isDone ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {hasChildren && (
                                <button
                                  onClick={() => toggleExpand(issue.key)}
                                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-transform"
                                  title={isExpanded ? t('collapseAll') : t('expandAll')}
                                >
                                  <svg
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                              <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">
                                {issue.key}
                              </span>
                              {hasChildren && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  {children.length}
                                </span>
                              )}
                              {isOrphan && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title={`${t('subtask')} ${issue.fields.parent?.key}`}>
                                  ⬆ {issue.fields.parent?.key}
                                </span>
                              )}
                              {carriedOver && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" title={t('carriedOver')}>
                                  ↻
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {issue.fields.summary}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isDone
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                              }`}
                            >
                              {issue.fields.status.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {issue.fields.assignee?.displayName || t('unassigned')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                            {estimate > 0 ? formatTimeEstimate(estimate) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                            {timeSpent > 0 ? formatTimeEstimate(timeSpent) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                            {timeRemaining > 0 ? formatTimeEstimate(timeRemaining) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {new Date(lastUpdated).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>

                        {/* Subtasks Rows */}
                        {isExpanded && hasChildren && children
                          .filter(child => {
                            // If a specific assignee is selected, only show subtasks assigned to that user
                            if (selectedAssignee === 'all') {
                              return true;
                            }
                            return child.fields.assignee?.displayName === selectedAssignee;
                          })
                          .map((child) => {
                          const childEstimate = child.fields.timetracking?.originalEstimateSeconds || 0;
                          const childTimeSpent = child.fields.timetracking?.timeSpentSeconds || 0;
                          const childTimeRemaining = child.fields.timetracking?.remainingEstimateSeconds || 0;
                          const childLastUpdated = child.fields.updated;
                          const childIsDone = child.fields.status.statusCategory.key === 'done';

                          return (
                            <tr
                              key={child.key}
                              className={`${childIsDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/30'} border-l-4 border-primary-300 dark:border-primary-700`}
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-2 pl-6">
                                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                    {child.key}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="text-xs text-gray-700 dark:text-gray-300">
                                  {child.fields.summary}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    childIsDone
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                                  }`}
                                >
                                  {child.fields.status.name}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                {child.fields.assignee?.displayName || t('unassigned')}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600 dark:text-gray-400">
                                {childEstimate > 0 ? formatTimeEstimate(childEstimate) : '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600 dark:text-gray-400">
                                {childTimeSpent > 0 ? formatTimeEstimate(childTimeSpent) : '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600 dark:text-gray-400">
                                {childTimeRemaining > 0 ? formatTimeEstimate(childTimeRemaining) : '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                {new Date(childLastUpdated).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center text-sm flex-wrap gap-3">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">{t('done')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">{t('inProgress')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-50 dark:bg-gray-700/30 border-l-4 border-primary-300 dark:border-primary-700 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">{t('subtask')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">⬆ MXD-XX</span>
              <span className="text-gray-600 dark:text-gray-400">{t('orphanSubtask')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">↻</span>
              <span className="text-gray-600 dark:text-gray-400">{t('carriedOver')}</span>
            </div>
          </div>
          <div className="text-gray-700 dark:text-gray-300 font-medium">
            {t('issuesCompletedCount', {
              completed: issues.filter(i => i.fields.status.statusCategory.key === 'done').length,
              total: issues.length
            })}
          </div>
        </div>
        {hasAnySubtasks && (
          <div className="text-xs text-gray-700 dark:text-gray-300 bg-primary-50 dark:bg-primary-900/20 rounded p-2 border border-primary-200 dark:border-primary-800">
            💡 {t('subtaskTip')}
          </div>
        )}
        {orphanSubtasks.length > 0 && (
          <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded p-2 border border-purple-200 dark:border-purple-800">
            ℹ️ {t('orphanWarning', { count: orphanSubtasks.length })}
          </div>
        )}
      </div>
    </div>
  );
}
