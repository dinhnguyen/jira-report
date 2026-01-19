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

    // Chart
    chartTitle: 'Burndown Chart - Progress Over Time',
    idealLine: 'Ideal Line',
    remainingWorkLine: 'Remaining Work',
    timeSpentLine: 'Time Spent',
    readingChart: 'How to Read the Burndown Chart',

    // Chart Details
    chartHowItWorks: 'How It Works:',
    chartAxesUnits: 'Axes & Units:',
    chartAxisX: 'X-Axis (Horizontal): Time (days in the sprint)',
    chartAxisY: 'Y-Axis (Vertical): Work amount in hours (both remaining work and time spent)',
    chartUnits: 'Units: Configured on your Jira board (e.g., story points, time)',

    chartLines: 'Lines:',
    chartIdealLine: 'Ideal Line (Gray Dashed): A straight, downward-sloping line from the starting work total to zero, showing perfect, consistent progress',
    chartRemainingLine: 'Remaining Work (Red Solid): Shows work remaining; decreases as issues are completed',
    chartCompletedLine: 'Time Spent (Blue Solid): Shows cumulative time spent; increases as work is completed',

    chartTracking: 'Tracking Progress:',
    chartStart: 'Start: The chart begins with the total estimated work for the sprint',
    chartCompletion: 'Completion: When an issue is moved to "Done" status, the blue line (time spent) increases and red line (remaining work) decreases',
    chartMovement: 'Movement: The red line should ideally stay close to or below the gray ideal line',
    chartBehind: 'If red line goes above gray ideal line → You\'re falling behind schedule',
    chartAhead: 'If red line stays below gray ideal line → You\'re ahead of schedule',

    chartTellsYou: 'What It Tells You:',
    chartPredictability: 'Predictability: Helps forecast if the sprint goal will be met',
    chartBottlenecks: 'Bottlenecks: Highlights days with little or no progress (flat blue line means no work completed)',
    chartScopeChange: 'Scope Change: If red line increases unexpectedly, work was added during sprint',
    chartEfficiency: 'Team Efficiency: Compare red line vs gray ideal line to see if team is on track',

    // Debug Panel
    debugInfo: 'Debug Information',
    debugTotalIssues: 'Total issues',
    debugIssuesDone: 'Issues Done',
    debugIssuesInProgress: 'Issues in progress',

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
    timeSpent: 'Time Spent',
    timeRemaining: 'Remaining',
    lastUpdated: 'Last Updated',
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
    timeCalculationMethod: 'Time Calculation Method',
    byOriginalEstimate: 'By Original Estimate',
    byRemainingEstimate: 'By Remaining Estimate',

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

    // Chart
    chartTitle: 'Biểu đồ Burndown - Tiến độ theo thời gian',
    idealLine: 'Đường lý tưởng (Ideal Line)',
    remainingWorkLine: 'Công việc còn lại',
    timeSpentLine: 'Thời gian đã dùng',
    readingChart: 'Cách Đọc Biểu Đồ Burndown',

    // Chart Details
    chartHowItWorks: 'Cách Hoạt Động:',
    chartAxesUnits: 'Trục & Đơn Vị:',
    chartAxisX: 'Trục X (Ngang): Thời gian (các ngày trong sprint)',
    chartAxisY: 'Trục Y (Dọc): Số giờ công việc (bao gồm cả còn lại và đã dùng)',
    chartUnits: 'Đơn vị: Được cấu hình trên Jira board của bạn (ví dụ: story points, thời gian)',

    chartLines: 'Các Đường:',
    chartIdealLine: 'Đường Lý Tưởng (Xám Đứt): Đường thẳng dốc xuống từ tổng công việc ban đầu về 0, thể hiện tiến độ hoàn hảo và đều đặn',
    chartRemainingLine: 'Công Việc Còn Lại (Đỏ Liền): Hiển thị công việc còn lại; giảm xuống khi hoàn thành issues',
    chartCompletedLine: 'Thời Gian Đã Dùng (Xanh Liền): Hiển thị tổng thời gian đã dùng tích lũy; tăng lên khi hoàn thành công việc',

    chartTracking: 'Theo Dõi Tiến Độ:',
    chartStart: 'Bắt đầu: Biểu đồ bắt đầu với tổng công việc ước tính cho sprint',
    chartCompletion: 'Hoàn thành: Khi issue chuyển sang "Done", đường xanh (thời gian đã dùng) tăng lên và đường đỏ (còn lại) giảm xuống',
    chartMovement: 'Chuyển động: Đường đỏ nên ở gần hoặc dưới đường xám lý tưởng',
    chartBehind: 'Nếu đường đỏ ở trên đường xám lý tưởng → Bạn đang chậm tiến độ',
    chartAhead: 'Nếu đường đỏ ở dưới đường xám lý tưởng → Bạn đang vượt lịch trình',

    chartTellsYou: 'Biểu Đồ Cho Bạn Biết:',
    chartPredictability: 'Khả năng dự đoán: Giúp dự báo liệu mục tiêu sprint có được hoàn thành hay không',
    chartBottlenecks: 'Điểm nghẽn: Làm nổi bật những ngày có ít tiến độ (đường xanh phẳng = không hoàn thành công việc)',
    chartScopeChange: 'Thay đổi phạm vi: Nếu đường đỏ tăng bất ngờ, có công việc được thêm vào trong sprint',
    chartEfficiency: 'Hiệu suất team: So sánh đường đỏ với đường xám lý tưởng để xem team có đúng hướng',

    // Debug Panel
    debugInfo: 'Thông tin Debug',
    debugTotalIssues: 'Tổng issues',
    debugIssuesDone: 'Issues Done',
    debugIssuesInProgress: 'Issues đang làm',

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
    timeSpent: 'Đã dùng',
    timeRemaining: 'Còn lại',
    lastUpdated: 'Cập nhật lần cuối',
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
    timeCalculationMethod: 'Phương pháp tính giờ',
    byOriginalEstimate: 'Theo Original Estimate',
    byRemainingEstimate: 'Theo Remaining Estimate',

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
