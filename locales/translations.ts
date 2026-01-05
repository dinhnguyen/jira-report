export const translations = {
  en: {
    // Header
    appTitle: 'Jira Report',
    appSubtitle: 'Custom Report for 1Matrix Team',

    // Board Selector
    boardIds: 'Board IDs',
    boardInputLabel: 'Enter board IDs (separated by comma or space)',
    boardInputPlaceholder: 'Example: 4317, 3559, 1982 or 4317 3559 1982',
    boardsSelected: 'board(s) selected',
    boardInputHint: 'You can enter one or multiple board IDs. Board IDs can be separated by commas, spaces, or line breaks.',
    boardInputExample: 'Example board IDs from your Jira:',

    // Generate Button
    generateChart: 'Generate Chart',
    generatingChart: 'Generating Chart...',
    enterBoardHint: 'Enter at least one board ID to generate chart',

    // Sprint Info
    sprintTimeline: 'Sprint Timeline',
    noEndDate: 'No end date',

    // Burndown Chart
    burndownChart: 'Burndown Chart',
    totalWork: 'Total Work (Estimate)',
    completed: 'Completed',
    remaining: 'Remaining',
    hours: 'hours',
    issues: 'issues',

    // Assignee Stats
    assigneeStats: 'Statistics by Assignee',
    people: 'people',
    clickToHide: 'Click to hide',
    clickToExpand: 'Click to view details',
    issuesCompleted: 'issues completed',
    totalEstimate: 'total estimate',
    completedWork: 'Completed',
    remainingWork: 'Remaining',

    // Chart
    chartTitle: 'Burndown Chart - Remaining Work Over Time',
    idealLine: 'Ideal Line',
    remainingTime: 'Remaining Work',
    readingChart: 'How to read the chart:',
    chartAxisX: 'X-Axis (Horizontal): Displays full sprint timeline from start to end date',
    chartAxisY: 'Y-Axis (Vertical): Displays total sprint work time',
    chartIdealLine: 'Gray line (ideal): Represents steady progress completion from total work to 0',
    chartActualLine: 'Red line (remaining work): Represents actual remaining work, decreases when Done, increases with scope creep',
    chartBehind: 'If red line is higher than gray → Progress is slower than expected',
    chartAhead: 'If red line is lower than gray → Progress is faster than expected',

    // Debug Panel
    debugInfo: 'Debug Information (Click to view details)',
    debugOverview: 'Overview:',
    debugTotalIssues: 'Total issues',
    debugIssuesDone: 'Issues Done',
    debugIssuesInProgress: 'Issues in progress',
    debugTimeHours: 'Time (hours):',
    debugTotalEstimate: 'Total estimate',
    debugFormulas: 'Calculation formulas:',
    debugTip: 'Tip: Open Developer Console (F12) to see detailed calculation logs',

    // Sprint Issues List
    sprintIssues: 'Sprint Issues List',
    expandAll: 'Expand All',
    collapseAll: 'Collapse',
    parent: 'parent',
    subtasks: 'subtasks',
    totalEstimateLabel: 'Total estimate',

    // Issue Table
    code: 'Code',
    title: 'Title',
    status: 'Status',
    assignee: 'Assignee',
    timeEstimate: 'Time Estimate',
    unassigned: 'Unassigned',

    // Status
    done: 'Done',
    inProgress: 'In Progress / To Do',
    subtask: 'Subtask',
    carriedOver: 'Carried from previous sprint',
    orphanSubtask: 'Subtask (parent in previous sprint)',

    // Tips
    subtaskTip: 'Click the arrow icon (▶) next to parent issue to view subtasks. Subtasks are indented and displayed with a gray background.',
    orphanWarning: 'Note: There are {count} subtask(s) with parent in previous sprint (marked with purple ⬆). These are subtasks carried over from previous sprint but their parents are completed and no longer in current sprint.',

    // Completed Issues
    completedIssues: 'Completed User Stories',
    noCompletedIssues: 'No completed user stories yet',
    noLogged: 'No time logged',

    // Summary
    issuesCompletedCount: '{completed} / {total} issues completed',

    // Debug Issues
    debugIssues: 'Debug: Check issues (Click to view)',
    debugTotalReceived: 'Total issues received from API',
    debugParentIssues: 'Parent issues',
    debugChildIssues: 'Child issues (subtasks)',
    debugOrphanSubtasks: '⬆ Orphan subtasks (parent not in sprint)',
    debugAllIssues: 'All issue keys (sorted)',
    debugCompareTip: 'Compare this list with Jira to find missing issues. Open Console (F12) to see detailed logs.',

    // Settings
    settings: 'Settings',
    theme: 'Theme',
    language: 'Language',
    lightMode: 'Light',
    darkMode: 'Dark',
    english: 'English',
    vietnamese: 'Tiếng Việt',

    // Jira Configuration
    jiraConfiguration: 'Jira Configuration',
    jiraDomain: 'Jira Domain',
    jiraDomainPlaceholder: 'your-company.atlassian.net',
    jiraEmail: 'Email',
    jiraEmailPlaceholder: 'your-email@company.com',
    jiraApiToken: 'API Token',
    jiraApiTokenPlaceholder: 'Your Jira API token',
    saveConfig: 'Save',
    configSaved: 'Configuration saved!',
    jiraNotConfigured: 'Jira not configured. Please go to Settings to add your credentials.',
    jiraConfigured: 'Jira configured',

    // Instructions
    instructions: 'How to use:',
    instruction1: 'Enter one or multiple board IDs (separated by comma or space)',
    instruction2: 'Click "Generate Chart" to fetch data from active sprint',
    instruction3: 'View burndown chart with red line (remaining time) and gray line (ideal)',
    instruction4: 'View list of all sprint issues with code, title, status, assignee and time estimate',
    instruction5: 'View list of completed user stories by date with assignee and time spent',
  },
  vi: {
    // Header
    appTitle: 'Jira Report',
    appSubtitle: 'Báo cáo tùy chỉnh cho Team 1Matrix',

    // Board Selector
    boardIds: 'Mã Board',
    boardInputLabel: 'Nhập mã các board (cách nhau bởi dấu phẩy hoặc khoảng trắng)',
    boardInputPlaceholder: 'Ví dụ: 4317, 3559, 1982 hoặc 4317 3559 1982',
    boardsSelected: 'board(s) đã chọn',
    boardInputHint: 'Bạn có thể nhập một hoặc nhiều board IDs. Các board IDs có thể cách nhau bởi dấu phẩy, khoảng trắng, hoặc xuống dòng.',
    boardInputExample: 'Ví dụ board IDs từ Jira của bạn:',

    // Generate Button
    generateChart: 'Tạo Biểu Đồ',
    generatingChart: 'Đang Tạo Biểu Đồ...',
    enterBoardHint: 'Nhập ít nhất một board ID để tạo chart',

    // Sprint Info
    sprintTimeline: 'Timeline Sprint',
    noEndDate: 'Chưa có ngày kết thúc',

    // Burndown Chart
    burndownChart: 'Biểu Đồ Burndown',
    totalWork: 'Tổng công việc (Estimate)',
    completed: 'Đã hoàn thành',
    remaining: 'Còn lại',
    hours: 'giờ',
    issues: 'issues',

    // Assignee Stats
    assigneeStats: 'Thống kê theo người',
    people: 'người',
    clickToHide: 'Click để ẩn',
    clickToExpand: 'Click để xem chi tiết',
    issuesCompleted: 'issues hoàn thành',
    totalEstimate: 'tổng estimate',
    completedWork: 'Đã xong',
    remainingWork: 'Còn lại',

    // Chart
    chartTitle: 'Biểu đồ Burndown - Công việc còn lại theo thời gian',
    idealLine: 'Đường lý tưởng (Ideal Line)',
    remainingTime: 'Thời gian còn lại (Remaining Work)',
    readingChart: 'Cách đọc biểu đồ:',
    chartAxisX: 'Trục X (Horizontal): Hiển thị đầy đủ timeline của sprint từ ngày bắt đầu đến ngày kết thúc',
    chartAxisY: 'Trục Y (Vertical): Hiển thị tổng thời gian công việc của sprint',
    chartIdealLine: 'Đường màu xám (lý tưởng): Thể hiện tiến độ hoàn thành đều đặn từ tổng công việc về 0',
    chartActualLine: 'Đường màu đỏ (thời gian còn lại): Thể hiện công việc còn lại thực tế, giảm khi tickets chuyển sang Done, tăng nếu có scope creep',
    chartBehind: 'Nếu đường đỏ cao hơn đường xám → Tiến độ chậm hơn dự kiến',
    chartAhead: 'Nếu đường đỏ thấp hơn đường xám → Tiến độ nhanh hơn dự kiến',

    // Debug Panel
    debugInfo: 'Debug Information (Click để xem chi tiết kiểm tra)',
    debugOverview: 'Số liệu tổng quan:',
    debugTotalIssues: 'Tổng issues',
    debugIssuesDone: 'Issues Done',
    debugIssuesInProgress: 'Issues đang làm',
    debugTimeHours: 'Thời gian (giờ):',
    debugTotalEstimate: 'Tổng estimate',
    debugFormulas: 'Công thức tính:',
    debugTip: 'Tip: Mở Developer Console (F12) để xem logs chi tiết về cách tính toán',

    // Sprint Issues List
    sprintIssues: 'Danh sách Issues trong Sprint',
    expandAll: 'Mở tất cả',
    collapseAll: 'Thu gọn',
    parent: 'parent',
    subtasks: 'subtasks',
    totalEstimateLabel: 'Tổng estimate',

    // Issue Table
    code: 'Mã',
    title: 'Tiêu đề',
    status: 'Trạng thái',
    assignee: 'Assignee',
    timeEstimate: 'Time Estimate',
    unassigned: 'Unassigned',

    // Status
    done: 'Done',
    inProgress: 'In Progress / To Do',
    subtask: 'Subtask (task con)',
    carriedOver: 'Kéo từ sprint trước',
    orphanSubtask: 'Subtask (parent ở sprint trước)',

    // Tips
    subtaskTip: 'Click vào icon mũi tên (▶) bên cạnh parent issue để xem các subtasks. Subtasks được indent vào và hiển thị với màu nền xám.',
    orphanWarning: 'Lưu ý: Có {count} subtask(s) với parent ở sprint trước (được đánh dấu màu tím ⬆). Đây là các subtasks được kéo từ sprint trước nhưng parent đã hoàn thành và không còn trong sprint hiện tại.',

    // Completed Issues
    completedIssues: 'User Stories Đã Hoàn Thành',
    noCompletedIssues: 'Chưa có user stories nào được hoàn thành',
    noLogged: 'Chưa log time',

    // Summary
    issuesCompletedCount: '{completed} / {total} issues hoàn thành',

    // Debug Issues
    debugIssues: 'Debug: Kiểm tra issues (Click để xem)',
    debugTotalReceived: 'Tổng issues nhận được từ API',
    debugParentIssues: 'Parent issues',
    debugChildIssues: 'Child issues (subtasks)',
    debugOrphanSubtasks: '⬆ Orphan subtasks (parent không trong sprint)',
    debugAllIssues: 'Tất cả issues keys (sorted)',
    debugCompareTip: 'So sánh danh sách này với Jira để tìm issues bị thiếu. Mở Console (F12) để xem logs chi tiết.',

    // Settings
    settings: 'Cài đặt',
    theme: 'Giao diện',
    language: 'Ngôn ngữ',
    lightMode: 'Sáng',
    darkMode: 'Tối',
    english: 'English',
    vietnamese: 'Tiếng Việt',

    // Jira Configuration
    jiraConfiguration: 'Cấu hình Jira',
    jiraDomain: 'Jira Domain',
    jiraDomainPlaceholder: 'company.atlassian.net',
    jiraEmail: 'Email',
    jiraEmailPlaceholder: 'email@company.com',
    jiraApiToken: 'API Token',
    jiraApiTokenPlaceholder: 'API token của bạn',
    saveConfig: 'Lưu',
    configSaved: 'Đã lưu cấu hình!',
    jiraNotConfigured: 'Chưa cấu hình Jira. Vui lòng vào Cài đặt để thêm thông tin đăng nhập.',
    jiraConfigured: 'Đã cấu hình Jira',

    // Instructions
    instructions: 'Hướng dẫn sử dụng:',
    instruction1: 'Nhập mã của một hoặc nhiều boards (cách nhau bởi dấu phẩy hoặc khoảng trắng)',
    instruction2: 'Click "Tạo Biểu Đồ" để lấy dữ liệu từ sprint đang active',
    instruction3: 'Xem burndown chart với đường màu đỏ (thời gian còn lại) và đường xám (lý tưởng)',
    instruction4: 'Xem danh sách tất cả issues trong sprint với mã, tiêu đề, trạng thái, assignee và time estimate',
    instruction5: 'Xem danh sách user stories đã hoàn thành theo ngày với người hoàn thành và time đã dùng',
  },
};

export type TranslationKeys = keyof typeof translations.en;

export function useTranslation(language: 'en' | 'vi') {
  return (key: TranslationKeys, replacements?: Record<string, string | number>): string => {
    let text = translations[language][key];

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        text = text.replace(`{${placeholder}}`, String(value));
      });
    }

    return text;
  };
}
