# Dify Integration Guide

## Environment Setup

### Required Environment Variables

Create `.env.local` in the frontend directory:

```bash
# Dify AI Configuration
NEXT_PUBLIC_DIFY_API_KEY=app-xxxxxxxxxxxxx
DIFY_API_URL=https://api.dify.ai/v1/chat-messages
```

## API Endpoint

### POST /api/chat

Processes natural language and returns structured intent.

**Request:**
```json
{
  "message": "deposit 1 ETH"
}
```

**Response:**
```json
{
  "success": true,
  "intent": {
    "action": "deposit",
    "amount": 1,
    "token": "ETH",
    "token_address": "0x0000000000000000000000000000000000000000",
    "confidence": "high"
  },
  "rawResponse": "{\"action\":\"deposit\",...}"
}
```

## Token Addresses

- **ETH**: `0x0000000000000000000000000000000000000000`
- **USDT**: `0x4c5859f0F772848b2D91F1D83E2Fe57935348029`

## Example Usage

### cURL
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "deposit 1 ETH"}'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'deposit 1 ETH' })
})

const data = await response.json()
console.log(data.intent)
```

### React Component
```typescript
async function parseIntent(message: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })

  const { success, intent, rawResponse } = await response.json()

  if (success && intent.action !== 'unknown') {
    // Use the intent
    return intent
  } else {
    // Handle unknown intent
    throw new Error('Could not understand the command')
  }
}
```

## Supported Commands

### English
- `deposit 1 ETH`
- `withdraw 0.5 USDT`
- `put 2 ETH into vault`
- `take out 10 USDT`

### Chinese
- `存入 100 USDT`
- `提取 1 ETH`
- `我想存入 5 ETH`

## Intent Response Structure

```typescript
interface IntentResponse {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
}
```

## Error Handling

### Low Confidence Response
```json
{
  "success": true,
  "intent": {
    "action": "unknown",
    "amount": 0,
    "token": "unknown",
    "token_address": "0x0000000000000000000000000000000000000000",
    "confidence": "low"
  }
}
```

### API Error
```json
{
  "error": "Failed to process intent"
}
```

## Testing

### Test Cases

1. **Simple deposit (English)**
   - Input: `deposit 1 ETH`
   - Expected: `{"action":"deposit","amount":1,"token":"ETH",...}`

2. **Withdrawal (Chinese)**
   - Input: `提取 100 USDT`
   - Expected: `{"action":"withdraw","amount":100,"token":"USDT",...}`

3. **Casual phrasing**
   - Input: `put 2.5 ETH into vault`
   - Expected: `{"action":"deposit","amount":2.5,"token":"ETH",...}`

4. **Unknown command**
   - Input: `hello world`
   - Expected: `{"action":"unknown",...}`

## Security Notes

1. **API Key Protection**: The API key is in `.env.local` (not committed to git)
2. **Server-Side Calls**: Dify API is called from the server, protecting the key
3. **Input Validation**: All inputs are validated before processing
4. **Error Handling**: Graceful fallback for parsing errors

## Next Steps

- [ ] Test API endpoint with various inputs
- [ ] Create AI Panel component (Mission G)
- [ ] Integrate with Vault operations
- [ ] Add error handling in UI

## Status

✅ API Route Created: `app/api/chat/route.ts`
✅ Environment Configuration Guide
✅ Example Usage Documentation

⏳ Next: Create AI Panel Component (Mission G)
