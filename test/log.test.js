/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test the `log.trace(...)`, `log.debug(...)`, ..., `log.fatal(...)` API.
 */

var test = require('tap').test;
var Logger = require('../lib/bunyan');

var log1 = new Logger({
  name: 'log1',
  streams: [
    {
      path: __dirname + '/log.test.log1.log',
      level: 'info'
    }
  ]
});

var log2 = new Logger({
  name: 'log2',
  streams: [
    {
      path: __dirname + '/log.test.log2a.log',
      level: 'error'
    },
    {
      path: __dirname + '/log.test.log2b.log',
      level: 'debug'
    }
  ]
})

test('log.LEVEL() -> boolean', function (t) {
  t.equal(log1.trace(), false)
  t.equal(log1.debug(), false)
  t.equal(log1.info(), true)
  t.equal(log1.warn(), true)
  t.equal(log1.error(), true)
  t.equal(log1.fatal(), true)

  // Level is the *lowest* level of all streams.
  t.equal(log2.trace(), false)
  t.equal(log2.debug(), true)
  t.equal(log2.info(), true)
  t.equal(log2.warn(), true)
  t.equal(log2.error(), true)
  t.equal(log2.fatal(), true)
  t.end();
});

//TODO:
// - rest of api
