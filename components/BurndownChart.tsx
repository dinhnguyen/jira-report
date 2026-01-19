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
import { secondsToHours, secondsToWorkingDays, formatTimeEstimate } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';
import BurndownDataTable from './BurndownDataTable';

interface BurndownChartProps {
  timeline: TimeData[];
  totalEstimate: number;
  totalSpent: number;
  allIssues: JiraIssue[];
}

// Custom Tooltip for Burndown Chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload: any;
    color?: string;
  }>;
  label?: string;
  settings: any;
  t: any;
}

const CustomTooltip = ({ active, payload, label, settings, t }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const delta = data['Delta'];
  const deltaReason = data['Delta Reason'];

  return (
    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
      <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map((entry, index) => {
        const hours = entry.value.toFixed(1);
        const days = (entry.value / 8).toFixed(1);
        return (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-mono font-bold">{hours}h</span>
            <span className="text-xs ml-2 opacity-75">({days}d)</span>
          </p>
        );
      })}
      {delta !== 0 && deltaReason && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-xs font-semibold ${delta < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {delta < 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}h ({(Math.abs(delta) / 8).toFixed(1)}d): {deltaReason}
          </p>
        </div>
      )}
      <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {data['Issues Completed']}/{data['Total Issues']} {t('issues')} {t('completed')}
        </p>
      </div>
    </div>
  );
};

