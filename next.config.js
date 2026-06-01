/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  serverExternalPackages: ['xlsx', 'cheerio'],
}

module.exports = nextConfig
