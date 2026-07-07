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
 * 
 * @example
 * // Local development
 * BACKEND_API_URL=http://localhost:3000/api/chat
 * 
 * // Production
 * BACKEND_API_URL=https://api.yourdomain.com/api/chat
 */

// Timeout maksimal untuk streaming requests (60 detik)
export const maxDuration = 60;

/**
 * POST /api/chat
 * 
 * Meneruskan chat request ke backend eksternal dan streaming response kembali ke client.
 * 
 * Headers yang diteruskan:
 * - Authorization: JWT token untuk autentikasi
 * - Content-Type: application/json
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

    // 2. Ekstrak Authorization header dari request
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization header is required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse request body
    let body: string;
    try {
      const json = await request.json();
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

    // 4. Forward request ke backend dengan Authorization header
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body,
    });

    // 5. Forward selective response headers dari backend ke client
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

    // 6. Stream response body dari backend ke client
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