export default function BurndownChart({
  timeline,
  totalEstimate,
  totalSpent,
  allIssues,
}: BurndownChartProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);

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

    // Use timeSpentSeconds directly from timeline data
    const timeSpentHours = isFuture ? null : secondsToHours(item.timeSpentSeconds);

    return {
      date: format(itemDate, 'dd/MM'),
      fullDate: item.date,
      'Time Spent': timeSpentHours,
      'Remaining Work': isFuture ? null : secondsToHours(item.remainingWorkSeconds),
      'Ideal Line': secondsToHours(item.idealRemainingSeconds),
      'Issues Completed': item.issuesCompleted,
      'Total Issues': item.totalIssues,
      'Delta': item.deltaSeconds ? secondsToHours(item.deltaSeconds) : 0,
      'Delta Reason': item.deltaReason || '',
    };
  });

  const totalEstimateHours = secondsToHours(totalEstimate);
  const totalEstimateDays = secondsToWorkingDays(totalEstimate);

  // Calculate completed work from issues that are Done
  const completedIssues = allIssues.filter(
    issue => issue.fields.status.statusCategory.key === 'done'
  );
  const completedWorkSeconds = completedIssues.reduce(
    (sum, issue) => sum + (issue.fields.timetracking?.originalEstimateSeconds || 0),
    0
  );
  const completedWork = secondsToHours(completedWorkSeconds);
  const completedWorkDays = secondsToWorkingDays(completedWorkSeconds);

  // Find the last non-future date to get current remaining work
  const lastActualData = timeline
    .filter(item => parseISO(item.date) <= today)
    .slice(-1)[0];

  const currentRemainingSeconds = lastActualData
    ? lastActualData.remainingWorkSeconds
    : totalEstimate;
  const currentRemaining = secondsToHours(currentRemainingSeconds);
  const currentRemainingDays = secondsToWorkingDays(currentRemainingSeconds);

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

  // Get initial total from first day's estimate
  const initialTotal = timeline.length > 0 ? timeline[0].timeEstimateSeconds : 0;

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
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
              {totalEstimateHours.toFixed(1)} {t('hours')}
            </p>
            <p className="text-lg font-semibold text-primary-600 dark:text-primary-500">
              {totalEstimateDays.toFixed(1)}d
            </p>
          </div>
          <p className="text-xs text-primary-600 dark:text-primary-500 mt-1">
            {allIssues.length} {t('issues')}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-200 mb-1">
            {t('completed')}
          </h3>
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {completedWork.toFixed(1)} {t('hours')}
            </p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-500">
              {completedWorkDays.toFixed(1)}d
            </p>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            {totalEstimateHours > 0 ? ((completedWork / totalEstimateHours) * 100).toFixed(0) : 0}% • {completedIssues.length} {t('issues')}
          </p>
        </div>
        <div className="bg-cta-50 dark:bg-cta-900/20 rounded-lg p-4 border border-cta-100 dark:border-cta-800">
          <h3 className="text-sm font-medium text-cta-900 dark:text-cta-200 mb-1">
            {t('remaining')}
          </h3>
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold text-cta-700 dark:text-cta-400">
              {currentRemaining.toFixed(1)} {t('hours')}
            </p>
            <p className="text-lg font-semibold text-cta-600 dark:text-cta-500">
              {currentRemainingDays.toFixed(1)}d
            </p>
          </div>
          <p className="text-xs text-cta-600 dark:text-cta-500 mt-1">
            {totalEstimateHours > 0 ? ((currentRemaining / totalEstimateHours) * 100).toFixed(0) : 0}% • {allIssues.length - completedIssues.length} {t('issues')}
          </p>
        </div>
      </div>

      {/* Burndown Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
          {t('chartTitle')}
        </h3>
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <svg width="24" height="8" className="flex-shrink-0">
              <line x1="0" y1="4" x2="24" y2="4" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">{t('idealLine')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8" className="flex-shrink-0">
              <line x1="0" y1="4" x2="24" y2="4" stroke="#EF4444" strokeWidth="3" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">{t('remainingWorkLine')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8" className="flex-shrink-0">
              <line x1="0" y1="4" x2="24" y2="4" stroke="#3B82F6" strokeWidth="3" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">{t('timeSpentLine')}</span>
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
              label={{ value: settings.language === 'vi' ? 'Ngày' : 'Date', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              label={{
                value: settings.language === 'vi' ? 'Giờ (Hours)' : 'Hours',
                angle: -90,
                position: 'insideLeft'
              }}
              tick={{ fontSize: 12 }}
              domain={[0, 'auto']}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip settings={settings} t={t} />} />
            <Legend />
            {/* Ideal Line - Gray Dashed */}
            <Line
              type="linear"
              dataKey="Ideal Line"
              stroke="#9CA3AF"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name={t('idealLine')}
            />
            {/* Remaining Work - Red Solid */}
            <Line
              type="step"
              dataKey="Remaining Work"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#EF4444' }}
              name={t('remainingWorkLine')}
              connectNulls={false}
            />
            {/* Time Spent - Blue Solid */}
            <Line
              type="step"
              dataKey="Time Spent"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3B82F6' }}
              name={t('timeSpentLine')}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Debug Information - Sprint & Issues */}
      {/* <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
          🔍 {t('debugInfo')}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('debugTotalIssues')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allIssues.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-200 dark:border-green-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('debugIssuesDone')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedIssues.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-orange-200 dark:border-orange-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('debugIssuesInProgress')}</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{allIssues.length - completedIssues.length}</p>
          </div>
        </div>
      </div> */}

      {/* Burndown Data Table */}
      <BurndownDataTable
        timeline={timeline}
        totalEstimate={totalEstimate}
        totalSpent={totalSpent}
      />

      {/* Comprehensive Explanation */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-sm border border-blue-200 dark:border-gray-600 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          {t('readingChart')}
        </h3>

        <div className="space-y-4">
          {/* How It Works */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('chartHowItWorks')}</h4>

            {/* Axes & Units */}
            <div className="ml-3 mb-3">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{t('chartAxesUnits')}</p>
              <ul className="list-disc list-inside space-y-1 ml-3 text-gray-600 dark:text-gray-400">
                <li>{t('chartAxisX')}</li>
                <li>{t('chartAxisY')}</li>
                <li>{t('chartUnits')}</li>
              </ul>
            </div>

            {/* Lines */}
            <div className="ml-3 mb-3">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{t('chartLines')}</p>
              <ul className="list-none space-y-2 ml-3">
                <li className="flex items-start gap-2">
                  <svg width="24" height="8" className="flex-shrink-0 mt-2">
                    <line x1="0" y1="4" x2="24" y2="4" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2" />
                  </svg>
                  <span className="flex-1 text-gray-600 dark:text-gray-400">{t('chartIdealLine')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg width="24" height="8" className="flex-shrink-0 mt-2">
                    <line x1="0" y1="4" x2="24" y2="4" stroke="#EF4444" strokeWidth="3" />
                  </svg>
                  <span className="flex-1 text-gray-600 dark:text-gray-400">{t('chartRemainingLine')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg width="24" height="8" className="flex-shrink-0 mt-2">
                    <line x1="0" y1="4" x2="24" y2="4" stroke="#3B82F6" strokeWidth="3" />
                  </svg>
                  <span className="flex-1 text-gray-600 dark:text-gray-400">{t('chartCompletedLine')}</span>
                </li>
              </ul>
            </div>

            {/* Tracking Progress */}
            <div className="ml-3">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{t('chartTracking')}</p>
              <ul className="list-disc list-inside space-y-1 ml-3 text-gray-600 dark:text-gray-400">
                <li>{t('chartStart')}</li>
                <li>{t('chartCompletion')}</li>
                <li>{t('chartMovement')}</li>
                <li className="text-orange-600 dark:text-orange-400">{t('chartBehind')}</li>
                <li className="text-green-600 dark:text-green-400">{t('chartAhead')}</li>
              </ul>
            </div>
          </div>

          {/* What It Tells You */}
          <div className="pt-3 border-t border-blue-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('chartTellsYou')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span className="text-gray-600 dark:text-gray-400">{t('chartPredictability')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span className="text-gray-600 dark:text-gray-400">{t('chartBottlenecks')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span className="text-gray-600 dark:text-gray-400">{t('chartScopeChange')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span className="text-gray-600 dark:text-gray-400">{t('chartEfficiency')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
