'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export default function ChangelogTest() {
  const { settings } = useSettings();
  const [issueKey, setIssueKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testChangelog = async () => {
    if (!issueKey.trim()) {
      alert('Please enter an issue key (e.g., PROJ-123)');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: settings.jiraConfig.domain,
          email: settings.jiraConfig.email,
          apiToken: settings.jiraConfig.apiToken,
          issueKey: issueKey.trim(),
        }),
      });

      const data = await response.json();
      setResult(data);
      console.log('Changelog test result:', data);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mb-6 border border-orange-300 dark:border-orange-700 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
      <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-3 flex items-center gap-2">
        🧪 {settings.language === 'vi' ? 'Test Changelog API' : 'Test Changelog API'}
      </h3>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={issueKey}
            onChange={(e) => setIssueKey(e.target.value)}
            placeholder="Enter issue key (e.g., PROJ-123)"
            className="flex-1 px-3 py-2 border border-orange-300 dark:border-orange-700 rounded bg-white dark:bg-gray-800 text-sm"
          />
          <button
            onClick={testChangelog}
            disabled={testing || !issueKey.trim()}
            className={`px-4 py-2 rounded font-medium text-white text-sm ${
              testing || !issueKey.trim()
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>

        <p className="text-xs text-orange-700 dark:text-orange-300">
          💡 {settings.language === 'vi'
            ? 'Nhập một issue key bất kỳ trong sprint để test xem Jira API có trả về changelog hay không.'
            : 'Enter any issue key from your sprint to test if Jira API returns changelog data.'}
        </p>

        {result && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-orange-300 dark:border-orange-700">
            {result.success ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {settings.language === 'vi' ? 'Thành công!' : 'Success!'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p><strong>Issue:</strong> {result.issue?.key}</p>
                  <p><strong>Summary:</strong> {result.issue?.summary}</p>
                  <p>
                    <strong>Has changelog field:</strong>{' '}
                    <span className={result.issue?.hasChangelog ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {result.issue?.hasChangelog ? 'YES ✓' : 'NO ✗'}
                    </span>
                  </p>
                  {result.issue?.hasChangelog && (
                    <>
                      <p><strong>Changelog total:</strong> {result.issue?.changelogTotal}</p>
                      <p><strong>Changelog histories length:</strong> {result.issue?.changelogHistoriesLength}</p>
                      <p><strong>Expand field:</strong> {result.issue?.expand || 'N/A'}</p>
                    </>
                  )}
                </div>

                {result.rawChangelog && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold text-orange-700 dark:text-orange-300">
                      View Raw Changelog Data
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.rawChangelog, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">❌</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {settings.language === 'vi' ? 'Thất bại!' : 'Failed!'}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p><strong>Error:</strong> {result.error}</p>
                  {result.status && <p><strong>Status:</strong> {result.status}</p>}
                  {result.data && (
                    <details>
                      <summary className="cursor-pointer">View Error Details</summary>
                      <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
