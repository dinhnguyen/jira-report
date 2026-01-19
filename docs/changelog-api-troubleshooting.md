# Changelog API Troubleshooting Guide

## Vấn đề: Changelog field = NO

Nếu bạn thấy "Has changelog field: NO ✗" trong Debug Panel mặc dù Jira có history, có thể do:

### Nguyên nhân phổ biến:

1. **Jira Cloud Permissions**
   - Account không có quyền xem changelog
   - Board/Project settings restrict changelog access
   - API token không đủ quyền

2. **Jira API Version**
   - Jira Cloud đôi khi không hỗ trợ expand=changelog cho search API
   - Cần sử dụng dedicated changelog endpoint

3. **API Request Issues**
   - Expand parameter không được xử lý đúng
   - Rate limiting hoặc API throttling

## Cách Debug

### Bước 1: Test Changelog API Trực Tiếp

1. **Mở Debug Panel**:
   - Generate burndown chart
   - Click "Debug: Luồng Dữ Liệu Burndown"
   - Panel sẽ expand

2. **Sử dụng Changelog API Test**:
   - Tìm section "🧪 Test Changelog API" (màu cam) ở đầu debug panel
   - Nhập một issue key bất kỳ từ sprint (ví dụ: `PROJ-123`)
   - Click "Test"

3. **Phân tích kết quả**:

   **✅ Success Case:**
   ```
   Has changelog field: YES ✓
   Changelog total: 15
   Changelog histories length: 15
   ```
   → API hoạt động bình thường, vấn đề có thể ở search endpoint

   **❌ Failed Case:**
   ```
   Has changelog field: NO ✗
   Error: 403 Forbidden
   ```
   → Permissions issue, check Jira settings

### Bước 2: Check Console Logs

Mở Browser Developer Tools (F12) → Console tab:

```javascript
// Look for these logs:
"JQL with changelog - Request params:"
// → Verify expand: 'changelog' is present

"First issue from API:"
// → Check hasChangelogInResponse: true/false

"Sample issue raw keys:"
// → See all top-level fields returned by API
```

### Bước 3: Verify Jira Permissions

1. **Check API Token Scope**:
   - Go to: https://id.atlassian.com/manage-profile/security/api-tokens
   - Verify token has "Read" permissions
   - Regenerate token if needed

2. **Check Jira Project Permissions**:
   - Jira → Project Settings → Permissions
   - Verify account has "Browse Projects" permission
   - Check "View Development Tools" permission

3. **Check Issue History in Jira UI**:
   - Open any issue in browser
   - Check if you can see "History" tab
   - If no History tab → Permissions issue

## Giải pháp

### Solution 1: Sử dụng Individual Issue Endpoint

Nếu search API không trả về changelog, có thể fetch từng issue:

```typescript
// Instead of:
GET /rest/api/3/search?jql=sprint=123&expand=changelog

// Use:
GET /rest/api/3/issue/{issueKey}?expand=changelog
// For each issue
```

**Ưu điểm**: Luôn trả về changelog
**Nhược điểm**: Nhiều API calls, chậm hơn

### Solution 2: Sử dụng Jira API v2

API v2 đôi khi stable hơn v3 cho changelog:

```typescript
const searchClient = axios.create({
  baseURL: `https://${domain}/rest/api/2`,
  // ... auth
});
```

### Solution 3: Sử dụng Agile Board Endpoint

Alternative API endpoint:

```typescript
GET /rest/agile/1.0/board/{boardId}/issue
// Then fetch changelog separately
```

### Solution 4: Fallback Mode (Không có changelog)

Nếu không lấy được changelog, app vẫn hoạt động với limitations:

- ✅ Timeline vẫn được tính
- ✅ Burndown chart vẫn vẽ được
- ❌ Không track scope creep chính xác
- ❌ Không biết khi nào issue được add vào sprint

**App tự động fallback** nếu changelog không available.

## Test Cases

### Test 1: Single Issue Test
```bash
# Trong Changelog API Test:
Input: PROJ-123
Expected: changelog total > 0
```

### Test 2: Search API Test
```bash
# Check server logs:
"Issues with changelog field: X/Y"
# X should equal Y
```

### Test 3: Manual API Test

Sử dụng curl để test trực tiếp:

```bash
# Replace with your credentials
DOMAIN="your-domain.atlassian.net"
EMAIL="your-email@example.com"
TOKEN="your-api-token"
ISSUE="PROJ-123"

curl -u "$EMAIL:$TOKEN" \
  -H "Accept: application/json" \
  "https://$DOMAIN/rest/api/3/issue/$ISSUE?expand=changelog" \
  | jq '.changelog.total'

# Should return a number > 0
```

## Common Errors

### Error 1: "Property 'changelog' does not exist"
**Cause**: TypeScript type definition missing
**Fix**: Already added `changelog?` to JiraIssue type

### Error 2: "403 Forbidden"
**Cause**: Insufficient permissions
**Fix**:
1. Check API token permissions
2. Verify Jira project access
3. Contact Jira admin

### Error 3: "changelog.total = 0" but History exists
**Cause**: Issue is new, no history yet
**Fix**: Test with older issue that has changes

### Error 4: "expand field undefined"
**Cause**: Jira doesn't return expand field
**Fix**: Check hasChangelogInResponse instead

## Monitoring

### Production Monitoring

Add these logs to monitor changelog availability:

```typescript
console.log(`Changelog coverage: ${withChangelog}/${total} (${percent}%)`);
```

Ideal: 80-100% issues have changelog
Warning: <50% issues have changelog
Critical: 0% issues have changelog

### Debug Mode

Enable verbose logging:

```typescript
// In jira-client.ts
const DEBUG = true;

if (DEBUG) {
  console.log('Raw API response:', response.data);
}
```

## References

- [Jira API v3 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Issue Changelog API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-changelog-get)
- [Search API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-get)

## Contact Support

If issue persists:
1. Export test results from Changelog API Test
2. Save console logs
3. Check Jira Service Desk
4. Contact your Jira administrator
