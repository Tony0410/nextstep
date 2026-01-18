/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Output standalone for Docker
  output: 'standalone',
}

module.exports = nextConfig
