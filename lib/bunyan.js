/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * The bunyan logging library for node.js.
 */

var VERSION = '0.14.6';

// Bunyan log format version. This becomes the 'v' field on all log records.
// `0` is until I release a version '1.0.0' of node-bunyan. Thereafter,
// starting with `1`, this will be incremented if there is any backward
// incompatible change to the log record format. Details will be in
// 'CHANGES.md' (the change log).
var LOG_VERSION = 0;


var xxx = function xxx(s) {     // internal dev/debug logging
  var args = ['XX' + 'X: '+s].concat(Array.prototype.slice.call(arguments, 1));
  console.error.apply(this, args);
};
var xxx = function xxx() {};  // uncomment to turn of debug logging


var os = require('os');
var fs = require('fs');
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;



//---- Internal support stuff

function objCopy(obj) {
  if (obj === null) {
    return null;
  } else if (Array.isArray(obj)) {
    return obj.slice();
  } else {
    var copy = {};
    Object.keys(obj).forEach(function (k) {
      copy[k] = obj[k];
    });
    return copy;
  }
}

var format = util.format;
if (!format) {
  // If not node 0.6, then use its `util.format`:
  // <https://github.com/joyent/node/blob/master/lib/util.js#L22>:
  var inspect = util.inspect;
  var formatRegExp = /%[sdj%]/g;
  format = function format(f) {
    if (typeof (f) !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (i >= len)
        return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++], safeCycles());
        case '%%': return '%';
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof (x) !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  };
}


/**
 * Gather some caller info 3 stack levels up.
 * See <http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi>.
 */
function getCaller3Info() {
  var obj = {};
  var saveLimit = Error.stackTraceLimit;
  var savePrepare = Error.prepareStackTrace;
  Error.stackTraceLimit = 3;
  Error.captureStackTrace(this, getCaller3Info);
  Error.prepareStackTrace = function (_, stack) {
    var caller = stack[2];
    obj.file = caller.getFileName();
    obj.line = caller.getLineNumber();
    var func = caller.getFunctionName();
    if (func)
      obj.func = func;
  };
  this.stack;
  Error.stackTraceLimit = saveLimit;
  Error.prepareStackTrace = savePrepare;
  return obj;
}


/**
 * Warn about an bunyan processing error.
 *
 * If file/line are given, this makes an attempt to warn on stderr only once.
 *
 * @param msg {String} Message with which to warn.
 * @param file {String} Optional. File path relevant for the warning.
 * @param line {String} Optional. Line number in `file` path relevant for
 *    the warning.
 */
function _warn(msg, file, line) {
  assert.ok(msg);
  var key;
  if (file && line) {
    key = file + ':' + line;
    if (_warned[key]) {
      return;
    }
    _warned[key] = true;
  }
  process.stderr.write(msg + '\n');
}
var _warned = {};



//---- Levels

var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;

var levelFromName = {
  'trace': TRACE,
  'debug': DEBUG,
  'info': INFO,
  'warn': WARN,
  'error': ERROR,
  'fatal': FATAL
};


/**
 * Resolve a level number, name (upper or lowercase) to a level number value.
 *
 * @api public
 */
function resolveLevel(nameOrNum) {
  var level = (typeof (nameOrNum) === 'string'
      ? levelFromName[nameOrNum.toLowerCase()]
      : nameOrNum);
  if (! (TRACE <= level && level <= FATAL)) {
    throw new Error('invalid level: ' + nameOrNum);
  }
  return level;
}



//---- Logger class

/**
 * Create a Logger instance.
 *
 * @param options {Object} See documentation for full details. At minimum
 *    this must include a 'name' string key. Configuration keys:
 *      - `streams`: specify the logger output streams. This is an array of
 *        objects with these fields:
 *          - `type`: The stream type. See README.md for full details.
 *            Often this is implied by the other fields. Examples are
 *            "file", "stream" and "raw".
 *          - `level`: Defaults to "info".
 *          - `path` or `stream`: The specify the file path or writeable
 *            stream to which log records are written. E.g.
 *            `stream: process.stdout`.
 *          - `closeOnExit` (boolean): Optional. Default is true for a
 *            "file" stream when `path` is given, false otherwise.
 *        See README.md for full details.
 *      - `level`: set the level for a single output stream (cannot be used
 *        with `streams`)
 *      - `stream`: the output stream for a logger with just one, e.g.
 *        `process.stdout` (cannot be used with `streams`)
 *      - `serializers`: object mapping log record field names to
 *        serializing functions. See README.md for details.
 *      - `src`: Boolean (default false). Set true to enable 'src' automatic
 *        field with log call source info.
 *    All other keys are log record fields.
 *
 * An alternative *internal* call signature is used for creating a child:
 *    new Logger(<parent logger>, <child options>[, <child opts are simple>]);
 *
 * @param _childSimple (Boolean) An assertion that the given `_childOptions`
 *    (a) only add fields (no config) and (b) no serialization handling is
 *    required for them. IOW, this is a fast path for frequent child
 *    creation.
 */
