# Burndown Chart Data Flow - Luồng Xử Lý Dữ Liệu

## Tổng quan

Document này giải thích chi tiết cách hệ thống lấy dữ liệu từ Jira API và xử lý để tạo Burndown Chart.

## Step 1: Lấy Raw Issues từ Jira API

### API Endpoint
```
GET /rest/api/3/search
Query Parameters:
  - jql: sprint={sprintId}
  - expand: changelog
  - fields: key,summary,status,assignee,timetracking,created,updated,resolutiondate,sprint
```

### Response Structure
```typescript
{
  "issues": [
    {
      "key": "PROJ-123",
      "fields": {
        "summary": "Issue title",
        "status": {
          "name": "Done",
          "statusCategory": {
            "key": "done" // done | indeterminate | new
          }
        },
        "assignee": {
          "displayName": "John Doe",
          "emailAddress": "john@example.com"
        },
        "timetracking": {
          "originalEstimateSeconds": 28800,  // 8h
          "remainingEstimateSeconds": 0,
          "timeSpentSeconds": 25200          // 7h
        },
        "created": "2024-01-01T10:00:00.000+0000",
        "updated": "2024-01-10T15:30:00.000+0000"
      },
      "changelog": {
        "histories": [...]
      }
    }
  ]
}
```

### Code Location
- **File**: `lib/jira-client.ts`
- **Function**: `getActiveSprintIssuesWithChangelog(boardId)`
- **API Version**: Jira API v3 (required for changelog)

### Key Fields
1. **originalEstimateSeconds**: Estimate ban đầu, không thay đổi
2. **remainingEstimateSeconds**: Estimate còn lại, Jira tự động set = 0 khi Done
3. **timeSpentSeconds**: Thời gian thực tế đã log vào Jira

---

## Step 2: Parse Changelog Events

### Changelog Structure
```typescript
{
  "changelog": {
    "histories": [
      {
        "id": "10001",
        "created": "2024-01-05T14:30:00.000+0000",
        "items": [
          {
            "field": "timeoriginalestimate",
            "fieldtype": "jira",
            "from": "28800",      // 8h in seconds
            "fromString": "8h",
            "to": "36000",        // 10h in seconds
            "toString": "10h"
          },
          {
            "field": "Sprint",
            "fieldtype": "custom",
            "from": "",
            "fromString": "",
            "to": "123",
            "toString": "Sprint 1"
          }
        ]
      }
    ]
  }
}
```

### Các loại thay đổi quan trọng

#### 1. Sprint Changes (Scope Creep)
```typescript
{
  "field": "Sprint",
  "from": "",        // Empty = issue added to sprint
  "to": "123"        // Sprint ID
}
```
**Ý nghĩa**: Issue được thêm vào sprint → Tăng scope

#### 2. Original Estimate Changes
```typescript
{
  "field": "timeoriginalestimate",
  "from": "28800",   // 8h
  "to": "36000"      // 10h
}
```
**Ý nghĩa**: Estimate tăng từ 8h → 10h

#### 3. Remaining Estimate Changes
```typescript
{
  "field": "timeestimate",
  "from": "14400",   // 4h
  "to": "7200"       // 2h
}
```
**Ý nghĩa**: Công việc còn lại giảm từ 4h → 2h

### Parsing Logic

#### Code Location
- **File**: `lib/changelog-parser.ts`
- **Functions**:
  - `parseSprintChanges()`: Lấy ngày issue được add/remove khỏi sprint
  - `parseEstimateChanges()`: Lấy lịch sử thay đổi estimate

#### Parse Estimate String
```typescript
function parseEstimateToSeconds(estimate: string): number {
  // Format: "2w 3d 4h 30m"
  // 1w = 5 workdays, 1d = 8 hours

  const weeks = parseInt(match[1]) || 0;     // * 5 * 8 * 3600
  const days = parseInt(match[2]) || 0;      // * 8 * 3600
  const hours = parseInt(match[3]) || 0;     // * 3600
  const minutes = parseInt(match[4]) || 0;   // * 60

  return (weeks * 5 * 8 * 3600) +
         (days * 8 * 3600) +
         (hours * 3600) +
         (minutes * 60);
}
```

