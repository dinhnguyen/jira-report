# Streaming Status Updates

## Feature Overview

Real-time status updates during chart generation, showing progress for each board, sprint discovery, issue fetching, and calculation steps.

## Implementation

### Architecture

Uses HTTP streaming (ReadableStream) to send JSON-encoded status messages from server to client as they occur.

**Message Types:**
1. `{ type: 'status', message: 'Processing board 40...' }` - Progress update
2. `{ type: 'error', message: 'Board 40: Error - ...' }` - Error notification
3. `{ type: 'data', data: {...} }` - Final burndown data

### Backend (API Route)

**File:** `app/api/burndown-stream/route.ts`

- **Endpoint:** POST `/api/burndown-stream`
- **Response:** HTTP stream with newline-delimited JSON
- **Headers:**
  - `Content-Type: text/plain; charset=utf-8`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

**Status Messages:**
```typescript
// Board processing
`Processing ${boardIds.length} board(s)...`
`Board ${boardId}: Finding active sprint...`
`Board ${boardId}: Found sprint "${sprintName}" (ID: ${sprintId})`
`Board ${boardId}: Fetching issues with changelog...`
`Board ${boardId}: Found ${count} issues (${parents} stories, ${children} tasks)`

// Worklog and calculation
`Total: ${count} issues collected`
`Fetching worklogs for accurate time tracking...`
`Worklogs fetched for ${count} issues`
`Calculating burndown data...`
`Using worklog-based time tracking (most accurate)`
`Chart generation complete!`
```

### Frontend (React Component)

**File:** `app/page.tsx`

**State:**
```typescript
const [statusMessages, setStatusMessages] = useState<string[]>([]);
```

**Streaming Consumer:**
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const message = JSON.parse(line);
    if (message.type === 'status') {
      setStatusMessages(prev => [...prev, message.message]);
    }
  }
}
```

**UI Display:**
- Blue-bordered panel shown when loading AND status messages exist
- Scrollable (max-height: 16rem / 256px)
- Monospace font for technical readability
- Error messages prefixed with ❌ and shown in red
- Auto-scrolls to latest message

## User Experience

**Example Flow:**
```
Processing 2 board(s)...
Board 4317: Finding active sprint...
Board 4317: Found sprint "Sprint 23" (ID: 12345)
Board 4317: Fetching issues with changelog...
Board 4317: Found 45 issues (12 stories, 33 tasks)
Board 3559: Finding active sprint...
Board 3559: Found sprint "Sprint 23" (ID: 12346)
Board 3559: Fetching issues with changelog...
Board 3559: Found 61 issues (18 stories, 43 tasks)
Total: 106 issues collected
Fetching worklogs for accurate time tracking...
Worklogs fetched for 106 issues
Calculating burndown data...
Using worklog-based time tracking (most accurate)
Chart generation complete!
```

## Code Locations

- **API Route:** `app/api/burndown-stream/route.ts` - Streaming implementation
- **Frontend:** `app/page.tsx:77-149` - Stream consumer
- **UI Display:** `app/page.tsx:242-280` - Status panel component

## Benefits

1. **User Feedback:** Users see exactly what's happening instead of generic loading spinner
2. **Debugging:** Clear indication of which board/step failed if errors occur
3. **Performance Transparency:** Shows when expensive operations (changelog, worklogs) are happening
4. **Progress Tracking:** Users can see how many boards/issues have been processed
