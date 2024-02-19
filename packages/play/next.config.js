/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const SentryWebpackPluginOptions = {
  silent: true,
};

const isProduction = process.env.NODE_ENV === "production";

/**
 * @type {import('@blitzjs/next').BlitzConfig}
 **/
let config = {
  productionBrowserSourceMaps: true,
  compress: false,
  swcMinify: true,

  // TODO: it would be nice if this worked, but cross-origin
  // workers are not a thing yet.
  // assetPrefix: isProduction ? "https://static.placemark.io" : "", // "http://0.0.0.0:8787",

  webpack(config, options) {
    if (process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      // eslint-disable-next-line
      config.plugins.push(
        // eslint-disable-next-line
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          generateStatsFile: true,
          reportFilename: options.isServer
            ? "../analyze/server.html"
            : "./analyze/client.html",
        })
      );
    }
    // eslint-disable-next-line
    return config;
  },

  // eslint-disable-next-line
  async headers() {
    return [
      {
        source: "/:path*",
        // https://bit.ly/3aWDvYg
        headers: [
          {
            key: "x-frame-options",
            value: "frameGuard",
          },
          {
            key: "x-download-options",
            value: "noopen",
          },
        ],
      },
    ];
  },

  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = config;
