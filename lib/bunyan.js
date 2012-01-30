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
  
  // These are the default fields for log records (minus the attributes
  // removed in this constructor). To allow storing raw log records
  // (unrendered), `this.fields` must never be mutated. Create a copy, if
  // necessary.
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
  paul('Logger default fields:', this.fields);
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
 * Usages:
 *    log.info(<object> fields, <string> msg, ...)
 *    log.info(<string> msg, ...)
 *    log.info()  -> boolean is-info-enabled
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

module.exports = Logger;