function Logger(options, _childOptions, _childSimple) {
  xxx('Logger start:', options)
  if (! this instanceof Logger) {
    return new Logger(options, _childOptions);
  }

  // Input arg validation.
  var parent;
  if (_childOptions !== undefined) {
    parent = options;
    options = _childOptions;
    if (! parent instanceof Logger) {
      throw new TypeError('invalid Logger creation: do not pass a second arg');
    }
  }
  if (!options) {
    throw new TypeError('options (object) is required');
  }
  if (!parent) {
    if (!options.name) {
      throw new TypeError('options.name (string) is required');
    }
  } else {
    if (options.name) {
      throw new TypeError('invalid options.name: child cannot set logger name');
    }
  }
  if (options.stream && options.streams) {
    throw new TypeError('cannot mix "streams" and "stream" options');
  }
  if (options.streams && !Array.isArray(options.streams)) {
    throw new TypeError('invalid options.streams: must be an array')
  }
  if (options.serializers && (typeof (options.serializers) !== 'object' ||
      Array.isArray(options.serializers))) {
    throw new TypeError('invalid options.serializers: must be an object')
  }

  EventEmitter.call(this);

  // Fast path for simple child creation.
  if (parent && _childSimple) {
    // `_isSimpleChild` is a signal to stream close handling that this child
    // owns none of its streams.
    this._isSimpleChild = true;

    this._level = parent._level;
    this.streams = parent.streams;
    this.serializers = parent.serializers;
    this.src = parent.src;
    var fields = this.fields = {};
    var parentFieldNames = Object.keys(parent.fields);
    for (var i = 0; i < parentFieldNames.length; i++) {
      var name = parentFieldNames[i];
      fields[name] = parent.fields[name];
    }
    var names = Object.keys(options);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      fields[name] = options[name];
    }
    return;
  }

  // Null values.
  var self = this;
  if (parent) {
    this._level = parent._level;
    this.streams = [];
    for (var i = 0; i < parent.streams.length; i++) {
      var s = objCopy(parent.streams[i]);
      s.closeOnExit = false; // Don't own parent stream.
      this.streams.push(s);
    }
    this.serializers = objCopy(parent.serializers);
    this.src = parent.src;
    this.fields = objCopy(parent.fields);
    if (options.level) {
      this.level(options.level);
    }
  } else {
    this._level = Number.POSITIVE_INFINITY;
    this.streams = [];
    this.serializers = null;
    this.src = false;
    this.fields = {};
  }

  // Helpers
  function addStream(s) {
    s = objCopy(s);

    // Implicit 'type' from other args.
    var type = s.type;
    if (!s.type) {
      if (s.stream) {
        s.type = 'stream';
      } else if (s.path) {
        s.type = 'file'
      }
    }
    s.raw = (s.type === 'raw');  // PERF: Allow for faster check in `_emit`.

    if (s.level) {
      s.level = resolveLevel(s.level);
    } else if (options.level) {
      s.level = resolveLevel(options.level);
    } else {
      s.level = INFO;
    }
    if (s.level < self._level) {
      self._level = s.level;
    }

    switch (s.type) {
    case 'stream':
      if (!s.closeOnExit) {
        s.closeOnExit = false;
      }
      break;
    case 'file':
      if (!s.stream) {
        s.stream = fs.createWriteStream(s.path,
          {flags: 'a', encoding: 'utf8'});
        s.stream.on('error', function (err) {
          self.emit('error', err, s);
        });
        if (!s.closeOnExit) {
          s.closeOnExit = true;
        }
      } else {
        if (!s.closeOnExit) {
          s.closeOnExit = false;
        }
      }
      break;
    case 'raw':
      if (!s.closeOnExit) {
        s.closeOnExit = false;
      }
      break;
    default:
      throw new TypeError('unknown stream type "' + s.type + '"');
    }

    self.streams.push(s);
  }

  function addSerializers(serializers) {
    if (!self.serializers) {
      self.serializers = {};
    }
    Object.keys(serializers).forEach(function (field) {
      var serializer = serializers[field];
      if (typeof (serializer) !== 'function') {
        throw new TypeError(format(
          'invalid serializer for "%s" field: must be a function', field));
      } else {
        self.serializers[field] = serializer;
      }
    });
  }

  // Handle *config* options (i.e. options that are not just plain data
  // for log records).
  if (options.stream) {
    addStream({
      type: 'stream',
      stream: options.stream,
      closeOnExit: false,
      level: (options.level ? resolveLevel(options.level) : INFO)
    });
  } else if (options.streams) {
    options.streams.forEach(addStream);
  } else if (parent && options.level) {
    this.level(options.level);
  } else if (!parent) {
    addStream({
      type: 'stream',
      stream: process.stdout,
      closeOnExit: false,
      level: (options.level ? resolveLevel(options.level) : INFO)
    });
  }
  if (options.serializers) {
    addSerializers(options.serializers);
  }
  if (options.src) {
    this.src = true;
  }
  xxx('Logger: ', self)

  // Fields.
  // These are the default fields for log records (minus the attributes
  // removed in this constructor). To allow storing raw log records
  // (unrendered), `this.fields` must never be mutated. Create a copy for
  // any changes.
  var fields = objCopy(options);
  delete fields.stream;
  delete fields.level;
  delete fields.streams;
  delete fields.serializers;
  delete fields.src;
  if (this.serializers) {
    this._applySerializers(fields);
  }
  if (!fields.hostname) {
    fields.hostname = os.hostname();
  }
  if (!fields.pid) {
    fields.pid = process.pid;
  }
  Object.keys(fields).forEach(function (k) {
    self.fields[k] = fields[k];
  });
}