**Example**:
- Input: `"2w 3d 4h 30m"`
- Output: `(2*5*8 + 3*8 + 4)*3600 + 30*60 = 320400 seconds`

---

## Step 3: Timeline Construction

### Calculation Methods

#### Method 1: Original Estimate (Fixed Baseline)
```typescript
// Ngày đầu sprint
initialTotal = Sum(issue.originalEstimateSeconds for all issues)

// Mỗi ngày
remainingWork[day] = initialTotal - Sum(completedIssues.originalEstimateSeconds)

// Completed issues = issues có status.statusCategory.key === 'done'
```

**Đặc điểm**:
- ✅ Không bị ảnh hưởng khi estimate thay đổi
- ❌ Không phản ánh scope creep (issue mới thêm vào)
- ✅ Stable, predictable

#### Method 2: Remaining Estimate (Dynamic)
```typescript
// Mỗi ngày
remainingWork[day] = Sum(issue.remainingEstimateSeconds for all issues at that day)

// Jira behavior:
// - When issue = Done: remainingEstimate = 0
// - When estimate changes: remainingEstimate updates accordingly
```

**Đặc điểm**:
- ✅ Phản ánh scope creep (issue mới → remaining tăng)
- ✅ Phản ánh estimate changes
- ❌ Có thể thay đổi bất thường khi team update estimate

### Timeline Data Structure

```typescript
interface TimeData {
  date: string;                    // "2024-01-05"
  timeSpentSeconds: number;        // Total logged time
  timeEstimateSeconds: number;     // Current total estimate
  remainingWorkSeconds: number;    // Remaining work (vẽ trên chart)
  idealRemainingSeconds: number;   // Linear decrease line
  ratio: number;                   // Progress ratio (0-1)
  issuesCompleted: number;         // Count of done issues
  totalIssues: number;             // Total issues in sprint
  deltaSeconds?: number;           // Change from previous day
  deltaReason?: string;            // Explanation of change
}
```

### Code Location
- **File**: `lib/time-calculator.ts`
- **Function**: `calculateTimelineWithChangelog()`

### Daily Calculation Loop

```typescript
for (let day = sprintStart; day <= sprintEnd; day++) {
  // 1. Lọc issues đã tồn tại tại ngày này
  const issuesAtDay = issues.filter(issue =>
    wasIssueInSprintOnDate(issue, day, sprintId)
  );

  // 2. Tính remaining work theo method
  let remainingWork = 0;
  if (method === 'original') {
    // Cố định baseline, trừ đi completed
    const completed = issuesAtDay.filter(isDone).reduce(...);
    remainingWork = initialTotal - completed;
  } else {
    // Dynamic: sum current remaining
    remainingWork = issuesAtDay.reduce(
      (sum, issue) => sum + issue.remainingEstimateSeconds,
      0
    );
  }

  // 3. Tính time spent
  const timeSpent = issuesAtDay.reduce(
    (sum, issue) => sum + issue.timeSpentSeconds,
    0
  );

  // 4. Tính ideal line (linear decrease)
  const daysElapsed = day - sprintStart;
  const totalDays = sprintEnd - sprintStart;
  const idealRemaining = initialTotal * (1 - daysElapsed / totalDays);

  // 5. Tính delta
  const delta = dayIndex === 0 ? 0 : remainingWork - previousRemaining;

  timeline.push({
    date: format(day),
    timeSpentSeconds: timeSpent,
    timeEstimateSeconds: currentEstimate,
    remainingWorkSeconds: remainingWork,
    idealRemainingSeconds: idealRemaining,
    deltaSeconds: delta,
    deltaReason: getDeltaReason(delta)
  });
}
```

---

## Step 4: Chart Rendering

