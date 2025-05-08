/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config: any, { isServer }: any) => {
    // Add custom Webpack configuration here if needed
    if (!isServer) {
      // Example: Modify client-side Webpack config
    }
    return config;
  },
};

module.exports = nextConfig;