/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 * Copyright (c) 2012 Joyent Inc. All rights reserved.
 *
 * Bunyan logging levels (and support stuff).
 *
 * vim: expandtab:ts=4:sw=4
 */


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

var nameFromLevel = {};
var upperNameFromLevel = {};
var upperPaddedNameFromLevel = {};
Object.keys(levelFromName).forEach(function (name) {
  var lvl = levelFromName[name];
  nameFromLevel[lvl] = name;
  upperNameFromLevel[lvl] = name.toUpperCase();
  upperPaddedNameFromLevel[lvl] = (
    name.length === 4 ? ' ' : '') + name.toUpperCase();
});


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



//---- Exports

module.exports = {
    TRACE: TRACE,
    DEBUG: DEBUG,
    INFO:  INFO,
    WARN:  WARN,
    ERROR: ERROR,
    FATAL: FATAL,

    nameFromLevel: nameFromLevel,
    upperNameFromLevel: upperNameFromLevel,
    upperPaddedNameFromLevel: upperPaddedNameFromLevel,

    resolveLevel: resolveLevel
}