util.inherits(Logger, EventEmitter);


/**
 * Create a child logger, typically to add a few log record fields.
 *
 * This can be useful when passing a logger to a sub-component, e.g. a
 * 'wuzzle' component of your service:
 *
 *    var wuzzleLog = log.child({component: 'wuzzle'})
 *    var wuzzle = new Wuzzle({..., log: wuzzleLog})
 *
 * Then log records from the wuzzle code will have the same structure as
 * the app log, *plus the component='wuzzle' field*.
 *
 * @param options {Object} Optional. Set of options to apply to the child.
 *    All of the same options for a new Logger apply here. Notes:
 *      - The parent's streams are inherited and cannot be removed in this
 *        call. Any given `streams` are *added* to the set inherited from
 *        the parent.
 *      - The parent's serializers are inherited, though can effectively be
 *        overwritten by using duplicate keys.
 *      - Can use `level` to set the level of the streams inherited from
 *        the parent. The level for the parent is NOT affected.
 * @param simple {Boolean} Optional. Set to true to assert that `options`
 *    (a) only add fields (no config) and (b) no serialization handling is
 *    required for them. IOW, this is a fast path for frequent child
 *    creation. See 'tools/timechild.js' for numbers.
 */
Logger.prototype.child = function (options, simple) {
  return new Logger(this, options || {}, simple);
}


/* BEGIN JSSTYLED */
/**
 * Close this logger.
 *
 * This closes streams (that it owns, as per 'endOnClose' attributes on
 * streams), etc. Typically you **don't** need to bother calling this.
Logger.prototype.close = function () {
  if (this._closed) {
    return;
  }
  if (!this._isSimpleChild) {
    self.streams.forEach(function (s) {
      if (s.endOnClose) {
        xxx('closing stream s:', s);
        s.stream.end();
        s.endOnClose = false;
      }
    });
  }
  this._closed = true;
}
 */
/* END JSSTYLED */


/**
 * Get/set the level of all streams on this logger.
 *
 * Get Usage:
 *    // Returns the current log level (lowest level of all its streams).
 *    log.level() -> INFO
 *
 * Set Usage:
 *    log.level(INFO)       // set all streams to level INFO
 *    log.level('info')     // can use 'info' et al aliases
 */
Logger.prototype.level = function level(value) {
  if (value === undefined) {
    return this._level;
  }
  var newLevel = resolveLevel(value);
  var len = this.streams.length;
  for (var i = 0; i < len; i++) {
    this.streams[i].level = newLevel;
  }
  this._level = newLevel;
}


/**
 * Get/set the level of a particular stream on this logger.
 *
 * Get Usage:
 *    // Returns an array of the levels of each stream.
 *    log.levels() -> [TRACE, INFO]
 *
 *    // Returns a level of the identified stream.
 *    log.levels(0) -> TRACE      // level of stream at index 0
 *    log.levels('foo')           // level of stream with name 'foo'
 *
 * Set Usage:
 *    log.levels(0, INFO)         // set level of stream 0 to INFO
 *    log.levels(0, 'info')       // can use 'info' et al aliases
 *    log.levels('foo', WARN)     // set stream named 'foo' to WARN
 *
 * Stream names: When streams are defined, they can optionally be given
 * a name. For example,
 *       log = new Logger({
 *         streams: [
 *           {
 *             name: 'foo',
 *             path: '/var/log/my-service/foo.log'
 *             level: 'trace'
 *           },
 *         ...
 *
 * @param name {String|Number} The stream index or name.
 * @param value {Number|String} The level value (INFO) or alias ('info').
 *    If not given, this is a 'get' operation.
 * @throws {Error} If there is no stream with the given name.
 */
