# 🚀 Vercel Deployment Guide

## 📋 Prerequisites

Sebelum deploy ke Vercel, pastikan sudah punya:
- ✅ Backend Express API yang sudah deployed (Railway, Render, atau VPS)
- ✅ Backend API URL (contoh: `https://ihsg-api.railway.app/api/chat`)
- ✅ JWT_SECRET yang sama dengan backend

---

## 🔐 Required Environment Variables

### Critical Variables (WAJIB)

#### 1. **JWT_SECRET** 🔴 Critical
```bash
JWT_SECRET=5b40985ef1c03de8b614ce243092490c16cfe4f763ed5f44140accdecfcc5694
```
**⚠️ MUST MATCH backend JWT_SECRET exactly!**

**How to get**:
```bash
# Option 1: Copy from backend .env
cat /root/ihsg/.env | grep JWT_SECRET

# Option 2: Generate new (then update backend too)
openssl rand -hex 32
```

#### 2. **BACKEND_API_URL** 🔴 Critical
```bash
BACKEND_API_URL=https://your-backend-api.com/api/chat
```

**Examples**:
- Railway: `https://ihsg-api.railway.app/api/chat`
- Render: `https://ihsg-api.onrender.com/api/chat`
- Custom VPS: `https://api.yourdomain.com/api/chat`

**⚠️ Must include `/api/chat` path!**

#### 3. **AUTH_SECRET** 🟡 Required
```bash
# Generate at: https://generate-secret.vercel.app/32
# Or: openssl rand -base64 32
AUTH_SECRET=your-generated-secret-here
```

### Optional Variables (for Vercel features)

#### PostgreSQL Database (untuk chat history)
```bash
POSTGRES_URL=postgresql://user:password@host:5432/database
```
**Note**: Jika tidak ada, migration akan di-skip otomatis

#### Vercel AI Gateway
```bash
AI_GATEWAY_API_KEY=your-ai-gateway-key
```
**Note**: Optional jika menggunakan OIDC tokens (default Vercel)

#### Vercel Blob Storage (untuk attachments)
```bash
BLOB_READ_WRITE_TOKEN=your-blob-token
```
**Note**: Optional jika tidak pakai attachment upload

#### Redis (untuk rate limiting)
```bash
REDIS_URL=redis://default:password@host:6379
```
**Note**: Optional, app akan jalan tanpa Redis

---

## 🛠️ Step-by-Step Deployment

### 1. Prepare Backend API

**Pastikan backend sudah deployed dan accessible**:
```bash
# Test backend health
curl https://your-backend-api.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","service":"IHSG Analytics Bot API"}
```

### 2. Push Code to GitHub

```bash
cd /root/chatbot
git add .
git commit -m "Fix integration with backend API"
git push origin main
```

### 3. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: `./` (leave default)
5. **Build Command**: `pnpm build` (auto-detected)
6. **Output Directory**: `.next` (auto-detected)

### 4. Configure Environment Variables

**In Vercel Dashboard → Settings → Environment Variables**:

#### Production Environment

| Key | Value | Notes |
|-----|-------|-------|
| `JWT_SECRET` | `5b40985ef1c03de8b614ce243092490c16cfe4f763ed5f44140accdecfcc5694` | ⚠️ MUST match backend |
| `BACKEND_API_URL` | `https://your-backend.com/api/chat` | Your deployed backend URL |
| `AUTH_SECRET` | `<generate-new>` | Generate at vercel.com/generate |
| `POSTGRES_URL` | `<optional>` | For chat history storage |
| `AI_GATEWAY_API_KEY` | `<optional>` | If using AI Gateway |
| `BLOB_READ_WRITE_TOKEN` | `<optional>` | If using file uploads |
| `REDIS_URL` | `<optional>` | For rate limiting |

**Important Notes**:
- Set environment for: **Production, Preview, Development**
- Click **Save** after adding each variable
- Redeploy if needed after adding variables

### 5. Deploy

Click **Deploy** button

Vercel will:
1. ✅ Install dependencies (`pnpm install`)
2. ✅ Run database migration (or skip if no POSTGRES_URL)
3. ✅ Build Next.js app (`pnpm build`)
4. ✅ Deploy to edge network

**Build Time**: ~2-4 minutes

---

## 🐛 Troubleshooting Build Errors

### Error: "JWT_SECRET environment variable is required"

**Cause**: Missing JWT_SECRET in Vercel environment variables

**Fix**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `JWT_SECRET` with value from backend
3. Redeploy

### Error: "Migration failed"

**Cause**: Database connection issue during build

**Fix**: Migration is now **non-blocking** in production. Build will continue even if migration fails.

**Logs will show**:
```
⚠️  Continuing build despite migration failure (production mode)
```

