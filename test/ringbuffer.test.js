/*
 * Test the RingBuffer output stream.
 */

var Logger = require('../lib/bunyan');
var ringbuffer = new Logger.RingBuffer({ 'limit': 5 });

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


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
    t.equal(ringbuffer.size(), 2);
    t.equal(ringbuffer.get(0).msg, 'hello');
    t.equal(ringbuffer.get(1).msg, 'android');
    t.equal(ringbuffer.getLatest(0).msg, 'android');
    t.equal(ringbuffer.getLatest(1).msg, 'hello');
    log1.error('one');
    log1.error('two');
    log1.error('three');
    t.equal(ringbuffer.size(), 5);
    log1.error('four');
    t.equal(ringbuffer.size(), 5);
    t.equal(ringbuffer.get(0).msg, 'android');
    t.equal(ringbuffer.get(1).msg, 'one');
    t.equal(ringbuffer.get(2).msg, 'two');
    t.equal(ringbuffer.get(3).msg, 'three');
    t.equal(ringbuffer.get(4).msg, 'four');
    t.equal(ringbuffer.getLatest(0).msg, 'four');
    t.equal(ringbuffer.getLatest(1).msg, 'three');
    t.equal(ringbuffer.getLatest(2).msg, 'two');
    t.equal(ringbuffer.getLatest(3).msg, 'one');
    t.equal(ringbuffer.getLatest(4).msg, 'android');
    t.end();
});
