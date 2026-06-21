const PROMISE_WITH_RESOLVERS_POLYFILL = `
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    var resolve, reject;
    var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}
`

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias.canvas = false
    if (isServer) {
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: PROMISE_WITH_RESOLVERS_POLYFILL,
          raw: true,
          entryOnly: false,
        })
      )
    }
    return config
  },
}

export default nextConfig
