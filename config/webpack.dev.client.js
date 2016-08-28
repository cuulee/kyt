
// Development webpack config for client code

const path = require('path');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const clone = require('ramda').clone;

const cssStyleLoaders = [
  'style',
  {
    loader: 'css',
    query: { modules: true, sourceMap: true, localIdentName: '[name]-[local]--[hash:base64:5]' },
  },
  'postcss',
];

module.exports = (options) => {
  const main = [
    `webpack-hot-middleware/client?reload=true&path=http://localhost:${options.clientPort}/__webpack_hmr`,
    path.join(options.userRootPath, 'src/client/index.js')
  ];

  if (options.reactHotLoader) main.unshift('react-hot-loader/patch');

  return {
    target: 'web',

    entry: {
      main,
    },

    output: {
      path: path.join(options.publicDir, 'assets'),
      filename: '[name].js',
      chunkFilename: '[name]-[chunkhash].js',
      publicPath: options.publicPath,
      libraryTarget: 'var',
    },

    devServer: {
      publicPath: options.publicPath,
      headers: { 'Access-Control-Allow-Origin': '*' },
      noInfo: true,
      quiet: true,
    },

    module: {
      loaders: [
        {
          test: /\.css$/,
          loaders: cssStyleLoaders,
        },
        {
          test: /\.scss$/,
          loaders: clone(cssStyleLoaders).concat('sass'),
        },
      ],
    },

    plugins: [
      new webpack.NoErrorsPlugin(),

      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),

      new AssetsPlugin({
        filename: options.clientAssetsFile,
        path: options.buildPath,
      }),

      new webpack.HotModuleReplacementPlugin(),
    ],
  };
};
