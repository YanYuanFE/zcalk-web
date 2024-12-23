/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // fallback 配置
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
            crypto: false
        };
        return config;
    }
};

export default nextConfig;
