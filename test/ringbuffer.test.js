/*
 * Test the RingBuffer output stream.
 */

var Logger = require('../lib/bunyan');
var ringbuffer = new Logger.RingBuffer({ 'limit': 5 });

// node-tap API
//var test = require('tap').test;
if (require.cache[__dirname + '/helper.js'])
    delete require.cache[__dirname + '/helper.js'];
var helper = require('./helper.js');
var after = helper.after;
var before = helper.before;
var test = helper.test;



var log1 = new Logger({
  name: 'log1',
  streams: [
    {
      stream: ringbuffer,
      type: 'raw',
      level: 'info'
    }
  ]
});

test('ringbuffer', function (t) {
  log1.info('hello');
  log1.trace('there');
  log1.error('android');
  t.equal(ringbuffer.records.length, 2);
  t.equal(ringbuffer.records[0]['msg'], 'hello');
  t.equal(ringbuffer.records[1]['msg'], 'android');
  log1.error('one');
  log1.error('two');
  log1.error('three');
  t.equal(ringbuffer.records.length, 5);
  log1.error('four');
  t.equal(ringbuffer.records.length, 5);
  t.equal(ringbuffer.records[0]['msg'], 'android');
  t.equal(ringbuffer.records[1]['msg'], 'one');
  t.equal(ringbuffer.records[2]['msg'], 'two');
  t.equal(ringbuffer.records[3]['msg'], 'three');
  t.equal(ringbuffer.records[4]['msg'], 'four');
  t.end();
});
