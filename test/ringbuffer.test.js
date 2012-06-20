/*
 * Test the RingBuffer output stream.
 */

var test = require('tap').test;
var Logger = require('../lib/bunyan');
var ringbuffer = new Logger.RingBuffer({ 'limit': 5 });

var log1 = new Logger({
  name: 'log1',
  streams: [
    {
      stream: ringbuffer,
      raw: true,
      level: 'info'
    }
  ]
});

test('ringbuffer', function (t) {
  log1.info('hello');
  log1.trace('there');
  log1.error('android');
  t.equal(ringbuffer.entries.length, 2);
  t.equal(ringbuffer.entries[0]['msg'], 'hello');
  t.equal(ringbuffer.entries[1]['msg'], 'android');
  log1.error('one');
  log1.error('two');
  log1.error('three');
  t.equal(ringbuffer.entries.length, 5);
  log1.error('four');
  t.equal(ringbuffer.entries.length, 5);
  t.equal(ringbuffer.entries[0]['msg'], 'android');
  t.equal(ringbuffer.entries[1]['msg'], 'one');
  t.equal(ringbuffer.entries[2]['msg'], 'two');
  t.equal(ringbuffer.entries[3]['msg'], 'three');
  t.equal(ringbuffer.entries[4]['msg'], 'four');
  t.end();
});
