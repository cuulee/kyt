
// Command to run development server

const path = require('path');
const chokidar = require('chokidar');
const express = require('express');
const shell = require('shelljs');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const nodemon = require('nodemon');
const once = require('ramda').once;
const logger = require('./../logger');
const ifPortIsFreeDo = require('../../utils/ifPortIsFreeDo');
const buildConfigs = require('../../utils/buildConfigs');
const webpackCompiler = require('../../utils/webpackCompiler');
const { buildPath, serverSrcPath } = require('../../utils/paths')();

module.exports = config => {
  logger.start('Starting development build...');

  let clientCompiler;
  let serverCompiler;
  const { clientConfig, serverConfig } = buildConfigs(config);
  const { clientURL, serverURL, reactHotLoader } = config;

  const afterClientCompile = once(() => {
    if (reactHotLoader) logger.task('Setup React Hot Loader');
    logger.task(`Client assets serving from ${clientCompiler.options.output.publicPath}`);
  });

  // Clean the build directory.
  if (shell.test('-d', buildPath) && shell.rm('-rf', buildPath).code === 0) {
    logger.task('Cleaned ./build');
  }

  const startClient = () => {
    const devOptions = clientCompiler.options.devServer;
    const app = express();
    const webpackDevMiddleware = devMiddleware(clientCompiler, devOptions);

    app.use(webpackDevMiddleware);
    app.use(hotMiddleware(clientCompiler));
    app.listen(clientURL.port, clientURL.hostname);
  };

  const startServer = () => {
    const serverPath = path.resolve(
      serverCompiler.options.output.path, `${Object.keys(serverCompiler.options.entry)[0]}.js`
    );

    nodemon({ script: serverPath, watch: [serverPath] })
      .once('start', () => {
        logger.task(`Server running at: ${serverURL.href}`);
        logger.end('Development started');
      })
      .on('restart', () => logger.task('Development server restarted'))
      .on('quit', process.exit);
  };

  const compileServer = () => serverCompiler.run(() => undefined);

  // Watch the server files and recompile and restart on changes.
  const watcher = chokidar.watch([serverSrcPath]);
  watcher.on('ready', () => {
    watcher
      .on('add', compileServer)
      .on('addDir', compileServer)
      .on('change', compileServer)
      .on('unlink', compileServer)
      .on('unlinkDir', compileServer);
  });

  // Compile Client Webpack Config
  clientCompiler = webpackCompiler(clientConfig, () => {
    afterClientCompile();
    compileServer();
  });

  // Compile Server Webpack Config
  serverCompiler = webpackCompiler(serverConfig, once(() => {
    ifPortIsFreeDo(serverURL.port, startServer);
  }));

  // Starting point...
  // By starting the client, the middleware will
  // compile the client configuration and trigger
  // the `clientCompiler` callback.
  ifPortIsFreeDo(clientURL.port, startClient);
};
