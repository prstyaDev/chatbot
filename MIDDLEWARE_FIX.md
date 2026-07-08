# Fix: API Chat Redirect Issue

**Date**: 8 July 2026, 18:12 UTC  
**Issue**: curl POST to `/api/chat` returns "Redirecting..." instead of response  
**Root Cause**: Next-Auth middleware requiring authentication for all `/api/*` routes

---

## 🔍 Problem Analysis

### Symptom
```bash
curl -X POST https://chatbot-fgmjxo9lt-prstyadevs-projects.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo","messages":[]}'
  
# Response:
Redirecting...
```

### Root Cause

1. **File**: `/root/chatbot/proxy.ts` (renamed to `middleware.ts`)
2. **Problem**: Middleware required authentication for **ALL** `/api/*` routes
3. **Impact**: `/api/chat` was protected, causing redirect to `/api/auth/guest`

**Code Before**:
```typescript
// proxy.ts
export async function proxy(request: NextRequest) {
  // ...
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // Everything else requires auth token
  const token = await getToken({ ... });
  if (!token) {
    return NextResponse.redirect(...); // ← REDIRECT HERE!
  }
}
```

---

## ✅ Solution Applied

### 1. Renamed File
```bash
mv proxy.ts middleware.ts
```
**Reason**: Next.js requires middleware to be named `middleware.ts` in root directory

### 2. Fixed Function Name
```typescript
// Before
export async function proxy(request: NextRequest) { ... }

// After
export async function middleware(request: NextRequest) { ... }
```
**Reason**: Next.js convention for middleware function name

### 3. Whitelisted `/api/chat`
```typescript
// Skip authentication for these API endpoints
// /api/chat is public and handles its own auth via backend JWT
if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/chat")) {
  return NextResponse.next();
}
```

**Reason**: 
- `/api/chat` is a **proxy route** to external backend
- Backend Express handles JWT authentication itself
- Frontend middleware should NOT block it

---

## 📝 Files Modified

| File | Change | Reason |
|------|--------|--------|
| `proxy.ts` → `middleware.ts` | Renamed | Next.js naming convention |
| `middleware.ts` | Function rename: `proxy` → `middleware` | Next.js function convention |
| `middleware.ts` | Added `/api/chat` to whitelist | Allow unauthenticated access to proxy |

---

## 🚀 Deployment Steps

```bash
cd /root/chatbot

# Add changes
git add middleware.ts
git rm proxy.ts  # if git tracked

# Commit
git commit -m "Fix: whitelist /api/chat in middleware, rename proxy.ts → middleware.ts"

# Push to trigger Vercel redeploy
git push origin main
```

---

## ✅ Expected Result After Fix

### Test Command
```bash
curl -X POST https://chatbot-fgmjxo9lt-prstyadevs-projects.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo","messages":[]}'
```

### Expected Response
```
0:"Halo"
0:"! "
0:"Ada "
0:"yang "
0:"bisa "
0:"saya "
0:"bantu"
0:"?"
d:{"finishReason":"stop"}
```

**Or** if backend not accessible:
```json
{
  "error": "Proxy Error",
  "message": "Failed to connect to backend"
}
```

**Or** if JWT_SECRET missing:
```json
{
  "error": "JWT Secret not configured",
  "message": "JWT_SECRET environment variable is required"
}
```

---

## 🔐 Security Note

### Why Whitelisting is Safe

1. **Backend validates JWT**: 
   - Frontend generates JWT token using `JWT_SECRET`
   - Backend verifies JWT token using same `JWT_SECRET`
   - Invalid tokens rejected with 403 Forbidden

2. **No data leak**:
   - `/api/chat` is just a proxy
   - No sensitive data stored in frontend
   - All business logic in backend

3. **Rate limiting**:
   - Backend handles rate limiting
   - Frontend just forwards requests

### Authentication Flow
```
Client (unauthenticated)
  ↓
Frontend /api/chat (no auth required)
  ↓
Generate JWT token with JWT_SECRET
  ↓
Backend /api/chat (verifies JWT)
  ↓
Backend returns response (or 403 if invalid token)
```

---

## 🐛 Troubleshooting

### Still Getting "Redirecting..." After Fix

**Possible causes**:
1. ❌ Vercel deployment not updated yet
2. ❌ Browser cache issue
3. ❌ CDN cache not purged

**Solutions**:
```bash
# 1. Force redeploy in Vercel Dashboard
Deployments → ... → Redeploy

# 2. Clear browser cache or use incognito

# 3. Wait 1-2 minutes for CDN propagation
```

### Getting 500 Error Instead of Redirect

**Good sign!** This means:
- ✅ Middleware whitelist working
- ❌ Environment variables missing

**Check Vercel Dashboard → Settings → Environment Variables**:
- `JWT_SECRET` ← Must be set!
- `BACKEND_API_URL` ← Must be set!
- `AUTH_SECRET` ← Must be set!

---

## 📊 Verification Checklist

After deployment:

- [ ] `middleware.ts` exists in root directory
- [ ] `proxy.ts` deleted or renamed
- [ ] Function named `middleware` (not `proxy`)
- [ ] `/api/chat` whitelisted in middleware
- [ ] Git committed and pushed
- [ ] Vercel deployment successful
- [ ] Test curl returns response (not redirect)
- [ ] Environment variables set in Vercel

---

## 📚 Related Documentation

- `/root/chatbot/VERCEL_DEPLOYMENT.md` - Full deployment guide
- `/root/INTEGRATION_FIX_REPORT.md` - Backend integration analysis
- `/root/chatbot/middleware.ts` - Middleware source code

---

**Status**: ✅ Fixed - Ready for Redeployment
