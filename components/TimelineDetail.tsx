'use client';

import { useState } from 'react';
import { TimeData } from '@/types/jira';
import { format, parseISO } from 'date-fns';
import { secondsToHours } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

interface TimelineDetailProps {
  timeline: TimeData[];
  initialTotal: number;
  totalSpent: number; // Actual time spent from Jira
  totalEstimate: number; // Current total estimate
}

export default function TimelineDetail({
  timeline,
  initialTotal,
  totalSpent,
  totalEstimate
}: TimelineDetailProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);
  const [isExpanded, setIsExpanded] = useState(false);

  if (timeline.length === 0) return null;

  const today = new Date();
  const actualTimeline = timeline.filter(item => {
    const itemDate = parseISO(item.date);
    return itemDate <= today;
  });

  // Calculate actual completed work from time spent
  const completedWork = totalSpent;

  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {settings.language === 'vi' ? 'Chi tiết Timeline' : 'Timeline Detail'} ({actualTimeline.length} {settings.language === 'vi' ? 'ngày' : 'days'})
            </h3>
          </div>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {isExpanded ? (settings.language === 'vi' ? 'Thu gọn' : 'Collapse') : (settings.language === 'vi' ? 'Xem chi tiết' : 'Expand')}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {/* Initial State */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                📅 {settings.language === 'vi' ? 'Bắt đầu Sprint' : 'Sprint Start'}: {format(parseISO(timeline[0].date), 'dd/MM/yyyy')}
              </span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                {secondsToHours(initialTotal).toFixed(1)}h
              </span>
            </div>
          </div>

          {/* Timeline Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Ngày' : 'Date'}
                  </th>
                  <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Còn lại' : 'Remaining'}
                  </th>
                  <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Thay đổi' : 'Delta'}
                  </th>
                  <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Diễn giải' : 'Reason'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {actualTimeline.map((item, index) => {
                  const isToday = format(parseISO(item.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                  const delta = item.deltaSeconds || 0;
                  const deltaHours = secondsToHours(Math.abs(delta));

                  return (
                    <tr
                      key={item.date}
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isToday ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded font-bold">
                              {settings.language === 'vi' ? 'HÔM NAY' : 'TODAY'}
                            </span>
                          )}
                          <span className={`${isToday ? 'font-semibold' : ''} text-gray-900 dark:text-gray-100`}>
                            {format(parseISO(item.date), 'dd/MM (EEE)')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {secondsToHours(item.remainingWorkSeconds).toFixed(1)}h
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {index > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-semibold ${
                              delta < 0
                                ? 'text-green-600 dark:text-green-400'
                                : delta > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {delta < 0 && '↓'}
                            {delta > 0 && '↑'}
                            {delta !== 0 && `${deltaHours.toFixed(1)}h`}
                            {delta === 0 && '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {item.deltaReason || (index === 0 ? (settings.language === 'vi' ? 'Ngày đầu' : 'Start') : '—')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-1">
                  {settings.language === 'vi' ? '🎯 Thời gian log:' : '🎯 Time Spent:'}
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400 text-base">
                  {secondsToHours(completedWork).toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-1">
                  {settings.language === 'vi' ? '📦 Còn lại:' : '📦 Remaining:'}
                </span>
                <span className="font-semibold text-orange-600 dark:text-orange-400 text-base">
                  {secondsToHours(actualTimeline[actualTimeline.length - 1].remainingWorkSeconds).toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-1">
                  {settings.language === 'vi' ? '📊 Tỷ lệ (spent/total):' : '📊 Ratio (spent/total):'}
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-base">
                  {totalEstimate > 0
                    ? (completedWork / totalEstimate * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
              💡 {settings.language === 'vi'
                ? 'Thời gian log = tổng timeSpent từ Jira (thời gian làm việc thực tế)'
                : 'Time spent = total timeSpent from Jira (actual work time logged)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
