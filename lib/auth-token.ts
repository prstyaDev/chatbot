/**
 * Auth Token Management Utility
 * 
 * Utility untuk mengelola JWT token yang digunakan untuk autentikasi dengan backend.
 * Token disimpan di localStorage dengan key 'ihsg_jwt_token'.
 * 
 * Flow:
 * 1. Check localStorage untuk token yang sudah ada
 * 2. Jika tidak ada, gunakan testing token statis untuk development
 * 3. Token akan dikirim sebagai Authorization header ke backend proxy
 * 
 * @module lib/auth-token
 */

/**
 * Local storage key untuk menyimpan JWT token
 */
export const TOKEN_STORAGE_KEY = 'ihsg_jwt_token';

/**
 * Testing token statis untuk development/testing lokal.
 * Token ini berisi payload: { userId: "user-tester-lokal", iat: 1782648569 }
 * 
 * CATATAN: Token ini hanya untuk testing. Di production, user harus login
 * untuk mendapatkan token yang valid dari backend.
 */
export const TESTING_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXRlc3Rlci1sb2thbCIsImlhdCI6MTc4MjY0ODU2OX0.your-signature-here';

/**
 * Mengambil JWT token dari localStorage.
 * Jika token tidak ditemukan, akan menggunakan testing token sebagai fallback.
 * 
 * @returns {string} JWT token untuk autentikasi
 * 
 * @example
 * ```typescript
 * const token = getAuthToken();
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * ```
 */
export function getAuthToken(): string {
  // Check apakah kita di browser (client-side)
  if (typeof window === 'undefined') {
    // Di server-side, return testing token
    return TESTING_TOKEN;
  }

  try {
    // Ambil token dari localStorage
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    // Jika token ada dan tidak kosong, gunakan token tersebut
    if (token && token.trim() !== '') {
      return token;
    }
    
    // Fallback ke testing token jika tidak ada token di localStorage
    console.info('[Auth] No token found in localStorage, using testing token');
    return TESTING_TOKEN;
    
  } catch (error) {
    // Handle error jika localStorage tidak tersedia atau ada masalah
    console.warn('[Auth] Failed to read from localStorage:', error);
    return TESTING_TOKEN;
  }
}

/**
 * Menyimpan JWT token ke localStorage.
 * 
 * @param {string} token - JWT token yang akan disimpan
 * 
 * @example
 * ```typescript
 * setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * ```
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    console.warn('[Auth] Cannot set token on server-side');
    return;
  }

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    console.info('[Auth] Token saved to localStorage');
  } catch (error) {
    console.error('[Auth] Failed to save token to localStorage:', error);
  }
}

/**
 * Menghapus JWT token dari localStorage.
 * Biasanya dipanggil saat user logout.
 * 
 * @example
 * ```typescript
 * clearAuthToken();
 * ```
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    console.warn('[Auth] Cannot clear token on server-side');
    return;
  }

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    console.info('[Auth] Token cleared from localStorage');
  } catch (error) {
    console.error('[Auth] Failed to clear token from localStorage:', error);
  }
}

/**
 * Membuat Authorization header value dengan format Bearer token.
 * 
 * @param {string} [token] - JWT token (optional). Jika tidak diberikan, akan menggunakan getAuthToken()
 * @returns {string} Authorization header value dengan format "Bearer <token>"
 * 
 * @example
 * ```typescript
 * const authHeader = getAuthorizationHeader();
 * // Returns: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * // Atau dengan token custom
 * const customAuthHeader = getAuthorizationHeader('custom-token');
 * // Returns: "Bearer custom-token"
 * ```
 */
export function getAuthorizationHeader(token?: string): string {
  const authToken = token || getAuthToken();
  return `Bearer ${authToken}`;
}
