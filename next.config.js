/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["localhost", "firebasestorage.googleapis.com"],
    unoptimized: true, // For Netlify deployment
  },
}

module.exports = nextConfig
