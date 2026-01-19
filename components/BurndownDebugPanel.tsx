'use client';

import { useState } from 'react';
import { JiraIssue, TimeData } from '@/types/jira';
import { format, parseISO } from 'date-fns';
import { secondsToHours } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import ChangelogTest from './ChangelogTest';

interface BurndownDebugPanelProps {
  allIssues: JiraIssue[];
  timeline: TimeData[];
  totalEstimate: number;
  totalSpent: number;
}

export default function BurndownDebugPanel({
  allIssues,
  timeline,
  totalEstimate,
  totalSpent,
}: BurndownDebugPanelProps) {
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  // Debug logging
  console.log('=== BURNDOWN DEBUG PANEL ===');
  console.log('Total issues received:', allIssues.length);
  console.log('Issues with changelog field:', allIssues.filter(i => i.changelog).length);
  console.log('Issues with changelog histories:', allIssues.filter(i => i.changelog && i.changelog.histories && i.changelog.histories.length > 0).length);

  // Log detailed info for each issue
  allIssues.forEach((issue, idx) => {
    if (idx < 3) { // Log first 3 issues
      console.log(`Issue ${issue.key}:`, {
        hasChangelog: !!issue.changelog,
        changelogStructure: issue.changelog ? Object.keys(issue.changelog) : 'N/A',
        historiesLength: issue.changelog?.histories?.length || 0,
        total: issue.changelog?.total,
      });
    }
  });

  const sampleWithChangelog = allIssues.find(i => i.changelog && i.changelog.histories && i.changelog.histories.length > 0);
  console.log('Sample issue with changelog:', sampleWithChangelog ? {
    key: sampleWithChangelog.key,
    changelogTotal: sampleWithChangelog.changelog?.total,
    historiesLength: sampleWithChangelog.changelog?.histories?.length,
    firstHistory: sampleWithChangelog.changelog?.histories?.[0],
  } : 'NONE FOUND');

  if (allIssues.length === 0) return null;

  // Get selected issue data
  const issue = selectedIssue ? allIssues.find(i => i.key === selectedIssue) : null;

  // Debug selected issue
  if (issue) {
    console.log('=== SELECTED ISSUE DEBUG ===');
    console.log('Selected issue key:', issue.key);
    console.log('Has changelog:', !!issue.changelog);
    console.log('Changelog structure:', issue.changelog ? {
      keys: Object.keys(issue.changelog),
      total: issue.changelog.total,
      maxResults: issue.changelog.maxResults,
      startAt: issue.changelog.startAt,
      hasHistories: 'histories' in issue.changelog,
      historiesIsArray: Array.isArray(issue.changelog.histories),
      historiesLength: issue.changelog.histories?.length || 0,
    } : 'NO CHANGELOG');

    if (issue.changelog && issue.changelog.histories) {
      console.log('First 3 histories:', issue.changelog.histories.slice(0, 3));
    }
  }

  return (
    <div className="mb-6 border border-yellow-300 dark:border-yellow-700 rounded-lg overflow-hidden bg-yellow-50 dark:bg-yellow-900/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 hover:from-yellow-200 hover:to-amber-200 dark:hover:from-yellow-900/40 dark:hover:to-amber-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-yellow-700 dark:text-yellow-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-700 dark:text-yellow-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 002.248-2.354M12 12.75a2.25 2.25 0 01-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 00-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 01.4-2.253M12 8.25a2.25 2.25 0 00-2.248 2.146M12 8.25a2.25 2.25 0 012.248 2.146M8.683 5a6.032 6.032 0 01-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0115.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 00-.575-1.752M4.921 6a24.048 24.048 0 00-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 01-5.223 1.082" />
            </svg>
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
              🔬 {settings.language === 'vi' ? 'Debug: Luồng Dữ Liệu Burndown' : 'Debug: Burndown Data Flow'}
            </h3>
          </div>
        </div>
        <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
          {isExpanded ? (settings.language === 'vi' ? 'Thu gọn' : 'Collapse') : (settings.language === 'vi' ? 'Xem chi tiết' : 'Expand')}
        </span>
      </button>

      {isExpanded && (
        <div className="p-6 bg-white dark:bg-gray-800 space-y-6">
          {/* Changelog API Test */}
          <ChangelogTest />

          {/* Step 1: Raw Issues from Jira */}
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              {settings.language === 'vi' ? 'Raw Issues từ Jira API' : 'Raw Issues from Jira API'}
            </h4>
            <div className="space-y-3">
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-2">
                  {settings.language === 'vi' ? 'Tổng số issues trong sprint:' : 'Total issues in sprint:'} <span className="text-lg font-bold">{allIssues.length}</span>
                </p>
                <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-300 dark:border-blue-700">
                  <p className="font-mono text-xs mb-2 text-gray-600 dark:text-gray-400">
                    GET /rest/api/3/search?jql=sprint={'{'}sprintId{'}'}&expand=changelog
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-semibold">Fields trả về:</span>
                      <ul className="list-disc list-inside ml-2 text-gray-700 dark:text-gray-300">
                        <li>key (e.g., PROJ-123)</li>
                        <li>summary (title)</li>
                        <li>status.name</li>
                        <li>assignee.displayName</li>
                        <li>timetracking.*</li>
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold">Time tracking fields:</span>
                      <ul className="list-disc list-inside ml-2 text-gray-700 dark:text-gray-300">
                        <li>originalEstimateSeconds</li>
                        <li>remainingEstimateSeconds</li>
                        <li>timeSpentSeconds</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issue Selector */}
              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                  {settings.language === 'vi' ? 'Chọn issue để xem chi tiết:' : 'Select issue to view details:'}
                </label>
                <select
                  value={selectedIssue || ''}
                  onChange={(e) => setSelectedIssue(e.target.value || null)}
                  className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="">{settings.language === 'vi' ? '-- Chọn issue --' : '-- Select issue --'}</option>
                  {allIssues.map(issue => (
                    <option key={issue.key} value={issue.key}>
                      {issue.key} - {issue.fields.summary} ({issue.fields.status.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Issue Details */}
              {issue && (
                <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-300 dark:border-blue-700">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">{issue.key} - {issue.fields.summary}</h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p><span className="font-semibold">Status:</span> {issue.fields.status.name} ({issue.fields.status.statusCategory.key})</p>
                      <p><span className="font-semibold">Assignee:</span> {issue.fields.assignee?.displayName || 'Unassigned'}</p>
                      <p><span className="font-semibold">Created:</span> {format(parseISO(issue.fields.created), 'dd/MM/yyyy HH:mm')}</p>
                      <p><span className="font-semibold">Updated:</span> {format(parseISO(issue.fields.updated), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-700 dark:text-blue-300">Time Tracking:</p>
                      <p>• Original Estimate: <span className="font-mono">{secondsToHours(issue.fields.timetracking?.originalEstimateSeconds || 0).toFixed(1)}h</span> ({issue.fields.timetracking?.originalEstimateSeconds || 0}s)</p>
                      <p>• Time Spent: <span className="font-mono">{secondsToHours(issue.fields.timetracking?.timeSpentSeconds || 0).toFixed(1)}h</span> ({issue.fields.timetracking?.timeSpentSeconds || 0}s)</p>
                      <p>• Remaining: <span className="font-mono">{secondsToHours(issue.fields.timetracking?.remainingEstimateSeconds || 0).toFixed(1)}h</span> ({issue.fields.timetracking?.remainingEstimateSeconds || 0}s)</p>
                    </div>
                  </div>

                  {/* Changelog Debug Info */}
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Changelog Status:</p>
                    <div className="space-y-1 text-xs">
                      <p>• Has changelog field: <span className={issue.changelog ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{issue.changelog ? 'YES ✓' : 'NO ✗'}</span></p>
                      {issue.changelog && (
                        <>
                          <p>• Total history events: <span className="font-mono font-bold">{issue.changelog.histories?.length || 0}</span></p>
                          {issue.changelog.histories && issue.changelog.histories.length > 0 && (
                            <>
                              <p>• Estimate changes: <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {issue.changelog.histories.filter(h =>
                                  h.items.some(item => {
                                    const f = item.field.toLowerCase();
                                    return f === 'timeoriginalestimate' || f === 'original estimate' || f === 'timeestimate' || f === 'remaining estimate';
                                  })
                                ).length}
                              </span></p>
                              <p>• Time Spent changes: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {issue.changelog.histories.filter(h =>
                                  h.items.some(item => {
                                    const f = item.field.toLowerCase();
                                    return f === 'timespent' || f === 'time spent';
                                  })
                                ).length}
                              </span> ⏱️</p>
                              <p>• Sprint changes: <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                {issue.changelog.histories.filter(h =>
                                  h.items.some(item => item.field.toLowerCase() === 'sprint')
                                ).length}
                              </span></p>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Changelog Parsing */}
          {issue && (
            <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-3 flex items-center gap-2">
                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                {settings.language === 'vi' ? 'Changelog Events (Lịch sử thay đổi)' : 'Changelog Events (Change History)'}
              </h4>
              <div className="space-y-3">
                {issue.changelog && issue.changelog.histories && issue.changelog.histories.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        {settings.language === 'vi' ? 'Tổng số sự kiện:' : 'Total events:'} <span className="font-bold">{issue.changelog.histories.length}</span>
                      </p>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {issue.changelog.histories.filter(h =>
                          h.items.some(item => {
                            const f = item.field.toLowerCase();
                            return f === 'timeoriginalestimate' || f === 'original estimate' || f === 'timeestimate' || f === 'remaining estimate';
                          })
                        ).length} Estimate
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {issue.changelog.histories.filter(h =>
                          h.items.some(item => {
                            const f = item.field.toLowerCase();
                            return f === 'timespent' || f === 'time spent';
                          })
                        ).length} Time Spent ⏱️
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 rounded text-xs font-semibold text-green-700 dark:text-green-300">
                        {issue.changelog.histories.filter(h =>
                          h.items.some(item => item.field.toLowerCase() === 'sprint')
                        ).length} Sprint
                      </span>
                    </div>
                    <div className="mb-2 flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300 dark:border-purple-700">
                        💡 {settings.language === 'vi' ? 'Chỉ hiển thị events có thay đổi Estimate, Time Spent hoặc Sprint' : 'Showing only events with Estimate, Time Spent or Sprint changes'}
                      </span>
                    </div>
                    {(() => {
                      const relevantEvents = issue.changelog.histories.filter(h =>
                        h.items.some(item => {
                          const fieldLower = item.field.toLowerCase();
                          return (
                            fieldLower === 'timeoriginalestimate' ||
                            fieldLower === 'original estimate' ||
                            fieldLower === 'timeestimate' ||
                            fieldLower === 'remaining estimate' ||
                            fieldLower === 'timespent' ||
                            fieldLower === 'time spent' ||
                            fieldLower === 'sprint'
                          );
                        })
                      );

                      if (relevantEvents.length === 0) {
                        return (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs">
                            <p className="text-yellow-800 dark:text-yellow-300">
                              ⚠️ {settings.language === 'vi'
                                ? 'Issue này có changelog nhưng không có thay đổi Estimate, Time Spent hoặc Sprint.'
                                : 'This issue has changelog but no Estimate, Time Spent or Sprint changes.'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {relevantEvents.map((history, idx) => {
                            const relevantChanges = history.items.filter(item => {
                              const fieldLower = item.field.toLowerCase();
                              return (
                                fieldLower === 'timeoriginalestimate' ||
                                fieldLower === 'original estimate' ||
                                fieldLower === 'timeestimate' ||
                                fieldLower === 'remaining estimate' ||
                                fieldLower === 'timespent' ||
                                fieldLower === 'time spent' ||
                                fieldLower === 'sprint'
                              );
                            });

                        return (
                          <div key={history.id} className="bg-white dark:bg-gray-800 rounded p-3 border border-purple-300 dark:border-purple-700 text-xs">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-purple-900 dark:text-purple-200">
                                Event #{idx + 1}
                              </span>
                              <span className="text-purple-600 dark:text-purple-400 font-mono">
                                {format(parseISO(history.created), 'dd/MM/yyyy HH:mm:ss')}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {relevantChanges.map((item, itemIdx) => {
                                const fieldLower = item.field.toLowerCase();
                                const isTimeSpent = fieldLower === 'timespent' || fieldLower === 'time spent';
                                const isSprint = fieldLower === 'sprint';

                                return (
                                  <div key={itemIdx} className={`p-2 rounded ${
                                    isTimeSpent
                                      ? 'bg-blue-50 dark:bg-blue-900/30'
                                      : 'bg-purple-50 dark:bg-purple-900/30'
                                  }`}>
                                    <p className={`font-semibold ${
                                      isTimeSpent
                                        ? 'text-blue-800 dark:text-blue-300'
                                        : 'text-purple-800 dark:text-purple-300'
                                    }`}>
                                      {item.field}
                                      {isTimeSpent && ' ⏱️'}
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-300">
                                      From: <span className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">{item.fromString || item.from || 'null'}</span>
                                      {' → '}
                                      To: <span className="font-mono bg-green-100 dark:bg-green-900/30 px-1 rounded">{item.toString || item.to || 'null'}</span>
                                    </p>
                                    {isSprint && (
                                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        💡 Issue {item.toString ? 'added to' : 'removed from'} sprint
                                      </p>
                                    )}
                                    {isTimeSpent && (item.toString || item.to) && (item.fromString || item.from) && (
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        📝 Work logged: {item.toString || item.to}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      ❌ {settings.language === 'vi' ? 'Không có changelog data' : 'No changelog data'}
                    </p>
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-700">
                      <p className="font-semibold mb-2">Debug info:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Issue has changelog field: <strong>{issue.changelog ? 'YES' : 'NO'}</strong></li>
                        {issue.changelog && (
                          <>
                            <li>Changelog has histories field: <strong>{('histories' in issue.changelog) ? 'YES' : 'NO'}</strong></li>
                            <li>Histories is array: <strong>{Array.isArray(issue.changelog.histories) ? 'YES' : 'NO'}</strong></li>
                            <li>Histories length: <strong>{issue.changelog.histories?.length || 0}</strong></li>
                            <li>Changelog keys: <strong>{Object.keys(issue.changelog).join(', ')}</strong></li>
                          </>
                        )}
                      </ul>
                      <p className="mt-2 text-xs">
                        💡 {settings.language === 'vi'
                          ? 'Nếu vấn đề tiếp tục, kiểm tra server logs để verify API response.'
                          : 'If this persists, check server logs to verify API response.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Timeline Construction */}
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
              <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              {settings.language === 'vi' ? 'Timeline Construction (Xây dựng timeline)' : 'Timeline Construction'}
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-green-800 dark:text-green-300">
                {settings.language === 'vi'
                  ? 'Từ changelog events, hệ thống tính toán remaining work cho mỗi ngày:'
                  : 'From changelog events, the system calculates remaining work for each day:'}
              </p>

              <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-300 dark:border-green-700 text-xs">
                <p className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  {settings.language === 'vi' ? 'Công thức tính:' : 'Calculation Formula:'}
                </p>
                <div className="space-y-2 font-mono text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  {settings.timeCalculationMethod === 'original' ? (
                    <>
                      <p className="text-blue-600 dark:text-blue-400">// Method: Original Estimate</p>
                      <p>remainingWork[day] = Sum(originalEstimate) - Sum(completed)</p>
                      <p className="text-gray-600 dark:text-gray-400">// Tracks scope changes, estimates from changelog history</p>
                    </>
                  ) : (
                    <>
                      <p className="text-blue-600 dark:text-blue-400">// Method: Remaining Estimate</p>
                      <p>remainingWork[day] = Sum(remainingEstimate, Done = 0)</p>
                      <p className="text-gray-600 dark:text-gray-400">// Jira auto-updates, reflects actual work left</p>
                    </>
                  )}
                  <p className="text-blue-600 dark:text-blue-400 mt-2">// Time Spent</p>
                  <p>timeSpent[day] = Sum(Done by date) + Sum(In Progress)</p>
                  <p className="text-gray-600 dark:text-gray-400">// Accumulates as issues are completed</p>
                  <p className="text-blue-600 dark:text-blue-400 mt-2">// Delta</p>
                  <p>delta[day] = remaining[day] - remaining[day-1]</p>
                  <p className="text-gray-600 dark:text-gray-400">// Negative = work done, Positive = scope added</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-300 dark:border-green-700">
                <p className="font-semibold text-green-900 dark:text-green-200 mb-2 text-sm">
                  {settings.language === 'vi' ? 'Timeline Data Points:' : 'Timeline Data Points:'} {timeline.length} {settings.language === 'vi' ? 'ngày' : 'days'}
                </p>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-green-100 dark:bg-green-900/40">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Spent (h)</th>
                        <th className="text-right p-2">Estimate (h)</th>
                        <th className="text-right p-2">Remaining (h)</th>
                        <th className="text-right p-2">Delta</th>
                        <th className="text-left p-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((day, idx) => (
                        <tr key={day.date} className="border-t border-green-200 dark:border-green-800">
                          <td className="p-2 font-mono">{format(parseISO(day.date), 'dd/MM')}</td>
                          <td className="p-2 text-right font-mono text-green-600 dark:text-green-400">
                            {secondsToHours(day.timeSpentSeconds).toFixed(1)}
                          </td>
                          <td className="p-2 text-right font-mono text-blue-600 dark:text-blue-400">
                            {secondsToHours(day.timeEstimateSeconds).toFixed(1)}
                          </td>
                          <td className="p-2 text-right font-mono text-orange-600 dark:text-orange-400">
                            {secondsToHours(day.remainingWorkSeconds).toFixed(1)}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {idx > 0 && day.deltaSeconds ? (
                              <span
                                className={day.deltaSeconds < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                              >
                                {day.deltaSeconds < 0 ? '↓' : '↑'}{secondsToHours(Math.abs(day.deltaSeconds)).toFixed(1)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-2 text-xs text-gray-700 dark:text-gray-400">
                            {idx > 0 && day.deltaReason ? day.deltaReason : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Summary Calculations */}
          <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
            <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-3 flex items-center gap-2">
              <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              {settings.language === 'vi' ? 'Summary Calculations (Tổng kết)' : 'Summary Calculations'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded p-3 border border-orange-300 dark:border-orange-700">
                <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 mb-2">
                  {settings.language === 'vi' ? 'Tổng Issues' : 'Total Issues'}
                </p>
                <div className="space-y-1 text-xs text-orange-800 dark:text-orange-300">
                  <p>• Total: {allIssues.length}</p>
                  <p>• Done: {allIssues.filter(i => i.fields.status.statusCategory.key === 'done').length}</p>
                  <p>• In Progress: {allIssues.filter(i => i.fields.status.statusCategory.key === 'indeterminate').length}</p>
                  <p>• To Do: {allIssues.filter(i => i.fields.status.statusCategory.key === 'new').length}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-3 border border-orange-300 dark:border-orange-700">
                <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 mb-2">
                  {settings.language === 'vi' ? 'Tổng Time' : 'Total Time'}
                </p>
                <div className="space-y-1 text-xs text-orange-800 dark:text-orange-300">
                  <p>• Total Estimate: <span className="font-mono font-bold">{secondsToHours(totalEstimate).toFixed(1)}h</span></p>
                  <p>• Total Spent: <span className="font-mono font-bold">{secondsToHours(totalSpent).toFixed(1)}h</span></p>
                  <p>• Current Remaining: <span className="font-mono font-bold">
                    {timeline.length > 0 ? secondsToHours(timeline[timeline.length - 1].remainingWorkSeconds).toFixed(1) : 0}h
                  </span></p>
                  <p>• Progress: <span className="font-mono font-bold">
                    {totalEstimate > 0 ? ((totalSpent / totalEstimate) * 100).toFixed(0) : 0}%
                  </span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Tips */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-300 dark:border-indigo-700">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
              💡 {settings.language === 'vi' ? 'Cách Kiểm Tra (Verification)' : 'How to Verify'}
            </h4>
            <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">1.</span>
                <span>
                  {settings.language === 'vi'
                    ? 'So sánh Total Estimate ở đây với tổng trong Jira Sprint Report'
                    : 'Compare Total Estimate here with Jira Sprint Report total'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">2.</span>
                <span>
                  {settings.language === 'vi'
                    ? 'Chọn một issue, check changelog events với Jira Issue History'
                    : 'Select an issue, check changelog events against Jira Issue History'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">3.</span>
                <span>
                  {settings.language === 'vi'
                    ? 'Xem Timeline table, verify Remaining Work giảm khi issues Done'
                    : 'Check Timeline table, verify Remaining Work decreases when issues are Done'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">4.</span>
                <span>
                  {settings.language === 'vi'
                    ? 'So sánh Time Spent với tổng logged time trong Jira'
                    : 'Compare Time Spent with total logged time in Jira'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
