/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test `type: 'raw'` Logger streams.
 */

var format = require('util').format;
var Logger = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


function CapturingStream(recs) {
    this.recs = recs;
}
CapturingStream.prototype.write = function (rec) {
    this.recs.push(rec);
}


test('raw stream', function (t) {
    var recs = [];

    var log = new Logger({
        name: 'raw-stream-test',
        streams: [
            {
                stream: new CapturingStream(recs),
                type: 'raw'
            }
        ]
    });
    log.info('first');
    log.info({two: 'deux'}, 'second');

    t.equal(recs.length, 2);
    t.equal(typeof (recs[0]), 'object', 'first rec is an object');
    t.equal(recs[1].two, 'deux', '"two" field made it through');
    t.end();
});


test('raw streams and regular streams can mix', function (t) {
    var rawRecs = [];
    var nonRawRecs = [];

    var log = new Logger({
        name: 'raw-stream-test',
        streams: [
            {
                stream: new CapturingStream(rawRecs),
                type: 'raw'
            },
            {
                stream: new CapturingStream(nonRawRecs)
            }
        ]
    });
    log.info('first');
    log.info({two: 'deux'}, 'second');

    t.equal(rawRecs.length, 2);
    t.equal(typeof (rawRecs[0]), 'object', 'first rawRec is an object');
    t.equal(rawRecs[1].two, 'deux', '"two" field made it through');

    t.equal(nonRawRecs.length, 2);
    t.equal(typeof (nonRawRecs[0]), 'string', 'first nonRawRec is a string');

    t.end();
});


test('child adding a non-raw stream works', function (t) {
    var parentRawRecs = [];
    var rawRecs = [];
    var nonRawRecs = [];

    var logParent = new Logger({
        name: 'raw-stream-test',
        streams: [
            {
                stream: new CapturingStream(parentRawRecs),
                type: 'raw'
            }
        ]
    });
    var logChild = logParent.child({
        child: true,
        streams: [
            {
                stream: new CapturingStream(rawRecs),
                type: 'raw'
            },
            {
                stream: new CapturingStream(nonRawRecs)
            }
        ]
    });
    logParent.info('first');
    logChild.info({two: 'deux'}, 'second');

    t.equal(rawRecs.length, 1,
        format('rawRecs length should be 1 (is %d)', rawRecs.length));
    t.equal(typeof (rawRecs[0]), 'object', 'rawRec entry is an object');
    t.equal(rawRecs[0].two, 'deux', '"two" field made it through');

    t.equal(nonRawRecs.length, 1);
    t.equal(typeof (nonRawRecs[0]), 'string', 'first nonRawRec is a string');

    t.end();
});
