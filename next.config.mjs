/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  images: {
    remotePatterns: [
      // S3 direct (public bucket)
      { protocol: 'https', hostname: `*.s3.${process.env.AWS_REGION}.amazonaws.com` },
      // or CloudFront
      ...(process.env.CDN_URL ? [{ protocol: 'https', hostname: process.env.CDN_URL.replace(/^https?:\/\//,'') }] : []),
    ],
  },
};
export default nextConfig;
