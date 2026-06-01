/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['xlsx', 'cheerio'] },
}
module.exports = {
  webpack: (config) => {
    config.externals = [...config.externals, 'xlsx'];
    return config;
  },
}
