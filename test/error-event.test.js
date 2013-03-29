/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test emission and handling of 'error' event in a logger with a 'path'
 * stream.
 */

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


test('error event on log write', function (t) {
    LOG_PATH = '/this/path/is/bogus.log'
    var log = bunyan.createLogger(
        {name: 'error-event', streams: [ {path: LOG_PATH} ]});
    log.on('error', function (err, stream) {
        t.ok(err, 'got err in error event: ' + err);
        t.equal(err.code, 'ENOENT', 'error code is ENOENT');
        t.ok(stream, 'got a stream argument');
        t.equal(stream.path, LOG_PATH);
        t.equal(stream.type, 'file');
        t.end();
    });
    log.info('info log message');
});
