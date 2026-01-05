'use client';

import { useState } from 'react';
import { TimeData, JiraIssue } from '@/types/jira';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { secondsToHours, formatTimeEstimate } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

interface BurndownChartProps {
  timeline: TimeData[];
  totalEstimate: number;
  totalSpent: number;
  allIssues: JiraIssue[];
}

interface AssigneeStats {
  name: string;
  totalEstimate: number;
  completedEstimate: number;
  remainingEstimate: number;
  issueCount: number;
  completedCount: number;
}

export default function BurndownChart({
  timeline,
  totalEstimate,
  totalSpent,
  allIssues,
}: BurndownChartProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);
  const [showAssigneeStats, setShowAssigneeStats] = useState(false);
  if (timeline.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 font-heading">
          {t('burndownChart')}
        </h2>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('generateChart')}
        </div>
      </div>
    );
  }

  // Transform data for burndown chart
  const today = new Date();
  const chartData = timeline.map((item) => {
    const itemDate = parseISO(item.date);
    const isFuture = itemDate > today;

    return {
      date: format(itemDate, 'dd/MM'),
      fullDate: item.date,
      'Công việc còn lại (giờ)': isFuture ? null : secondsToHours(item.remainingWorkSeconds),
      'Đường lý tưởng (giờ)': secondsToHours(item.idealRemainingSeconds),
      'Issues Completed': item.issuesCompleted,
      'Total Issues': item.totalIssues,
    };
  });

  const totalEstimateHours = secondsToHours(totalEstimate);

  // Calculate completed work from issues that are Done
  const completedIssues = allIssues.filter(
    issue => issue.fields.status.statusCategory.key === 'done'
  );
  const completedWorkSeconds = completedIssues.reduce(
    (sum, issue) => sum + (issue.fields.timetracking?.originalEstimateSeconds || 0),
    0
  );
  const completedWork = secondsToHours(completedWorkSeconds);

  // Find the last non-future date to get current remaining work
  const lastActualData = timeline
    .filter(item => parseISO(item.date) <= today)
    .slice(-1)[0];

  const currentRemaining = lastActualData
    ? secondsToHours(lastActualData.remainingWorkSeconds)
    : totalEstimateHours;

  // Debug logging
  console.log('=== BURNDOWN CHART DEBUG ===');
  console.log('Total issues:', allIssues.length);
  console.log('Completed issues:', completedIssues.length);
  console.log('Total estimate (seconds):', totalEstimate);
  console.log('Total estimate (hours):', totalEstimateHours);
  console.log('Completed work (seconds):', completedWorkSeconds);
  console.log('Completed work (hours):', completedWork);
  console.log('Current remaining (hours):', currentRemaining);
  console.log('Last actual data:', lastActualData);
  console.log('Timeline data points:', timeline.length);

  // Log some sample issues
  console.log('\nSample issues (first 5):');
  allIssues.slice(0, 5).forEach(issue => {
    console.log(`${issue.key}: status=${issue.fields.status.name} (${issue.fields.status.statusCategory.key}), estimate=${issue.fields.timetracking?.originalEstimateSeconds || 0}s`);
  });

  // Log timeline sample
  console.log('\nTimeline sample (last 3 actual days):');
  const actualTimeline = timeline.filter(item => parseISO(item.date) <= today);
  actualTimeline.slice(-3).forEach(item => {
    console.log(`${item.date}: remaining=${item.remainingWorkSeconds}s (${secondsToHours(item.remainingWorkSeconds)}h), ideal=${item.idealRemainingSeconds}s`);
  });

  // Calculate assignee statistics
  const assigneeStatsMap = new Map<string, AssigneeStats>();

  allIssues.forEach(issue => {
    const assigneeName = issue.fields.assignee?.displayName || 'Unassigned';
    const estimate = issue.fields.timetracking?.originalEstimateSeconds || 0;
    const isDone = issue.fields.status.statusCategory.key === 'done';

    if (!assigneeStatsMap.has(assigneeName)) {
      assigneeStatsMap.set(assigneeName, {
        name: assigneeName,
        totalEstimate: 0,
        completedEstimate: 0,
        remainingEstimate: 0,
        issueCount: 0,
        completedCount: 0,
      });
    }

    const stats = assigneeStatsMap.get(assigneeName)!;
    stats.totalEstimate += estimate;
    stats.issueCount += 1;

    if (isDone) {
      stats.completedEstimate += estimate;
      stats.completedCount += 1;
    } else {
      stats.remainingEstimate += estimate;
    }
  });

  const assigneeStats = Array.from(assigneeStatsMap.values())
    .sort((a, b) => b.totalEstimate - a.totalEstimate);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 font-heading">
        {t('burndownChart')}
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-100 dark:border-primary-800">
          <h3 className="text-sm font-medium text-primary-900 dark:text-primary-200 mb-1">
            {t('totalWork')}
          </h3>
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
            {totalEstimateHours.toFixed(1)} {t('hours')}
          </p>
          <p className="text-xs text-primary-600 dark:text-primary-500 mt-1">
            {allIssues.length} {t('issues')}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-200 mb-1">
            {t('completed')}
          </h3>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {completedWork.toFixed(1)} {t('hours')}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            {totalEstimateHours > 0 ? ((completedWork / totalEstimateHours) * 100).toFixed(0) : 0}% • {completedIssues.length} {t('issues')}
          </p>
        </div>
        <div className="bg-cta-50 dark:bg-cta-900/20 rounded-lg p-4 border border-cta-100 dark:border-cta-800">
          <h3 className="text-sm font-medium text-cta-900 dark:text-cta-200 mb-1">
            {t('remaining')}
          </h3>
          <p className="text-2xl font-bold text-cta-700 dark:text-cta-400">
            {currentRemaining.toFixed(1)} {t('hours')}
          </p>
          <p className="text-xs text-cta-600 dark:text-cta-500 mt-1">
            {totalEstimateHours > 0 ? ((currentRemaining / totalEstimateHours) * 100).toFixed(0) : 0}% • {allIssues.length - completedIssues.length} {t('issues')}
          </p>
        </div>
      </div>

      {/* Assignee Statistics - Expandable */}
      <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowAssigneeStats(!showAssigneeStats)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${showAssigneeStats ? 'transform rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('assigneeStats')} ({assigneeStats.length} {t('people')})
            </h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {showAssigneeStats ? t('clickToHide') : t('clickToExpand')}
          </span>
        </button>

        {showAssigneeStats && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {assigneeStats.map((stats) => {
                const completionRate = stats.totalEstimate > 0
                  ? (stats.completedEstimate / stats.totalEstimate) * 100
                  : 0;

                return (
                  <div key={stats.name} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{stats.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stats.completedCount}/{stats.issueCount} {t('issuesCompleted')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatTimeEstimate(stats.totalEstimate)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalEstimate')}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{t('completed')}: {formatTimeEstimate(stats.completedEstimate)}</span>
                        <span>{completionRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-400">{t('completedWork')}: </span>
                        {formatTimeEstimate(stats.completedEstimate)}
                      </div>
                      <div>
                        <span className="font-medium text-cta-700 dark:text-cta-400">{t('remainingWork')}: </span>
                        {formatTimeEstimate(stats.remainingEstimate)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Burndown Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
          {t('chartTitle')}
        </h3>
        <div className="mb-3 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-500 dark:bg-gray-400 opacity-50"></div>
            <span className="text-gray-700 dark:text-gray-300">{t('idealLine')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">{t('remainingTime')}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
              label={{ value: 'Ngày', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              label={{ value: 'Công việc còn lại (giờ)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              domain={[0, totalEstimateHours]}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              formatter={(value: number) => `${value.toFixed(1)} giờ`}
            />
            <Legend />
            <Line
              type="linear"
              dataKey="Đường lý tưởng (giờ)"
              stroke="#9CA3AF"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="Đường lý tưởng"
            />
            <Line
              type="monotone"
              dataKey="Công việc còn lại (giờ)"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#EF4444' }}
              name="Thời gian còn lại"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Debug Information Panel */}
      <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <details className="cursor-pointer">
          <summary className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            🔍 {t('debugInfo')}
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-200">{t('debugOverview')}</p>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-300 mt-1 space-y-1">
                  <li>{t('debugTotalIssues')}: {allIssues.length}</li>
                  <li>{t('debugIssuesDone')}: {completedIssues.length}</li>
                  <li>{t('debugIssuesInProgress')}: {allIssues.length - completedIssues.length}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-200">{t('debugTimeHours')}</p>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-300 mt-1 space-y-1">
                  <li>{t('debugTotalEstimate')}: {totalEstimateHours.toFixed(1)}h</li>
                  <li>{t('completed')}: {completedWork.toFixed(1)}h ({totalEstimateHours > 0 ? ((completedWork / totalEstimateHours) * 100).toFixed(0) : 0}%)</li>
                  <li>{t('remaining')}: {currentRemaining.toFixed(1)}h ({totalEstimateHours > 0 ? ((currentRemaining / totalEstimateHours) * 100).toFixed(0) : 0}%)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-yellow-300 dark:border-yellow-700">
              <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">{t('debugFormulas')}</p>
              <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>• <strong>{t('debugTotalEstimate')}</strong> = {settings.language === 'vi' ? 'Tổng originalEstimateSeconds của TẤT CẢ issues trong sprint' : 'Sum of originalEstimateSeconds of ALL issues in sprint'}</li>
                <li>• <strong>{t('completed')}</strong> = {settings.language === 'vi' ? 'Tổng originalEstimateSeconds của các issues có status.statusCategory.key === \'done\'' : 'Sum of originalEstimateSeconds of issues with status.statusCategory.key === \'done\''}</li>
                <li>• <strong>{t('remaining')}</strong> = {settings.language === 'vi' ? 'Tổng estimate - Đã hoàn thành (tại ngày hiện tại)' : 'Total estimate - Completed (as of current date)'}</li>
                <li>• <strong>{settings.language === 'vi' ? 'Đường đỏ (chart)' : 'Red line (chart)'}</strong> = {settings.language === 'vi' ? 'Còn lại theo từng ngày (giảm khi Done, tăng khi thêm issue)' : 'Remaining by day (decreases when Done, increases when adding issue)'}</li>
                <li>• <strong>{settings.language === 'vi' ? 'Đường xám (chart)' : 'Gray line (chart)'}</strong> = {settings.language === 'vi' ? 'Giảm tuyến tính từ tổng estimate về 0 trong thời gian sprint' : 'Linear decrease from total estimate to 0 over sprint duration'}</li>
              </ul>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
              💡 <strong>{t('debugTip')}</strong>
            </p>
          </div>
        </details>
      </div>

      {/* Explanation */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
        <p className="mb-2"><strong>{t('readingChart')}</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>{t('chartAxisX')}</strong></li>
          <li><strong>{t('chartAxisY')}</strong> (0 - {totalEstimateHours.toFixed(0)} {t('hours')})</li>
          <li><strong className="text-gray-600 dark:text-gray-400">{t('chartIdealLine')}</strong></li>
          <li><strong className="text-red-600 dark:text-red-400">{t('chartActualLine')}</strong></li>
          <li>{t('chartBehind')}</li>
          <li>{t('chartAhead')}</li>
        </ul>
      </div>
    </div>
  );
}
