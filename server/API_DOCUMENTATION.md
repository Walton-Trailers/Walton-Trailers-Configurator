# Airtable Integration API Documentation

## Overview
This API provides secure integration with Airtable for syncing trailer data. All endpoints require admin authentication and include comprehensive security measures.

## Base URL
```
https://your-domain.com/api/v1/integrations/airtable
```

## Authentication
All endpoints require admin session authentication via cookie.

## Security Features
- **Rate Limiting**: 100 requests per 15 minutes (general), 10 requests per minute (Airtable-specific)
- **Input Validation**: All inputs are validated and sanitized
- **Timeout Protection**: 30-second timeout for all API calls
- **Error Sanitization**: Internal details are never exposed in error messages
- **Encryption**: Credentials are encrypted at rest (production)
- **Audit Logging**: All requests are logged with request IDs

## Endpoints

### 1. Test Connection
**POST** `/api/v1/integrations/airtable/test`

Tests connection to an Airtable base and returns available tables.

#### Request Body
```json
{
  "accessToken": "pat...",  // Personal Access Token (required)
  "baseId": "app..."        // Base ID (required)
}
```

#### Response (Success)
```json
{
  "success": true,
  "tableCount": 3,
  "tables": [
    {
      "id": "tbl...",
      "name": "Trailer Models",
      "description": "Main trailer inventory"
    }
  ],
  "message": "Successfully connected to Airtable"
}
```

#### Response (Error)
```json
{
  "error": "Failed to connect to Airtable",
  "message": "Invalid credentials provided",
  "details": [
    {
      "field": "accessToken",
      "message": "Invalid Airtable access token format"
    }
  ]
}
```

### 2. Save Configuration
**POST** `/api/v1/integrations/airtable/save`

Saves validated Airtable credentials for future use.

#### Request Body
```json
{
  "accessToken": "pat...",
  "baseId": "app..."
}
```

### 3. Get Status
**GET** `/api/v1/integrations/airtable/status`

Returns current connection status.

#### Response
```json
{
  "connected": true,
  "hasToken": true,
  "baseId": "app123...",
  "lastValidated": "2025-08-16T10:00:00Z"
}
```

### 4. Import Data
**POST** `/api/v1/integrations/airtable/import`

Imports records from specified Airtable table.

#### Request Body
```json
{
  "tableName": "Trailer Models",
  "importMode": "merge"  // "merge" or "replace" (optional, default: "merge")
}
```

#### Response
```json
{
  "success": true,
  "importedCount": 45,
  "totalRecords": 50,
  "errors": ["Record rec123 missing Name field"],
  "message": "Imported 45 of 50 records",
  "idempotencyKey": "import-app123-TrailerModels-1755315600000"
}
```

### 5. Export Data
**POST** `/api/v1/integrations/airtable/export`

Exports data to Airtable in batches.

#### Request Body
```json
{
  "dataType": "models"  // "models" or "options"
}
```

#### Response
```json
{
  "success": true,
  "exportedCount": 100,
  "totalRecords": 100,
  "message": "Exported 100 of 100 records",
  "idempotencyKey": "export-models-1755315600000"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input or configuration |
| 401 | Unauthorized - Admin authentication required |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |
| 504 | Gateway Timeout - Request timed out |

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Airtable Operations**: 10 requests per minute per IP
- **Batch Operations**: Automatic 200ms delay between batches

## Best Practices

1. **Always test connection** before saving configuration
2. **Use idempotency keys** to track import/export operations
3. **Handle rate limits** gracefully with exponential backoff
4. **Validate data** before importing to avoid corruption
5. **Monitor logs** using request IDs for debugging

## Security Considerations

1. **Token Storage**: Tokens are encrypted at rest in production
2. **HTTPS Only**: All API calls must use HTTPS in production
3. **Session Timeout**: Admin sessions expire after inactivity
4. **Audit Trail**: All operations are logged for compliance
5. **Input Sanitization**: All inputs are validated and sanitized

## Examples

### cURL Example - Test Connection
```bash
curl -X POST https://your-domain.com/api/v1/integrations/airtable/test \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=your-session-id" \
  -d '{
    "accessToken": "patXXXXXXXXXXXXXX",
    "baseId": "appXXXXXXXXXXXX"
  }'
```

### JavaScript Example - Import Data
```javascript
const response = await fetch('/api/v1/integrations/airtable/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    tableName: 'Trailer Models',
    importMode: 'merge'
  })
});

const result = await response.json();
console.log(`Imported ${result.importedCount} records`);
```

## Compliance

This API implementation addresses:
- **GDPR**: Encrypted storage, audit logging, data minimization
- **Security**: Input validation, rate limiting, secure authentication
- **Performance**: Timeouts, batch processing, caching
- **Reliability**: Error handling, idempotency, graceful degradation