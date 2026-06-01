/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: true,
    serverComponentsExternalPackages: ["xlsx", "cheerio"],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'xlsx'];
    return config;
  },
};

module.exports = nextConfig;
