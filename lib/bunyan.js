/*
 * Copyright 2012 (c) Trent Mick. All rights reserved.
 */

var VERSION = "0.1.1";

// Bunyan log format version. This becomes the 'v' field on all log records.
// `0` is until I release a version "1.0.0" of node-bunyan. Thereafter,
// starting with `1`, this will be incremented if there is any backward
// incompatible change to the log record format. Details will be in
// "CHANGES.md" (the change log).
var LOG_VERSION = 0;


var xxx = function xxx(s) {     // internal dev/debug logging
  var args = ['XX' + 'X: '+s].concat(Array.prototype.slice.call(arguments, 1));
  console.error.apply(this, args);
};
var xxx = function xxx() {};  // uncomment to turn of debug logging


var os = require('os');
var fs = require('fs');
var util = require('util');



//---- Internal support stuff

function objCopy(obj) {
  var copy = {};
  Object.keys(obj).forEach(function (k) {
    copy[k] = obj[k];
  });
  return copy;
}

var format = util.format;
if (!format) {
  // If not node 0.6, then use its `util.format`:
  // <https://github.com/joyent/node/blob/master/lib/util.js#L22>:
  var inspect = util.inspect;
  var formatRegExp = /%[sdj%]/g;
  format = function format(f) {
    if (typeof f !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }
  
    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        case '%%': return '%';
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof x !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  };
}



//---- Levels

var TRACE = 1;
var DEBUG = 2;
var INFO = 3;
var WARN = 4;
var ERROR = 5;
var FATAL = 6;

var levelFromName = {
  'trace': TRACE,
  'debug': DEBUG,
  'info': INFO,
  'warn': WARN,
  'error': ERROR,
  'fatal': FATAL
};
var nameFromLevel = [undefined].concat(Object.keys(levelFromName));

function getLevel(nameOrNum) {
  return (typeof(nameOrNum) === 'string'
      ? levelFromName[nameOrNum]
      : nameOrNum);
}



//---- Logger class

/**
 * Create a Logger instance.
 *
 * @param options {Object} See documentation for full details. At minimum
 *    this must include a "service" string key.
 * @param _newCloneKeys {Array} Internal var. Should not be used externally.
 *    Array of new keys for this clone. This is necessary to assist with
 *    applying necessary serializers to the new keys.
 */
function Logger(options, _newCloneKeys) {
  xxx('Logger start:', options)
  if (! this instanceof Logger) {
    return new Logger(options);
  }
  
  var self = this;
  if (!options) {
    throw new TypeError('options (object) is required');
  }
  if (options.stream && options.streams) {
    throw new TypeError('can only have one of "stream" or "streams"');
  }
  if (_newCloneKeys && !Array.isArray(_newCloneKeys)) {
    throw new TypeError('_newCloneKeys (Array) is an internal var');
  }
  
  // These are the default fields for log records (minus the attributes
  // removed in this constructor). To allow storing raw log records
  // (unrendered), `this.fields` must never be mutated. Create a copy for
  // any changes.
  this.fields = objCopy(options);
  
  // Extract and setup the configuration options (the remaining ones are
  // log record fields).
  var lowestLevel = Number.POSITIVE_INFINITY;
  var level;
  if (options.level) {
    level = getLevel(options.level);
    if (! (TRACE <= level && level <= FATAL)) {
      throw new Error('invalid level: ' + options.level);
    }
    delete this.fields.level;
  } else {
    level = INFO;
  }

  this.streams = [];
  if (options.stream) {
    this.streams.push({
      type: "stream",
      stream: options.stream,
      closeOnExit: false,
      level: level
    });
    if (level < lowestLevel) {
      lowestLevel = level;
    }
    delete this.fields.stream;
  } else if (options.streams) {
    options.streams.forEach(function (s) {
      s = objCopy(s);

      // Implicit 'type' from other args.
      type = s.type;
      if (!s.type) {
        if (s.stream) {
          s.type = "stream";
        } else if (s.path) {
          s.type = "file"
        }
      }

      if (s.level) {
        s.level = getLevel(s.level);
      } else {
        s.level = level;
      } 
      if (s.level < lowestLevel) {
        lowestLevel = s.level;
      }

      switch (s.type) {
      case "stream":
        if (!s.closeOnExit) {
          s.closeOnExit = false;
        }
        break;
      case "file":
        if (!s.stream) {
          s.stream = fs.createWriteStream(s.path,
            {flags: 'a', encoding: 'utf8'});
          if (!s.closeOnExit) {
            s.closeOnExit = true;
          }
        } else {
          if (!s.closeOnExit) {
            s.closeOnExit = false;
          }
        }
        break;
      default:
        throw new TypeError('unknown stream type "' + s.type + '"');
      }

      self.streams.push(s);
    });
    delete this.fields.streams;
  } else {
    this.streams.push({
      type: "stream",
      stream: process.stdout,
      closeOnExit: false,
      level: level
    });
    if (level < lowestLevel) {
      lowestLevel = level;
    }
  }
  this.level = lowestLevel;
  
  delete this.fields.serializers;
  if (!options.serializers) {
    this.serializers = null;
  } else {
    this.serializers = {};
    Object.keys(options.serializers).forEach(function (field) {
      var serializer = options.serializers[field];
      if (typeof(serializer) !== "function") {
        throw new TypeError(format(
          'invalid serializer for "%s" field: must be a function', field));
      } else {
        self.serializers[field] = serializer;
      }
    });
  }
  
  xxx("Logger: ", self)
  
  // Apply serializers to initial fields.
  if (this.serializers) {
    if (_newCloneKeys && _newCloneKeys.length > 0) {
      // Note that this includes *config* vars send to `log.clone()` in
      // addition to log record *fields*, so the impl. needs to handle that.
      this._applySerializers(this.fields, _newCloneKeys);
    } else {
      this._applySerializers(this.fields);
    }
  }
  
  // Automatic fields.
  if (!this.fields.hostname) {
    this.fields.hostname = os.hostname();
  }
  
  //XXX Turn this on or ditch it.
  //process.on('exit', function () {
  //  self.streams.forEach(function (s) {
  //    if (s.closeOnExit) {
  //      xxx("closing stream s:", s);
  //      s.stream.end();
  //    }
  //  });
  //});
}