**To fix database**:
1. Add `POSTGRES_URL` to environment variables
2. Redeploy, or
3. Run migrations manually via Vercel CLI:
   ```bash
   vercel env pull .env.production.local
   pnpm db:migrate
   ```

### Error: "BACKEND_API_URL not configured"

**Cause**: Missing BACKEND_API_URL in environment variables

**Fix**:
1. Add `BACKEND_API_URL` in Vercel Dashboard
2. Ensure it points to deployed backend (not localhost)
3. Must include `/api/chat` path
4. Redeploy

### Error: "Cannot connect to backend"

**Cause**: Backend API not accessible from Vercel

**Check**:
```bash
# From your local machine
curl https://your-backend-api.com/api/health
```

**Common issues**:
- Backend not deployed
- Backend URL incorrect
- Backend CORS not allowing Vercel domain
- Backend requires API key (should not)

### Error: Build timeout

**Cause**: Dependencies taking too long to install

**Fix**:
1. Check Vercel build logs for specific slow package
2. Consider using `pnpm` (already configured)
3. Remove unused dependencies

---

## ✅ Verify Deployment

### 1. Check Deployment Logs

In Vercel Dashboard → Deployments → Click latest deployment → View Logs

**Expected logs**:
```
✓ Running migration...
⏭️  POSTGRES_URL not defined, skipping migrations
   OR
✅ Migrations completed in 234 ms
✓ Creating an optimized production build
✓ Compiled successfully
```

### 2. Test Frontend

Visit your Vercel URL: `https://your-app.vercel.app`

**Test chat**:
1. Click "New Chat"
2. Type: "Halo"
3. Send message

**Expected**: AI response appears

### 3. Check Network Tab

Open DevTools → Network → Filter: `/api/chat`

**Check request**:
- Status: `200 OK`
- Response Type: `text/plain` (streaming)
- Response headers: `Content-Type: text/plain; charset=utf-8`

**If 403 Forbidden**:
- Check JWT_SECRET matches backend
- Check backend logs for token verification error

**If 502 Bad Gateway**:
- Backend not accessible
- BACKEND_API_URL incorrect

### 4. Check Backend Logs

If using Railway/Render, check backend logs:

**Expected logs**:
```
[JWT Middleware] ✅ Token verified successfully for user: web-user
[API /chat] User: web-user, ChatId: <id>, Message: Halo
[Stream] ✅ Primary AI streaming completed successfully
```

---

## 🔄 Continuous Deployment

Every push to `main` branch will automatically trigger:
1. ✅ New build in Vercel
2. ✅ Run migrations (if POSTGRES_URL set)
3. ✅ Deploy to production

**Branch deployments**:
- `main` → Production (`your-app.vercel.app`)
- Other branches → Preview (`<branch>-your-app.vercel.app`)

---

## 🌍 Custom Domain

### Add Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add domain: `chat.yourdomain.com`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `chat`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (~5-30 minutes)

### Update Backend CORS

**Backend must allow your custom domain**:

```typescript
// In backend Express app
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://your-app.vercel.app',
    'https://chat.yourdomain.com', // Add this
  ],
  credentials: true,
}));
```

---

## 📊 Monitoring

### Vercel Analytics
- Automatic page views tracking
- Web Vitals monitoring
- No setup required

### Custom Monitoring

**Check health endpoint**:
```bash
# Your Vercel deployment
curl https://your-app.vercel.app/api/health

# Backend API
curl https://your-backend.com/api/health
```

### Error Tracking

Vercel automatically captures:
- Build errors
- Runtime errors
- Function logs

**View in**: Dashboard → Deployments → Logs

---

## 💰 Pricing Considerations

### Vercel Free Tier Limits
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ 100 GB-hrs serverless function execution
- ⚠️ 6000 minutes build time/month

### If Exceeding Limits
- Upgrade to **Pro** ($20/month)
- Or optimize:
  - Use edge caching
  - Reduce dependencies
  - Optimize images

---

## 🔒 Security Checklist

Before going live:

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] AUTH_SECRET is generated securely
- [ ] POSTGRES_URL uses SSL connection
- [ ] Backend API uses HTTPS (not HTTP)
- [ ] CORS properly configured in backend
- [ ] No secrets in client-side code
- [ ] Environment variables not exposed in logs

---

## 📞 Support

### Build Issues
- Check Vercel build logs
- Verify environment variables
- Test build locally: `pnpm build`

### Runtime Issues
- Check Function logs in Vercel Dashboard
- Check backend API logs
- Verify JWT_SECRET matches

### Backend Connection Issues
- Test backend health endpoint
- Check BACKEND_API_URL
- Verify CORS configuration

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables Guide](https://vercel.com/docs/environment-variables)
- [Troubleshooting Builds](https://vercel.com/docs/troubleshooting/builds)

---

**Last Updated**: 8 July 2026  
**Status**: ✅ Ready for Production Deployment
