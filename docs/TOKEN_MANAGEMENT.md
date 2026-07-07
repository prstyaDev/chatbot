# Token Management - JWT Authentication

## Overview

Frontend Next.js ini menggunakan JWT (JSON Web Token) untuk autentikasi dengan backend eksternal. Token disimpan di `localStorage` browser dan otomatis dikirimkan sebagai `Authorization` header pada setiap request chat.

## Architecture

```
Browser localStorage (ihsg_jwt_token)
    ↓
getAuthToken() → Token exists? Yes → Use stored token
                              ↓ No
                         TESTING_TOKEN (fallback)
    ↓
getAuthorizationHeader() → "Bearer <token>"
    ↓
useChat prepareSendMessagesRequest() → headers: { Authorization }
    ↓
POST /api/chat (Proxy Route) → Forward to Backend
    ↓
Backend API → Verify JWT → Extract userId → Process request
```

## Files

### `lib/auth-token.ts`
Utility module untuk mengelola JWT token dengan functions:
- `getAuthToken()`: Ambil token dari localStorage (fallback: TESTING_TOKEN)
- `setAuthToken(token)`: Simpan token ke localStorage
- `clearAuthToken()`: Hapus token dari localStorage
- `getAuthorizationHeader()`: Format Bearer token

### `components/chat.tsx`
Komponen chat dengan Authorization header injection di useChat transport.

## Usage

### Development (Testing Token)

Token testing otomatis digunakan jika localStorage kosong:

```typescript
TESTING_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXRlc3Rlci1sb2thbCIsImlhdCI6MTc4MjY0ODU2OX0.your-signature-here"

// Payload: { userId: "user-tester-lokal", iat: 1782648569 }
```

### Production (Real Token)

```typescript
// Login dan simpan token
import { setAuthToken } from '@/lib/auth-token';
setAuthToken(tokenFromBackend);

// Logout
import { clearAuthToken } from '@/lib/auth-token';
clearAuthToken();
```

### Manual Management (Browser Console)

```javascript
// Set token
localStorage.setItem('ihsg_jwt_token', 'your-token');

// Get token
localStorage.getItem('ihsg_jwt_token');

// Clear token
localStorage.removeItem('ihsg_jwt_token');
```

## Security Notes

⚠️ **Testing Token:** Hanya untuk development, jangan di production
🔒 **Production:** Token harus di-sign dan punya expiration
🛡️ **localStorage:** Rentan XSS, consider httpOnly cookies

## Troubleshooting

**Token tidak terkirim:**
- Check console errors
- Verify: `localStorage.getItem('ihsg_jwt_token')`
- Check Network tab DevTools

**401 Unauthorized:**
- Token expired/invalid
- Clear dan login ulang
- Check backend logs

## Backend Integration

Backend harus verify JWT dan extract userId:

```javascript
// Middleware example (Node.js)
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = decoded.userId;
  next();
}
```

---
Last Updated: 2026-07-07
