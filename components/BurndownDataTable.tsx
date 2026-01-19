'use client';

import { useState } from 'react';
import { TimeData } from '@/types/jira';
import { format, parseISO } from 'date-fns';
import { secondsToHours } from '@/lib/time-calculator';
import { useSettings } from '@/contexts/SettingsContext';

interface BurndownDataTableProps {
  timeline: TimeData[];
  totalEstimate: number;
  totalSpent: number;
}

export default function BurndownDataTable({
  timeline,
  totalEstimate,
  totalSpent
}: BurndownDataTableProps) {
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);

  if (timeline.length === 0) return null;

  const today = new Date();

  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 hover:from-purple-100 hover:to-pink-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-purple-600 dark:text-purple-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600 dark:text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {settings.language === 'vi' ? 'Dữ liệu Sprint Timeline' : 'Sprint Timeline Data'} ({timeline.length} {settings.language === 'vi' ? 'ngày' : 'days'})
            </h3>
          </div>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {isExpanded ? (settings.language === 'vi' ? 'Thu gọn' : 'Collapse') : (settings.language === 'vi' ? 'Xem chi tiết' : 'Expand')}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Ngày' : 'Date'}
                  </th>
                  <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Tổng Spent Time' : 'Total Spent Time'}
                  </th>
                  <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300 font-semibold">
                    {settings.language === 'vi' ? 'Tổng Estimate Remain' : 'Total Estimate Remain'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, index) => {
                  const itemDate = parseISO(item.date);
                  const isToday = format(itemDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                  const isFuture = itemDate > today;
                  const isFirstDay = index === 0;

                  return (
                    <tr
                      key={item.date}
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isToday ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      } ${isFirstDay ? 'bg-blue-50 dark:bg-blue-900/10' : ''} ${
                        isFuture ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded font-bold">
                              {settings.language === 'vi' ? 'HÔM NAY' : 'TODAY'}
                            </span>
                          )}
                          {isFirstDay && (
                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">
                              {settings.language === 'vi' ? 'BẮT ĐẦU' : 'START'}
                            </span>
                          )}
                          {isFuture && (
                            <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded">
                              {settings.language === 'vi' ? 'DỰ KIẾN' : 'FUTURE'}
                            </span>
                          )}
                          <span className={`${isToday || isFirstDay ? 'font-semibold' : ''} ${isFuture ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {format(itemDate, 'dd/MM (EEE)')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-mono font-semibold ${isFuture ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isFuture ? '-' : `${secondsToHours(item.timeSpentSeconds).toFixed(1)}h`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-mono font-semibold ${isFuture ? 'text-gray-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {isFuture ? '-' : `${secondsToHours(item.remainingWorkSeconds).toFixed(1)}h`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {settings.language === 'vi' ? 'Tổng Spent Time:' : 'Total Spent Time:'}
                </span>
                <span>
                  {settings.language === 'vi'
                    ? 'Tổng thời gian đã log của tất cả issues'
                    : 'Total logged time of all issues'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  {settings.language === 'vi' ? 'Tổng Estimate Remain:' : 'Total Estimate Remain:'}
                </span>
                <span>
                  {settings.language === 'vi'
                    ? 'Tổng estimated time còn lại của tất cả issues'
                    : 'Total estimated time remaining of all issues'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="font-semibold">💡 {settings.language === 'vi' ? 'Lưu ý:' : 'Note:'} </span>
              <span>
                {settings.language === 'vi'
                  ? 'Bảng hiển thị TẤT CẢ các ngày trong sprint. Ngày tương lai (DỰ KIẾN) hiển thị "-" vì chưa có dữ liệu thực tế.'
                  : 'Table shows ALL days in the sprint. Future days (FUTURE) show "-" as there is no actual data yet.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