/**
 * Clone this logger to a new one, additionally adding the given config
 * options.
 *
 * This can be useful when passing a logger to a sub-component, e.g. a
 * "wuzzle" component of your service:
 *
 *    var wuzzleLog = log.clone({component: "wuzzle"})
 *    var wuzzle = new Wuzzle({..., log: wuzzleLog})
 *
 * Then log records from the wuzzle code will have the same structure as
 * the app log, *plus the component="wuzzle" field*.
 *
 * @param options {Object} Optional. Set of options to apply to the clone.
 *    Supports the same set of options as the constructor.
 */
Logger.prototype.clone = function (options) {
  var cloneOptions = objCopy(this.fields);
  cloneOptions.streams = this.streams;
  if (options) {
    var newCloneKeys = Object.keys(options);
    newCloneKeys.forEach(function(k) {
      cloneOptions[k] = options[k];
    });
  }
  return new Logger(cloneOptions, newCloneKeys);
}


/**
 * Apply registered serializers to the appropriate keys in the given fields.
 *
 * Pre-condition: This is only called if there is at least one serializer.
 *
 * @param fields (Object) The log record fields.
 * @param keys (Array) Optional array of keys to which to limit processing.
 */
Logger.prototype._applySerializers = function (fields, keys) {
  var self = this;

  // Mapping of keys to potentially serialize.
  var applyKeys = fields;
  if (keys) {
    applyKeys = {};
    for (var i=0; i < keys.length; i++) {
      applyKeys[keys[i]] = true;
    }
  }
  
  xxx('_applySerializers: applyKeys', applyKeys);
  
  // Check each serializer against these (presuming number of serializers
  // is typically less than number of fields).
  Object.keys(this.serializers).forEach(function (name) {
    if (applyKeys[name]) {
      xxx('_applySerializers; apply to "%s" key', name)
      try {
        fields[name] = self.serializers[name](fields[name]);
      } catch (err) {
        process.stderr.write(format('bunyan: ERROR: This should never happen. '
          + 'This is a bug in <https://github.com/trentm/node-bunyan> or '
          + 'in this application. Exception from "%s" Logger serializer: %s',
          name, err.stack || err));
        fields[name] = format('(Error in Bunyan log "%s" serializer '
          + 'broke field. See stderr for details.)', name);
      }
    }
  });
}


/**
 * A log record is a 4-tuple:
 *    [<default fields object>,
 *     <log record fields object>,
 *     <level integer>,
 *     <msg args array>]
 * For Perf reasons, we only render this down to a single object when
 * it is emitted.
 */
Logger.prototype._mkRecord = function (fields, level, msgArgs) {
  var recFields = (fields ? objCopy(fields) : null);
  return [this.fields, recFields, level, msgArgs];
}


