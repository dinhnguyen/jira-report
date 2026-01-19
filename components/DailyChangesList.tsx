'use client';

import { useState } from 'react';
import { DailyChangeSummary } from '@/types/jira';
import { format, parseISO } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';
import { secondsToHours, formatTimeEstimate } from '@/lib/time-calculator';

interface DailyChangesListProps {
    dailyChanges: DailyChangeSummary[];
}

export default function DailyChangesList({ dailyChanges }: DailyChangesListProps) {
    const { settings } = useSettings();
    const t = useTranslation(settings.language);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    if (dailyChanges.length === 0) {
        return null;
    }

    const toggleDate = (date: string) => {
        const newExpanded = new Set(expandedDates);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
        }
        setExpandedDates(newExpanded);
    };

    const formatDelta = (delta: number, changeType: string) => {
        const hours = secondsToHours(Math.abs(delta));
        const sign = delta > 0 ? '+' : '-';
        const color = changeType === 'timeSpent'
            ? 'text-blue-600 dark:text-blue-400'
            : delta > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400';

        return (
            <span className={`font-mono font-semibold ${color}`}>
                {sign}{hours.toFixed(1)}h
            </span>
        );
    };

    const getChangeTypeLabel = (changeType: string) => {
        switch (changeType) {
            case 'timeSpent':
                return settings.language === 'vi' ? 'Thời gian làm' : 'Time Spent';
            case 'originalEstimate':
                return settings.language === 'vi' ? 'Ước tính gốc' : 'Original Est.';
            case 'remainingEstimate':
                return settings.language === 'vi' ? 'Còn lại' : 'Remaining';
            default:
                return changeType;
        }
    };

    const getChangeTypeIcon = (changeType: string) => {
        switch (changeType) {
            case 'timeSpent':
                return (
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'originalEstimate':
                return (
                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                );
            case 'remainingEstimate':
                return (
                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Filter to only show days with changes
    const daysWithChanges = dailyChanges.filter(d => d.changes.length > 0);

    if (daysWithChanges.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 font-heading flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {settings.language === 'vi' ? 'Thay đổi theo ngày' : 'Daily Changes'}
            </h2>

            <div className="space-y-2">
                {daysWithChanges.map((day) => {
                    const isExpanded = expandedDates.has(day.date);
                    const dateObj = parseISO(day.date);
                    const formattedDate = format(dateObj, 'EEEE, dd/MM/yyyy', {
                        locale: settings.language === 'vi' ? vi : enUS
                    });

                    return (
                        <div key={day.date} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {/* Header - clickable */}
                            <button
                                onClick={() => toggleDate(day.date)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                        {formattedDate}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        ({day.changes.length} {settings.language === 'vi' ? 'thay đổi' : 'changes'})
                                    </span>
                                </div>

                                {/* Summary badges */}
                                <div className="flex items-center gap-3">
                                    {day.totalTimeSpentDelta > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            +{secondsToHours(day.totalTimeSpentDelta).toFixed(1)}h
                                        </span>
                                    )}
                                    {day.totalEstimateDelta !== 0 && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${day.totalEstimateDelta > 0
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            }`}>
                                            Est: {day.totalEstimateDelta > 0 ? '+' : ''}{secondsToHours(day.totalEstimateDelta).toFixed(1)}h
                                        </span>
                                    )}
                                    {day.totalRemainingDelta !== 0 && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${day.totalRemainingDelta > 0
                                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            }`}>
                                            Rem: {day.totalRemainingDelta > 0 ? '+' : ''}{secondsToHours(day.totalRemainingDelta).toFixed(1)}h
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="p-4 bg-white dark:bg-gray-800">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Issue</th>
                                                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                                                    {settings.language === 'vi' ? 'Loại' : 'Type'}
                                                </th>
                                                <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">
                                                    {settings.language === 'vi' ? 'Trước' : 'Before'}
                                                </th>
                                                <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">
                                                    {settings.language === 'vi' ? 'Sau' : 'After'}
                                                </th>
                                                <th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium">
                                                    {settings.language === 'vi' ? 'Thay đổi' : 'Change'}
                                                </th>
                                                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium pl-4">
                                                    {settings.language === 'vi' ? 'Người thực hiện' : 'By'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {day.changes.map((change, idx) => (
                                                <tr
                                                    key={`${change.issueKey}-${change.changeType}-${idx}`}
                                                    className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                                >
                                                    <td className="py-2">
                                                        <div>
                                                            <span className="font-mono font-medium text-primary-600 dark:text-primary-400">
                                                                {change.issueKey}
                                                            </span>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                                {change.summary}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-2">
                                                        <div className="flex items-center gap-2">
                                                            {getChangeTypeIcon(change.changeType)}
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {getChangeTypeLabel(change.changeType)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                                                        {secondsToHours(change.previousValue).toFixed(1)}h
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                                                        {secondsToHours(change.newValue).toFixed(1)}h
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        {formatDelta(change.delta, change.changeType)}
                                                    </td>
                                                    <td className="py-2 pl-4 text-gray-600 dark:text-gray-400">
                                                        {change.author || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
