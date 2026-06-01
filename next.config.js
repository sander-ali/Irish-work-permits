/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['xlsx', 'cheerio'] },
}
module.exports = nextConfig
