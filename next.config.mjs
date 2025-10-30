/** @type {import('next').NextConfig} */
function buildCsp() {
  const isDev = process.env.NODE_ENV !== 'production';
  const connect = ["'self'", 'https:'];
  if (isDev) connect.push('ws:', 'wss:', 'http:');
  // In dev, Next.js HMR uses websockets; allow inline for scripts/styles already present
  return (
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "media-src 'self' https: blob:; " +
    "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : '') + "; " +
    "style-src 'self' 'unsafe-inline'; " +
    `connect-src ${connect.join(' ')}; ` +
    "frame-ancestors 'self';"
  );
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: buildCsp() },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Tighten in production to your app host if provided
      allowedOrigins: process.env.NODE_ENV === 'production'
        ? (() => {
            try {
              const u = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : null;
              return u ? [u.host] : ['*'];
            } catch { return ['*']; }
          })()
        : ['*']
    }
  },
  images: {
    remotePatterns: [
      // S3 direct (public bucket)
      { protocol: 'https', hostname: `*.s3.${process.env.AWS_REGION}.amazonaws.com` },
      // or CloudFront
      ...(process.env.CDN_URL ? [{ protocol: 'https', hostname: process.env.CDN_URL.replace(/^https?:\/\//,'') }] : []),
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};
export default nextConfig;
