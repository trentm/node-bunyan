/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test some `<Logger>.child(...)` behaviour.
 */

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;



function CapturingStream(recs) {
    this.recs = recs || [];
}
CapturingStream.prototype.write = function (rec) {
    this.recs.push(rec);
}

test('child inherits parent serializers', function (t) {
    var stream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: stream,
            level: 'info'
        } ],
        serializers: {
            thing: function (value) {
              return {
                A: value.a
              };
            }
        }
    });

    var son = dad.child({
        component: 'son'
    });

    dad.info({ thing: { a: 'A' } }, 'info from dad');
    son.info({ thing: { a: 'a' } }, 'info from son');

    var rec;
    t.equal(stream.recs.length, 2);
    rec = stream.recs[0];
    t.equal(rec.msg, 'info from dad');
    t.equal(rec.thing.A, 'A');
    rec = stream.recs[1];
    t.equal(rec.msg, 'info from son');
    t.equal(rec.component, 'son');
    t.equal(rec.thing.A, 'a');

    t.end();
});

test('child extend parent serializers with new key', function (t) {
    var stream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: stream,
            level: 'info'
        } ],
        serializers: {
            thing: function (value) {
              return {
                A: value.a
              };
            }
        }
    });

    var son = dad.child({
        component: 'son',
        serializers: {
            stuff: function (value) {
              return {
                Z: value.z
              };
            }
        }
    });

    dad.info({ thing: { a: 'A' }, stuff: { z: 'Z' } }, 'info from dad');
    son.info({ thing: { a: 'a' }, stuff: { z: 'z' } }, 'info from son');

    var rec;
    t.equal(stream.recs.length, 2);
    rec = stream.recs[0];
    t.equal(rec.msg, 'info from dad');
    t.equal(rec.thing.A, 'A');
    t.equal(rec.stuff.Z, undefined);
    rec = stream.recs[1];
    t.equal(rec.msg, 'info from son');
    t.equal(rec.thing.A, 'a');
    t.equal(rec.stuff.Z, 'z');

    t.end();
});

test('child merge serializers with same key', function (t) {
    var stream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: stream,
            level: 'info'
        } ],
        serializers: {
            thing: function (value) {
              return {
                A: value.a
              };
            }
        }
    });

    var son = dad.child({
        component: 'son',
        serializers: {
            thing: function (value) {
              return {
                Z: value.z
              };
            }
        }
    });

    dad.info({ thing: { a: 'A', z: 'Z' } }, 'info from dad');
    son.info({ thing: { a: 'a', z: 'z' } }, 'info from son');

    var rec;
    t.equal(stream.recs.length, 2);
    rec = stream.recs[0];
    t.equal(rec.msg, 'info from dad');
    t.equal(rec.thing.A, 'A');
    t.equal(rec.thing.Z, undefined);
    rec = stream.recs[1];
    t.equal(rec.msg, 'info from son');
    t.equal(rec.thing.A, 'a');
    t.equal(rec.thing.Z, 'z');

    t.end();
});

test('child can add stream', function (t) {
    var dadStream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: dadStream,
            level: 'info'
        } ]
    });

    var sonStream = new CapturingStream();
    var son = dad.child({
        component: 'son',
        streams: [ {
            type: 'raw',
            stream: sonStream,
            level: 'debug'
        } ]
    });

    dad.info('info from dad');
    dad.debug('debug from dad');
    son.debug('debug from son');

    var rec;
    t.equal(dadStream.recs.length, 1);
    rec = dadStream.recs[0];
    t.equal(rec.msg, 'info from dad');
    t.equal(sonStream.recs.length, 1);
    rec = sonStream.recs[0];
    t.equal(rec.msg, 'debug from son');

    t.end();
});


test('child can set level of inherited streams', function (t) {
    var dadStream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: dadStream,
            level: 'info'
        } ]
    });

    // Intention here is that the inherited `dadStream` logs at 'debug' level
    // for the son.
    var son = dad.child({
        component: 'son',
        level: 'debug'
    });

    dad.info('info from dad');
    dad.debug('debug from dad');
    son.debug('debug from son');

    var rec;
    t.equal(dadStream.recs.length, 2);
    rec = dadStream.recs[0];
    t.equal(rec.msg, 'info from dad');
    rec = dadStream.recs[1];
    t.equal(rec.msg, 'debug from son');

    t.end();
});


test('child can set level of inherited streams and add streams', function (t) {
    var dadStream = new CapturingStream();
    var dad = bunyan.createLogger({
        name: 'surname',
        streams: [ {
            type: 'raw',
            stream: dadStream,
            level: 'info'
        } ]
    });

    // Intention here is that the inherited `dadStream` logs at 'debug' level
    // for the son.
    var sonStream = new CapturingStream();
    var son = dad.child({
        component: 'son',
        level: 'trace',
        streams: [ {
            type: 'raw',
            stream: sonStream,
            level: 'debug'
        } ]
    });

    dad.info('info from dad');
    dad.trace('trace from dad');
    son.trace('trace from son');
    son.debug('debug from son');

    t.equal(dadStream.recs.length, 3);
    t.equal(dadStream.recs[0].msg, 'info from dad');
    t.equal(dadStream.recs[1].msg, 'trace from son');
    t.equal(dadStream.recs[2].msg, 'debug from son');

    t.equal(sonStream.recs.length, 1);
    t.equal(sonStream.recs[0].msg, 'debug from son');

    t.end();
});
