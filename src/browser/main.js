/* eslint dot-notation: 0 */
/* eslint global-require: 0 */
global.shellStartTime = Date.now();

const app = require('electron').app;
const path = require('path');
const mkdirp = require('mkdirp');

const setupConfigDir = (args) => {
  const defaultDirName = (args.specMode) ? '.nylas-spec' : '.nylas';
  let configDirPath = path.join(app.getPath('home'), defaultDirName);

  if (args.configDirPath) {
    configDirPath = args.configDirPath;
  } else if (process.env.NYLAS_HOME) {
    configDirPath = process.env.NYLAS_HOME;
  }

  mkdirp.sync(configDirPath);
  process.env.NYLAS_HOME = configDirPath;
  return configDirPath;
};

const setupCompileCache = (configDirPath) => {
  const compileCache = require('../compile-cache');
  return compileCache.setHomeDirectory(configDirPath);
};

const setupErrorLogger = (args = {}) => {
  const ErrorLogger = require('../error-logger');
  const errorLogger = new ErrorLogger({
    inSpecMode: args.specMode,
    inDevMode: args.devMode,
    resourcePath: args.resourcePath,
  });
  process.on('uncaughtException', errorLogger.reportError);
  process.on('unhandledRejection', errorLogger.reportError);
  return errorLogger;
};

const declareOptions = (argv) => {
  const optimist = require('optimist');
  const options = optimist(argv);
  options.usage("Nylas N1 v" + (app.getVersion()) + "\n\nUsage: n1 [options]\n\nRun N1: The open source extensible email client\n\n`n1 --dev` to start the client in dev mode.\n\n`n1 --test` to run unit tests.");
  options.alias('d', 'dev').boolean('d').describe('d', 'Run in development mode.');
  options.alias('t', 'test').boolean('t').describe('t', 'Run the specified specs and exit with error code on failures.');
  options.boolean('safe').describe('safe', 'Do not load packages from ~/.nylas/packages or ~/.nylas/dev/packages.');
  options.alias('h', 'help').boolean('h').describe('h', 'Print this usage message.');
  options.alias('l', 'log-file').string('l').describe('l', 'Log all test output to file.');
  options.alias('c', 'config-dir-path').string('c').describe('c', 'Override the path to the N1 configuration directory');
  options.alias('s', 'spec-directory').string('s').describe('s', 'Override the directory from which to run package specs');
  options.alias('f', 'spec-file-pattern').string('f').describe('f', 'Override the default file regex to determine which tests should run (defaults to "-spec\.(coffee|js|jsx|cjsx|es6|es)$" )');
  options.alias('v', 'version').boolean('v').describe('v', 'Print the version.');
  options.alias('b', 'background').boolean('b').describe('b', 'Start N1 in the background');
  return options;
};

const parseCommandLine = (argv) => {
  const version = app.getVersion();
  const options = declareOptions(argv.slice(1));
  const args = options.argv;

  if (args.help) {
    process.stdout.write(options.help());
    process.exit(0);
  }
  if (args.version) {
    process.stdout.write(version + "\n");
    process.exit(0);
  }
  const devMode = args['dev'] || args['test'];
  const logFile = args['log-file'];
  const specMode = args['test'];
  const safeMode = args['safe'];
  const background = args['background'];
  const configDirPath = args['config-dir-path'];
  const specDirectory = args['spec-directory'];
  const specFilePattern = args['spec-file-pattern'];
  const showSpecsInWindow = specMode === "window";
  const resourcePath = path.resolve(args['resource-path'] != null ? args['resource-path'] : path.dirname(path.dirname(__dirname)));
  const urlsToOpen = [];
  const pathsToOpen = [];

  // On Windows and Linux, mailto and file opens are passed as the last argv
  if (argv.length > 1 && !argv.join(' ').includes('--squirrel')) {
    const lastArg = argv[argv.length - 1];
    if (lastArg.startsWith('mailto:')) {
      urlsToOpen.push(lastArg);
    } else if ((lastArg[0] !== '-') && (/[\/|\\]/.test(lastArg))) {
      pathsToOpen.push(lastArg);
    }
  }

  if (args['path-environment']) {
    process.env.PATH = args['path-environment'];
  }

  return {
    version,
    devMode,
    background,
    logFile,
    specMode,
    safeMode,
    configDirPath,
    specDirectory,
    specFilePattern,
    showSpecsInWindow,
    resourcePath,
    urlsToOpen,
    pathsToOpen,
  };
};

const handleStartupEventWithSquirrel = () => {
  if (process.platform !== 'win32') {
    return false;
  }
  const WindowsUpdater = require('./windows-updater');
  const squirrelCommand = process.argv[1];
  return WindowsUpdater.handleStartupEvent(app, squirrelCommand);
};

const start = () => {
  app.setAppUserModelId('com.squirrel.nylas.nylas');
  if (handleStartupEventWithSquirrel()) {
    return;
  }

  const otherInstanceRunning = app.makeSingleInstance((commandLine) => {
    const options = parseCommandLine(commandLine);
    global.application.handleLaunchOptions(options);
  });

  if (otherInstanceRunning) {
    app.quit();
  }

  const options = parseCommandLine(process.argv);

  if (options.devMode && /n1/.test(__dirname)) {
    console.error("You must cd into `/N1` (uppercase) instead of `/n1` (lowercase).");
    app.quit();
  }

  global.errorLogger = setupErrorLogger(options);
  const configDirPath = setupConfigDir(options);
  options.configDirPath = configDirPath;
  setupCompileCache(configDirPath);

  const onOpenFileBeforeReady = (event, file) => {
    event.preventDefault();
    options.pathsToOpen.push(file);
  };

  const onOpenUrlBeforeReady = (event, url) => {
    event.preventDefault();
    options.urlsToOpen.push(url);
  };

  app.on('open-url', onOpenUrlBeforeReady);
  app.on('open-file', onOpenFileBeforeReady);
  app.on('ready', () => {
    app.removeListener('open-file', onOpenFileBeforeReady);
    app.removeListener('open-url', onOpenUrlBeforeReady);
    const Application = require(path.join(options.resourcePath, 'src', 'browser', 'application')).default;
    global.application = new Application();
    global.application.start(options);
    if (!options.specMode) {
      console.log("App load time: " + (Date.now() - global.shellStartTime) + "ms");
    }
  });
};

start();
