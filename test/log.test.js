/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test the `log.trace(...)`, `log.debug(...)`, ..., `log.fatal(...)` API.
 */

var bunyan = require('../lib/bunyan');

// node-tap API
//var test = require('tap').test;
if (require.cache[__dirname + '/helper.js'])
    delete require.cache[__dirname + '/helper.js'];
var helper = require('./helper.js');
var after = helper.after;
var before = helper.before;
var test = helper.test;



var log1 = bunyan.createLogger({
  name: 'log1',
  streams: [
    {
      path: __dirname + '/log.test.log1.log',
      level: 'info'
    }
  ]
});

var log2 = bunyan.createLogger({
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
  t.equal(log1.trace(), false, 'log1.trace() is false')
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
