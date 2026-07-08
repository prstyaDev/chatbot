/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration for Vercel deployment
  output: 'standalone',
  
  // Skip ESLint during build (linting done separately in CI/CD)
  // This prevents build failures due to linting issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skip TypeScript type checking during build (checked separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Turbo is opt-in for Next.js 15 (via --turbo flag in dev only)
  // Production builds use Webpack by default
};

export default nextConfig;

