/* Create a ring buffer that stores the last 100 records. */
var bunyan = require('..');
var ringbuffer = new bunyan.RingBuffer({ limit: 100 });
var log = new bunyan({
    name: 'foo',
    streams: [{
        type: 'raw',
        stream: ringbuffer,
        level: 'debug'
    }]
});

log.info('hello world');
console.log(ringbuffer.records);
