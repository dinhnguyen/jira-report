# Jira Report

Dashboard ứng dụng Next.js để theo dõi và hiển thị burndown chart cho các Jira boards.

## Tính năng

- ✅ Nhập ID boards để hiển thị dữ liệu
- ✅ Hỗ trợ nhiều boards cùng lúc (đảm bảo các boards có sprint bắt đầu cùng ngày)
- ✅ **Tự động lấy Sprint đang Active** - chỉ hiển thị dữ liệu của sprint hiện tại
- ✅ **Burndown Chart chuẩn**:
  - **Trục X**: Timeline đầy đủ của sprint
  - **Trục Y**: Tổng thời gian công việc (0 - total estimate)
  - **Đường màu xám (dashed)**: Đường lý tưởng
  - **Đường màu đỏ (solid)**: Thời gian còn lại thực tế
- ✅ **Danh sách tất cả Issues trong Sprint** - hiển thị dạng bảng với:
  - Mã issue
  - Tiêu đề
  - Trạng thái (Done/In Progress)
  - Assignee
  - Time estimate
- ✅ **Danh sách User Stories đã hoàn thành** - hiển thị theo ngày với:
  - Mã và tên user story
  - Người hoàn thành (assignee)
  - Thời gian đã dùng
- ✅ Biểu đồ tương tác với Recharts
- ✅ Manual refresh để cập nhật dữ liệu

## Cài đặt

### 1. Clone hoặc navigate đến thư mục dự án

```bash
cd /Users/dinhnn/Documents/Works/git/jira-report
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Jira API credentials

Tạo file `.env.local` từ template:

```bash
cp .env.local.example .env.local
```

Chỉnh sửa `.env.local` với thông tin Jira của bạn:

```env
NEXT_PUBLIC_JIRA_DOMAIN=your-domain.atlassian.net
NEXT_PUBLIC_JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
```

### Cách lấy Jira API Token:

1. Đăng nhập vào Jira
2. Truy cập https://id.atlassian.com/manage-profile/security/api-tokens
3. Click "Create API token"
4. Đặt tên cho token và copy giá trị
5. Paste vào file `.env.local`

### 4. Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại http://localhost:3000

## Sử dụng

1. **Nhập board IDs**: Nhập mã của một hoặc nhiều boards (cách nhau bởi dấu phẩy hoặc khoảng trắng)
   - Ví dụ: `4317, 3559, 1982` hoặc `4317 3559 1982`
   - **Lưu ý**: Đảm bảo các boards có sprint active bắt đầu cùng ngày nếu cần hiển thị nhiều boar, điều này đảm bảo nhìn burndown sẽ đúng hơn
2. **Generate chart**: Click nút "Generate Chart" để lấy dữ liệu từ sprint đang active
3. **Xem kết quả**:
   - **Sprint info**: Tên sprint và timeline (ngày bắt đầu - ngày kết thúc)
   - **Burndown chart**:
     - **Trục X**: Timeline đầy đủ từ ngày bắt đầu đến ngày kết thúc sprint
     - **Trục Y**: Tổng thời gian công việc của sprint (0 - total estimate giờ)
     - **Đường màu xám (dashed)**: Đường lý tưởng - tiến độ hoàn thành đều đặn
     - **Đường màu đỏ (solid)**: Thời gian còn lại thực tế - giảm khi Done, tăng khi có scope creep
     - Summary cards: Tổng công việc, đã hoàn thành, còn lại
   - **Danh sách tất cả Issues trong Sprint**:
     - Bảng hiển thị tất cả issues
     - Mã, tiêu đề, trạng thái, assignee, time estimate
     - Highlight issues đã Done (màu xanh)
   - **User Stories đã hoàn thành**:
     - Nhóm theo ngày (mới nhất trước)
     - Hiển thị key, tên, assignee, và time đã dùng

## Cấu trúc dự án

```
jira-report/
├── app/
│   ├── api/
│   │   └── burndown/route.ts       # API lấy active sprint và burndown data
│   ├── layout.tsx
│   ├── page.tsx                    # Main dashboard page
│   └── globals.css
├── components/
│   ├── BoardSelector.tsx           # Component nhập board IDs
│   ├── BurndownChart.tsx           # Component hiển thị burndown chart
│   ├── SprintIssuesList.tsx        # Component danh sách tất cả issues
│   └── CompletedIssuesList.tsx     # Component danh sách issues đã hoàn thành
├── lib/
│   ├── jira-client.ts              # Jira API client (active sprint support)
│   └── time-calculator.ts          # Logic tính toán với sprint timeline
├── types/
│   └── jira.ts                     # TypeScript types
└── package.json
```

## Tech Stack

- **Next.js 14**: React framework với App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Recharts**: Visualization library
- **Axios**: HTTP client cho Jira API
- **date-fns**: Date manipulation

## API Endpoints

### POST /api/burndown

Lấy dữ liệu burndown từ các active sprints của boards đã chọn.

**Request body:**
```json
{
  "boardIds": ["4317", "3559"]
}
```

**Response:**
```json
{
  "totalEstimate": 144000,
  "totalSpent": 108000,
  "timeline": [
    {
      "date": "2024-01-01",
      "timeSpentSeconds": 28800,
      "timeEstimateSeconds": 36000,
      "ratio": 80,
      "issuesCompleted": 5,
      "totalIssues": 10
    }
  ],
  "issueCount": 10,
  "sprintInfo": [
    {
      "boardId": "4317",
      "sprintName": "Sprint 23",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-14T23:59:59.999Z"
    }
  ],
  "sprintStartDate": "2024-01-01T00:00:00.000Z",
  "sprintEndDate": "2024-01-14T23:59:59.999Z",
  "completedIssuesByDate": [
    {
      "date": "2024-01-05",
      "issues": [
        {
          "key": "PROJ-123",
          "summary": "Implement login feature",
          "assignee": "Nguyen Van A",
          "timeSpent": 28800,
          "completedDate": "2024-01-05"
        }
      ]
    }
  ]
}
```

## Lưu ý

- **Chỉ lấy dữ liệu từ sprint đang active** - không lấy toàn bộ issues của board
- **Timeline theo sprint** - X-axis hiển thị đầy đủ từ ngày sprint start đến ngày sprint end (bao gồm cả ngày tương lai)
- **Trục Y hiển thị tổng công việc** - Domain từ 0 đến tổng estimate của sprint
- **Đảm bảo sprint cùng timeline** - Khi chọn nhiều boards, nên chọn boards có sprint bắt đầu cùng ngày để timeline chính xác
- API token được lưu trong biến môi trường server-side (không expose ra client)
- Dữ liệu được fetch manual khi click "Generate Chart"
- Chart hiển thị burndown chuẩn với ideal line (đỏ) và actual line (xanh)

## Build cho Production

```bash
npm run build
npm start
```
