/*
 * Copyright (c) 2014 Trent Mick. All rights reserved.
 *
 * Test the `log.level(...)`.
 */

var util = require('util'),
    format = util.format,
    inspect = util.inspect;
var p = console.log;

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


// ---- test boolean `log.<level>()` calls

var log1 = bunyan.createLogger({
    name: 'log1',
    streams: [
        {
            path: __dirname + '/level.test.log1.log',
            level: 'info'
        }
    ]
});


test('log.level() -> level num', function (t) {
    t.equal(log1.level(), bunyan.INFO);
    t.end();
});

test('log.level(<const>)', function (t) {
    log1.level(bunyan.DEBUG);
    t.equal(log1.level(), bunyan.DEBUG);
    t.end();
});

test('log.level(<num>)', function (t) {
    log1.level(10);
    t.equal(log1.level(), bunyan.TRACE);
    t.end();
});

test('log.level(<name>)', function (t) {
    log1.level('error');
    t.equal(log1.level(), bunyan.ERROR);
    t.end();
});

// A trick to turn logging off.
// See <https://github.com/trentm/node-bunyan/pull/148#issuecomment-53232979>.
test('log.level(FATAL + 1)', function (t) {
    log1.level(bunyan.FATAL + 1);
    t.equal(log1.level(), bunyan.FATAL + 1);
    t.end();
});

test('log.level(<weird numbers>)', function (t) {
    log1.level(0);
    t.equal(log1.level(), 0);
    log1.level(Number.MAX_VALUE);
    t.equal(log1.level(), Number.MAX_VALUE);
    t.end();
});
