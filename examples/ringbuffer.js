/* Create a ring buffer that stores the last 100 entries. */
var bunyan = require('..');
var ringbuffer = new bunyan.RingBuffer({ limit: 100 });
var log = new bunyan({
    name: 'foo',
    raw: true,
    stream: ringbuffer,
    level: 'debug'
});

log.info('hello world');
console.log(ringbuffer.entries);