/**
 * Emit a log record.
 *
 * @param rec {log record}
 */
Logger.prototype._emit = function (rec) {
  var obj = objCopy(rec[0]);
  var recFields = rec[1];
  if (recFields) {
    if (this.serializers) {
      this._applySerializers(recFields);
    }
    Object.keys(recFields).forEach(function (k) {
      obj[k] = recFields[k];
    });
  }
  var level = obj.level = rec[2];
  xxx("Record:", rec)
  obj.msg = format.apply(this, rec[3]);
  if (!obj.time) {
    obj.time = (new Date());
  }
  obj.v = LOG_VERSION;
  
  xxx('_emit: stringify this:', obj);
  var str = JSON.stringify(obj) + '\n';
  this.streams.forEach(function(s) {
    if (s.level <= level) {
      xxx('writing log rec "%s" to "%s" stream (%d <= %d)', obj.msg, s.type,
        s.level, level);
      s.stream.write(str);
    }
  });
}


/**
 * Log a record at TRACE level.
 *
 * Usages:
 *    log.trace()  -> boolean is-trace-enabled
 *    log.trace(<string> msg, ...)
 *    log.trace(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.trace = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.trace()`
    return (this.level <= TRACE);
  } else if (this.level > TRACE) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.trace(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.trace(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, TRACE, msgArgs);
  this._emit(rec);
}

/**
 * Log a record at DEBUG level.
 *
 * Usages:
 *    log.debug()  -> boolean is-debug-enabled
 *    log.debug(<string> msg, ...)
 *    log.debug(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.debug = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.debug()`
    return (this.level <= DEBUG);
  } else if (this.level > DEBUG) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.debug(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.debug(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, DEBUG, msgArgs);
  this._emit(rec);
}

/**
 * Log a record at INFO level.
 *
 * Usages:
 *    log.info()  -> boolean is-info-enabled
 *    log.info(<string> msg, ...)
 *    log.info(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.info = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.info()`
    return (this.level <= INFO);
  } else if (this.level > INFO) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.info(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.info(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, INFO, msgArgs);
  this._emit(rec);
}

/**
 * Log a record at WARN level.
 *
 * Usages:
 *    log.warn()  -> boolean is-warn-enabled
 *    log.warn(<string> msg, ...)
 *    log.warn(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.warn = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.warn()`
    return (this.level <= WARN);
  } else if (this.level > WARN) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.warn(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.warn(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, WARN, msgArgs);
  this._emit(rec);
}

/**
 * Log a record at ERROR level.
 *
 * Usages:
 *    log.error()  -> boolean is-error-enabled
 *    log.error(<string> msg, ...)
 *    log.error(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.error = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.error()`
    return (this.level <= ERROR);
  } else if (this.level > ERROR) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.error(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.error(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, ERROR, msgArgs);
  this._emit(rec);
}

/**
 * Log a record at FATAL level.
 *
 * Usages:
 *    log.fatal()  -> boolean is-fatal-enabled
 *    log.fatal(<string> msg, ...)
 *    log.fatal(<object> fields, <string> msg, ...)
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.fatal = function () {
  var fields = null, msgArgs = null;
  if (arguments.length === 0) {   // `log.fatal()`
    return (this.level <= FATAL);
  } else if (this.level > FATAL) {
    return;
  } else if (typeof arguments[0] === 'string') {  // `log.fatal(msg, ...)`
    fields = null;
    msgArgs = Array.prototype.slice.call(arguments);
  } else {  // `log.fatal(fields, msg, ...)`
    fields = arguments[0];
    msgArgs = Array.prototype.slice.call(arguments, 1);
  }
  var rec = this._mkRecord(fields, FATAL, msgArgs);
  this._emit(rec);
}



//---- Standard serializers
// A serializer is a function that serializes a JavaScript object to a
// JSON representation for logging. There is a standard set of presumed
// interesting objects in node.js-land.

Logger.stdSerializers = {};

// Serialize an HTTP request.
Logger.stdSerializers.req = function req(req) {
  // trailers? upgrade? httpVersion? complete? readable?
  // Limit headers?
  return {
    method: req.method,
    url: req.url,
    headers: req.headers
  }
};

// Serialize an HTTP response.
Logger.stdSerializers.res = function res(res) {
  // _headerSent?
  // Limit headers?
  return {
    statusCode: res.statusCode,
    _hasBody: res._hasBody,
    _header: res._header,
    _trailer: res._trailer,
    method: res.method,
  }
};





//---- Exports

module.exports = Logger;
module.exports.VERSION = VERSION;