### Transform Data for Chart

```typescript
const chartData = timeline.map(item => {
  const itemDate = parseISO(item.date);
  const isFuture = itemDate > today;

  return {
    date: format(itemDate, 'dd/MM'),
    'Time Spent': isFuture ? null : secondsToHours(item.timeSpentSeconds),
    'Remaining Work': isFuture ? null : secondsToHours(item.remainingWorkSeconds),
    'Ideal Line': secondsToHours(item.idealRemainingSeconds)
  };
});
```

### Chart Lines

1. **Ideal Line (Gray Dashed)**
   - Linear decrease từ initialTotal về 0
   - Công thức: `remaining = initial * (1 - progress)`
   - Không thay đổi theo thực tế

2. **Remaining Work (Red Solid)**
   - Công việc còn lại thực tế
   - Giảm khi issues Done
   - Tăng khi có scope creep

3. **Time Spent (Blue Solid)**
   - Tổng thời gian đã log
   - Chỉ tăng, không giảm
   - Lấy từ Jira timeSpentSeconds

---

## Verification Steps

### 1. Verify Total Estimate

**Jira**:
```
Sprint Report → Scope Changes → Initial Estimate
```

**App**:
```typescript
totalEstimate = issues.reduce(
  (sum, issue) => sum + (issue.timetracking?.originalEstimateSeconds || 0),
  0
);
```

### 2. Verify Issue Status

**Jira**:
- Issue Details → Status → Category

**App**:
```typescript
isDone = issue.fields.status.statusCategory.key === 'done'
```

### 3. Verify Changelog Events

**Jira**:
- Issue → History tab → View all history

**App**:
- Debug Panel → Select Issue → Changelog Events

### 4. Verify Time Spent

**Jira**:
```
Sprint Report → Time Tracking → Time Spent
```

**App**:
```typescript
totalSpent = issues.reduce(
  (sum, issue) => sum + (issue.timetracking?.timeSpentSeconds || 0),
  0
);
```

---

## Common Issues & Troubleshooting

### Issue 1: Remaining Work không khớp với Jira

**Nguyên nhân**:
- Jira tính remaining theo cách khác
- Có issues không được fetch (paging)
- Timezone khác nhau

**Giải pháp**:
1. Check Debug Panel → Raw Issues
2. Verify totalEstimate với Jira Sprint Report
3. Check calculation method setting

### Issue 2: Scope Creep không hiển thị

**Nguyên nhân**:
- Changelog không có Sprint field changes
- Issues được add trước sprint start

**Giải pháp**:
1. Check issue changelog trong Debug Panel
2. Verify Sprint field có trong changelog items

### Issue 3: Time Spent sai

**Nguyên nhân**:
- Jira worklog không được include trong timeSpentSeconds
- Có worklog ngoài sprint period

**Giải pháp**:
1. Check Debug Panel → Selected Issue → Time Tracking
2. So sánh timeSpentSeconds với Jira Issue

---

## Performance Considerations

### API Calls
- **1 call** to get all issues with changelog
- Changelog có thể rất lớn (100+ events/issue)
- Use pagination nếu sprint có >50 issues

### Memory
- Timeline: ~50 days * O(n) issues = moderate
- Changelog: O(n issues * m events) = can be large

### Optimization
- Cache issues data client-side
- Lazy load changelog details
- Virtual scrolling cho changelog list

---

## Related Files

### Core Logic
- `lib/jira-client.ts`: API calls
- `lib/changelog-parser.ts`: Parse changelog events
- `lib/time-calculator.ts`: Timeline construction

### Components
- `components/BurndownChart.tsx`: Main chart
- `components/BurndownDataTable.tsx`: Data verification table
- `components/BurndownDebugPanel.tsx`: Debug tools
- `components/TimelineDetail.tsx`: Daily changes

### Types
- `types/jira.ts`: TypeScript interfaces

### API Routes
- `app/api/burndown/route.ts`: Backend aggregation
