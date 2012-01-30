/*
 * Copyright 2012 (c) Trent Mick. All rights reserved.
 */

// Bunyan log format version. This becomes the 'v' field on all log records.
// `0` is until I release a version "1.0.0" of node-bunyan. Thereafter,
// starting with `1`, this will be incremented if there is any backward
// incompatible change to the log record format. Details will be in
// "CHANGES.md" (the change log).
var VERSION = 0;


var paul = function paul(s) {     // internal dev/debug logging
  var args = ["PAUL: "+s].concat(Array.prototype.slice.call(arguments, 1));
  console.error.apply(this, args);
};
var paul = function paul() {};  // uncomment to turn of debug logging


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

var DEBUG = 1;
var INFO = 2;
var WARN = 3;
var ERROR = 4;
var FATAL = 5;

var levelFromName = {
  'debug': DEBUG,
  'info': INFO,
  'warn': WARN,
  'error': ERROR,
  'fatal': FATAL
};
var nameFromLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};


//---- Logger class

function Logger(options) {
  paul('Logger start:', options)
  if (! this instanceof Logger) {
    return new Logger(options);
  }
  if (!options) {
    throw new TypeError("options (object) is required");
  }
  
  // These are the default fields for log records (minus the attributes
  // removed in this constructor). To allow storing raw log records
  // (unrendered), `this.fields` must never be mutated. Create a copy for
  // any changes.
  this.fields = objCopy(options);
  
  if (options.stream) {
    this.stream = options.stream;
    delete this.fields.stream;
  } else {
    this.stream = process.stdout;
  }
  if (options.level) {
    this.level = (typeof(options.level) === 'string'
      ? levelFromName[options.level]
      : options.level);
    if (! (DEBUG <= this.level && this.level <= FATAL)) {
      throw new Error('invalid level: ' + options.level);
    }
    delete this.fields.level;
  } else {
    this.level = 2; // INFO is default level.
  }
  
  //XXX Non-core fields should go in 'x' sub-object.
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
  paul("keys", Object.keys(this))
  var cloneOptions = objCopy(this.fields);
  cloneOptions.level = this.level;
  cloneOptions.stream = this.stream;
  if (options) {
    Object.keys(options).forEach(function(k) {
      cloneOptions[k] = options[k];
    });
  }
  return new Logger(cloneOptions);
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
    Object.keys(recFields).forEach(function (k) {
      obj[k] = recFields[k];
    });
  }
  obj.level = rec[2];
  paul("Record:", rec)
  obj.msg = format.apply(this, rec[3]);
  obj.v = VERSION;
  this.stream.write(JSON.stringify(obj) + '\n');
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


module.exports = Logger;


