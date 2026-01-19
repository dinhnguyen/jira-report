'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/locales/translations';

interface BoardSelectorProps {
  onBoardsSelected: (boardIds: string[]) => void;
  initialBoardIds?: string[];
}

const STORAGE_KEY = 'jira-report-board-ids';

export default function BoardSelector({ onBoardsSelected, initialBoardIds }: BoardSelectorProps) {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);
  const [boardInput, setBoardInput] = useState('');
  const [parsedBoards, setParsedBoards] = useState<string[]>([]);

  // Load board IDs from URL params or localStorage on mount
  useEffect(() => {
    // Prioritize URL params over localStorage
    if (initialBoardIds && initialBoardIds.length > 0) {
      const boardValue = initialBoardIds.join(', ');
      setBoardInput(boardValue);
      setParsedBoards(initialBoardIds);
      // Save URL params to localStorage for future use
      localStorage.setItem(STORAGE_KEY, boardValue);
    } else {
      const savedBoardIds = localStorage.getItem(STORAGE_KEY);
      if (savedBoardIds) {
        setBoardInput(savedBoardIds);
        // Parse and update
        const boards = savedBoardIds
          .split(/[,\s\n]+/)
          .map(id => id.trim())
          .filter(id => id.length > 0);
        setParsedBoards(boards);
        onBoardsSelected(boards);
      }
    }
  }, [initialBoardIds, onBoardsSelected]);

  const handleInputChange = (value: string) => {
    setBoardInput(value);

    // Parse board IDs from input (separated by comma, space, or newline)
    const boards = value
      .split(/[,\s\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    setParsedBoards(boards);
    onBoardsSelected(boards);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 transition-colors duration-200 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 font-heading">
        {t('boardIds')}
      </h2>

      <div className="mb-2">
        <label htmlFor="boardIds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('boardInputLabel')}
        </label>
        <textarea
          id="boardIds"
          rows={3}
          placeholder={t('boardInputPlaceholder')}
          value={boardInput}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
        />
      </div>

      {parsedBoards.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {parsedBoards.length} {t('boardsSelected')}
          </p>
          <div className="flex flex-wrap gap-2">
            {parsedBoards.map((boardId, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
              >
                {boardId}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>{t('boardInputHint')}</strong>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t('boardInputExample')} 4317, 3559, 1982
        </p>
      </div>
    </div>
  );
}
