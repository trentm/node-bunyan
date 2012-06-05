/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test emission and handling of 'error' event in a logger with a 'path'
 * stream.
 */

var test = require('tap').test;
var Logger = require('../lib/bunyan');

test('error event on log write', function (t) {
  LOG_PATH = '/this/path/is/bogus.log'
  var log = new Logger({name: 'error-event', streams: [{path: LOG_PATH}]});
  t.plan(5);
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