Logger.prototype.levels = function levels(name, value) {
  if (name === undefined) {
    assert.equal(value, undefined);
    return this.streams.map(
      function (s) { return s.level });
  }
  var stream;
  if (typeof (name) === 'number') {
    stream = this.streams[name];
    if (stream === undefined) {
      throw new Error('invalid stream index: ' + name);
    }
  } else {
    var len = this.streams.length;
    for (var i = 0; i < len; i++) {
      var s = this.streams[i];
      if (s.name === name) {
        stream = s;
        break;
      }
    }
    if (!stream) {
      throw new Error(format('no stream with name "%s"', name));
    }
  }
  if (value === undefined) {
    return stream.level;
  } else {
    var newLevel = resolveLevel(value);
    stream.level = newLevel;
    if (newLevel < this._level) {
      this._level = newLevel;
    }
  }
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
    for (var i = 0; i < keys.length; i++) {
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
        _warn(format('bunyan: ERROR: This should never happen. '
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
  var i;

  var obj = objCopy(rec[0]);
  var level = obj.level = rec[2];
  var recFields = rec[1];
  if (recFields) {
    if (this.serializers) {
      this._applySerializers(recFields);
    }
    Object.keys(recFields).forEach(function (k) {
      obj[k] = recFields[k];
    });
  }
  xxx('Record:', rec)
  obj.msg = format.apply(this, rec[3]);
  if (!obj.time) {
    obj.time = (new Date());
  }
  // Get call source info
  if (this.src && !obj.src) {
    obj.src = getCaller3Info()
  }
  obj.v = LOG_VERSION;

  // Lazily determine if this Logger has non-"raw" streams. If there are
  // any, then we need to stringify the log record.
  if (this.haveNonRawStreams === undefined) {
    this.haveNonRawStreams = false;
    for (i = 0; i < this.streams.length; i++) {
      if (!this.streams[i].raw) {
        this.haveNonRawStreams = true;
        break;
      }
    }
  }

  // Stringify the object. Attempt to warn/recover on error.
  var str;
  if (this.haveNonRawStreams) {
    str = JSON.stringify(obj, safeCycles()) + '\n';
  }

  for (i = 0; i < this.streams.length; i++) {
    var s = this.streams[i];
    if (s.level <= level) {
      xxx('writing log rec "%s" to "%s" stream (%d <= %d): %j',
        obj.msg, s.type, s.level, level, obj);
      s.stream.write(s.raw ? obj : str);
    }
  };
}


/**
 * Build a log emitter function for level minLevel. I.e. this is the
 * creator of `log.info`, `log.error`, etc.
 */
function mkLogEmitter(minLevel) {
  return function () {
    var fields = null, msgArgs = null;
    if (arguments.length === 0) {   // `log.<level>()`
      return (this._level <= minLevel);
    } else if (this._level > minLevel) {
      return;
    } else if (arguments[0] instanceof Error) {
      // `log.<level>(err, ...)`
      fields = {err: errSerializer(arguments[0])};
      if (arguments.length === 1) {
        msgArgs = [fields.err.message];
      } else {
        msgArgs = Array.prototype.slice.call(arguments, 1);
      }
    } else if (typeof (arguments[0]) === 'string') {  // `log.<level>(msg, ...)`
      fields = null;
      msgArgs = Array.prototype.slice.call(arguments);
    } else if (Buffer.isBuffer(arguments[0])) {  // `log.<level>(buf, ...)`
      // Almost certainly an error, show `inspect(buf)`. See bunyan issue #35.
      fields = null;
      msgArgs = Array.prototype.slice.call(arguments);
      msgArgs[0] = util.inspect(msgArgs[0]);
    } else {  // `log.<level>(fields, msg, ...)`
      fields = arguments[0];
      msgArgs = Array.prototype.slice.call(arguments, 1);
    }
    var rec = this._mkRecord(fields, minLevel, msgArgs);
    this._emit(rec);
  }
}


/**
 * The functions below log a record at a specific level.
 *
 * Usages:
 *    log.<level>()  -> boolean is-trace-enabled
 *    log.<level>(<Error> err, [<string> msg, ...])
 *    log.<level>(<string> msg, ...)
 *    log.<level>(<object> fields, <string> msg, ...)
 *
 * where <level> is the lowercase version of the log level. E.g.:
 *
 *    log.info()
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.trace = mkLogEmitter(TRACE);
Logger.prototype.debug = mkLogEmitter(DEBUG);
Logger.prototype.info = mkLogEmitter(INFO);
Logger.prototype.warn = mkLogEmitter(WARN);
Logger.prototype.error = mkLogEmitter(ERROR);
Logger.prototype.fatal = mkLogEmitter(FATAL);



//---- Standard serializers
// A serializer is a function that serializes a JavaScript object to a
// JSON representation for logging. There is a standard set of presumed
// interesting objects in node.js-land.

Logger.stdSerializers = {};

// Serialize an HTTP request.
Logger.stdSerializers.req = function req(req) {
  if (!req || !req.connection)
    return req;
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    remoteAddress: req.connection.remoteAddress,
    remotePort: req.connection.remotePort
  };
  // Trailers: Skipping for speed. If you need trailers in your app, then
  // make a custom serializer.
  //if (Object.keys(trailers).length > 0) {
  //  obj.trailers = req.trailers;
  //}
};

// Serialize an HTTP response.
Logger.stdSerializers.res = function res(res) {
  if (!res || !res.statusCode)
    return res;
  return {
    statusCode: res.statusCode,
    header: res._header
  }
};


/*
 * This function dumps long stack traces for exceptions having a cause()
 * method. The error classes from
 * [verror](https://github.com/davepacheco/node-verror) and
 * [restify v2.0](https://github.com/mcavage/node-restify) are examples.
 *
 * Based on `dumpException` in
 * https://github.com/davepacheco/node-extsprintf/blob/master/lib/extsprintf.js
 */
function getFullErrorStack(ex)
{
  var ret = ex.stack || ex.toString();
  if (ex.cause && typeof(ex.cause) === 'function') {
    var cex = ex.cause();
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex);
    }
  }
  return (ret);
}

// Serialize an Error object
// (Core error properties are enumerable in node 0.4, not in 0.6).
var errSerializer = Logger.stdSerializers.err = function err(err) {
  if (!err || !err.stack)
    return err;
  var obj = {
    message: err.message,
    name: err.name,
    stack: getFullErrorStack(err)
  }
  Object.keys(err).forEach(function (k) {
    if (err[k] !== undefined) {
      obj[k] = err[k];
    }
  });
  return obj;
};


// A JSON stringifier that handles cycles safely.
// Usage: JSON.stringify(obj, safeCycles())
function safeCycles() {
  var seen = [];
  return function(key, val) {
    if (!val || typeof val !== 'object') {
      return val;
    }
    if (seen.indexOf(val) !== -1) {
      return '[Circular]';
    }
    seen.push(val);
    return val;
  };
}

/**
 * RingBuffer is a Writable Stream that just stores the last N records in
 * memory.
 *
 * @param options {Object}, with the following fields:
 *
 *    - limit: number of records to keep in memory
 */
function RingBuffer(options) {
  this.limit = options && options.limit ? options.limit : 100;
  this.writable = true;
  this.records = [];
  EventEmitter.call(this);
}

util.inherits(RingBuffer, EventEmitter);

RingBuffer.prototype.write = function (record) {
  if (!this.writable)
    throw (new Error('RingBuffer has been ended already'));

  this.records.push(record);

  if (this.records.length > this.limit)
    this.records.shift();

  return (true);
};

RingBuffer.prototype.end = function () {
  if (arguments.length > 0)
    this.write.apply(this, Array.prototype.slice.call(arguments));
  this.writable = false;
};

RingBuffer.prototype.destroy = function () {
  this.writable = false;
  this.emit('close');
};

RingBuffer.prototype.destroySoon = function () {
  this.destroy();
};


//---- Exports

module.exports = Logger;

module.exports.TRACE = TRACE;
module.exports.DEBUG = DEBUG;
module.exports.INFO = INFO;
module.exports.WARN = WARN;
module.exports.ERROR = ERROR;
module.exports.FATAL = FATAL;
module.exports.resolveLevel = resolveLevel;

module.exports.VERSION = VERSION;
module.exports.LOG_VERSION = LOG_VERSION;

module.exports.createLogger = function createLogger(options) {
  return new Logger(options);
};

module.exports.RingBuffer = RingBuffer;

// Useful for custom `type == "raw"` streams that may do JSON stringification
// of log records themselves. Usage:
//    var str = JSON.stringify(rec, bunyan.safeCycles());
module.exports.safeCycles = safeCycles;
