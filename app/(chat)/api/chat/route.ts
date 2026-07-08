/**
 * Chat API Proxy Route
 * 
 * Route ini berfungsi sebagai proxy murni ke backend API eksternal.
 * Semua request diteruskan ke backend dengan header Authorization dan body asli,
 * kemudian response streaming dari backend diteruskan kembali ke client.
 * 
 * Backend menangani semua logika:
 * - Autentikasi dan autorisasi via JWT token
 * - Rate limiting dan validasi
 * - Penyimpanan chat history ke database (Supabase)
 * - Generasi response dari LLM
 * 
 * Required Environment Variables:
 * - BACKEND_API_URL: Endpoint backend eksternal (e.g., http://localhost:3000/api/chat)
 * - JWT_SECRET: Secret key untuk signing JWT token
 * 
 * @example
 * // Local development
 * BACKEND_API_URL=http://localhost:3000/api/chat
 * JWT_SECRET=your-secret-key-here
 * 
 * // Production
 * BACKEND_API_URL=https://api.yourdomain.com/api/chat
 * JWT_SECRET=your-production-secret-key
 */

import { SignJWT } from 'jose';

// Timeout maksimal untuk streaming requests (60 detik)
export const maxDuration = 60;

/**
 * Generate JWT token untuk autentikasi ke backend
 * Token ini ditandatangani dengan JWT_SECRET dan berisi payload userId dan chatId
 */
async function generateBackendToken(userId: string, chatId: string): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  // Convert secret string ke Uint8Array untuk jose
  const secret = new TextEncoder().encode(jwtSecret);
  
  // Generate JWT dengan payload standar
  const token = await new SignJWT({ 
    userId, 
    chatId 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Token berlaku selama 1 jam
    .sign(secret);
  
  return token;
}

/**
 * POST /api/chat
 * 
 * Meneruskan chat request ke backend eksternal dan streaming response kembali ke client.
 * 
 * Sebelum meneruskan request:
 * 1. Generate JWT token baru dengan JWT_SECRET
 * 2. Token berisi payload { userId, chatId } yang dibutuhkan backend
 * 3. Token dikirim dalam header Authorization: Bearer <token>
 * 
 * Response headers yang diteruskan dari backend:
 * - Content-Type: format response (biasanya text/event-stream untuk DataStream)
 * - Content-Encoding: encoding jika ada
 * - Transfer-Encoding: chunked untuk streaming
 * - Cache-Control: caching policy
 */
export async function POST(request: Request) {
  try {
    // 1. Validasi konfigurasi backend URL
    const backendUrl = process.env.BACKEND_API_URL;
    
    if (!backendUrl) {
      return new Response(
        JSON.stringify({
          error: 'Backend API URL not configured',
          message: 'BACKEND_API_URL environment variable is required',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Validasi JWT_SECRET
    if (!process.env.JWT_SECRET) {
      return new Response(
        JSON.stringify({
          error: 'JWT Secret not configured',
          message: 'JWT_SECRET environment variable is required',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse request body untuk mendapatkan chatId jika tersedia
    let body: string;
    let chatId = 'web-session'; // Default chatId
    
    try {
      const json = await request.json();
      
      // Ekstrak chatId dari request jika ada
      if (json.id) {
        chatId = json.id;
      }
      
      body = JSON.stringify(json);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON body',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Generate JWT token untuk backend
    // Token berisi payload { userId: "web-user", chatId }
    let backendToken: string;
    try {
      backendToken = await generateBackendToken('web-user', chatId);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Token Generation Failed',
          message: error instanceof Error ? error.message : 'Failed to generate authentication token',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Forward request ke backend dengan JWT token yang baru di-generate
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
      body,
    });

    // 6. Forward selective response headers dari backend ke client
    const responseHeaders = new Headers();
    
    // Headers penting untuk streaming dan caching
    const headersToForward = [
      'Content-Type',
      'Content-Encoding',
      'Transfer-Encoding',
      'Cache-Control',
    ];
    
    for (const headerName of headersToForward) {
      const headerValue = backendResponse.headers.get(headerName);
      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    }

    // 7. Stream response body dari backend ke client
    // Pass-through status code dan body apa adanya (termasuk error responses)
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    // Handle network errors atau fetch failures
    console.error('Proxy error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Proxy Error',
        message: error instanceof Error ? error.message : 'Failed to connect to backend',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
