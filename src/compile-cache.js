'use strict'

var path = require('path')
var fs = require('fs-plus')

var babelCompiler = require('./compile-support/babel')
var coffeeCompiler = require('./compile-support/coffee-script')
var typescriptCompiler = require('./compile-support/typescript')
var CSON = null

var COMPILERS = {
  '.js': babelCompiler,
  '.jsx': babelCompiler,
  '.es6': babelCompiler,
  '.ts': typescriptCompiler,
  '.coffee': coffeeCompiler,
  '.cjsx': coffeeCompiler
}

var cacheStats = {}
var cacheDirectory = null

exports.setHomeDirectory = function (nylasHome) {
  var cacheDir = path.join(nylasHome, 'compile-cache')
  if (process.env.USER === 'root' && process.env.SUDO_USER && process.env.SUDO_USER !== process.env.USER) {
    cacheDir = path.join(cacheDir, 'root')
  }
  this.setCacheDirectory(cacheDir)
}

exports.setHotReload = function(hotreload) {
  // This sets require.extensions['.cjsx']
  if (hotreload) {
    require('./compile-support/cjsx').register();
  }
}

exports.setCacheDirectory = function (directory) {
  cacheDirectory = directory
}

exports.getCacheDirectory = function () {
  return cacheDirectory
}

exports.addPathToCache = function (filePath, nylasHome) {
  this.setHomeDirectory(nylasHome)
  var extension = path.extname(filePath)

  if (extension === '.cson') {
    if (!CSON) {
      CSON = require('season')
      CSON.setCacheDir(this.getCacheDirectory())
    }
    CSON.readFileSync(filePath)
  } else {
    var compiler = COMPILERS[extension]
    if (compiler) {
      compileFileAtPath(compiler, filePath, extension)
    }
  }
}

exports.getCacheStats = function () {
  return cacheStats
}

exports.resetCacheStats = function () {
  Object.keys(COMPILERS).forEach(function (extension) {
    cacheStats[extension] = {
      hits: 0,
      misses: 0
    }
  })
}

function compileFileAtPath (compiler, filePath, extension, module) {
  var sourceCode = fs.readFileSync(filePath, 'utf8')
  if (compiler.shouldCompile(sourceCode, filePath)) {
    var cachePath = compiler.getCachePath(sourceCode, filePath)
    var compiledCode = readCachedJavascript(cachePath)
    if (compiledCode != null) {
      cacheStats[extension].hits++
    } else {
      cacheStats[extension].misses++
      compiledCode = addSourceURL(compiler.compile(sourceCode, filePath), filePath)
      writeCachedJavascript(cachePath, compiledCode)
    }
    return compiledCode
  }
  return sourceCode
}

function readCachedJavascript (relativeCachePath) {
  var cachePath = path.join(cacheDirectory, relativeCachePath)
  if (fs.isFileSync(cachePath)) {
    try {
      return fs.readFileSync(cachePath, 'utf8')
    } catch (error) {}
  }
  return null
}

function writeCachedJavascript (relativeCachePath, code) {
  var cacheTmpPath = path.join(cacheDirectory, relativeCachePath + '.' + process.pid)
  var cachePath = path.join(cacheDirectory, relativeCachePath)
  fs.writeFileSync(cacheTmpPath, code, 'utf8')
  fs.renameSync(cacheTmpPath, cachePath)
}

function addSourceURL (jsCode, filePath) {
  if (process.platform === 'win32') {
    filePath = '/' + path.resolve(filePath).replace(/\\/g, '/')
  }
  return jsCode + '\n' + '//# sourceURL=' + encodeURI(filePath) + '\n'
}

var INLINE_SOURCE_MAP_REGEXP = /\/\/[#@]\s*sourceMappingURL=([^'"\n]+)\s*$/mg

require('source-map-support').install({
  handleUncaughtExceptions: false,

  // Most of this logic is the same as the default implementation in the
  // source-map-support module, but we've overridden it to read the javascript
  // code from our cache directory.
  retrieveSourceMap: function (filePath) {
    if (!cacheDirectory || !fs.isFileSync(filePath)) {
      return null
    }

    try {
      var sourceCode = fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      console.warn('Error reading source file', error.stack)
      return null
    }

    var compiler = COMPILERS[path.extname(filePath)]

    try {
      var fileData = readCachedJavascript(compiler.getCachePath(sourceCode, filePath))
    } catch (error) {
      console.warn('Error reading compiled file', error.stack)
      return null
    }

    if (fileData == null) {
      return null
    }

    var match, lastMatch
    INLINE_SOURCE_MAP_REGEXP.lastIndex = 0
    while ((match = INLINE_SOURCE_MAP_REGEXP.exec(fileData))) {
      lastMatch = match
    }
    if (lastMatch == null) {
      return null
    }

    var sourceMappingURL = lastMatch[1]
    var rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1)

    try {
      var sourceMap = JSON.parse(new Buffer(rawData, 'base64'))
    } catch (error) {
      console.warn('Error parsing source map', error.stack)
      return null
    }

    return {
      map: sourceMap,
      url: null
    }
  }
})

var sourceMapPrepareStackTrace = Error.prepareStackTrace
var prepareStackTrace = sourceMapPrepareStackTrace

// Prevent coffee-script from reassigning Error.prepareStackTrace
Object.defineProperty(Error, 'prepareStackTrace', {
  get: function () { return prepareStackTrace },
  set: function (newValue) {}
})

// Enable Grim to access the raw stack without reassigning Error.prepareStackTrace
Error.prototype.getRawStack = function () { // eslint-disable-line no-extend-native
  prepareStackTrace = getRawStack
  var result = this.stack
  prepareStackTrace = sourceMapPrepareStackTrace
  return result
}

function getRawStack (_, stack) {
  return stack
}

Object.keys(COMPILERS).forEach(function (extension) {
  var compiler = COMPILERS[extension]

  Object.defineProperty(require.extensions, extension, {
    enumerable: true,
    writable: true,
    value: function (module, filePath) {
      var code = compileFileAtPath(compiler, filePath, extension)
      return module._compile(code, filePath)
    }
  })
})

exports.resetCacheStats()
