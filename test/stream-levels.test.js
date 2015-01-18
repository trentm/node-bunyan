/*
 * Copyright (c) 2015 Trent Mick. All rights reserved.
 *
 * Test that streams (the various way they can be added to
 * a Logger instance) get the appropriate level.
 */

var util = require('util'),
    format = util.format,
    inspect = util.inspect;
var p = console.log;

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var test = tap4nodeunit.test;


// ---- Tests

var log1 = bunyan.createLogger({
    name: 'log1',
    streams: [
        {
            path: __dirname + '/level.test.log1.log',
            level: 'info'
        }
    ]
});


test('default stream log level', function (t) {
    var log = bunyan.createLogger({
        name: 'foo'
    });
    t.equal(log.level(), bunyan.INFO);
    t.equal(log.streams[0].level, bunyan.INFO);
    t.end();
});

test('default stream, level=DEBUG specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        level: bunyan.DEBUG
    });
    t.equal(log.level(), bunyan.DEBUG);
    t.equal(log.streams[0].level, bunyan.DEBUG);
    t.end();
});

test('default stream, level="trace" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        level: 'trace'
    });
    t.equal(log.level(), bunyan.TRACE);
    t.equal(log.streams[0].level, bunyan.TRACE);
    t.end();
});

test('stream & level="trace" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        stream: process.stderr,
        level: 'trace'
    });
    t.equal(log.level(), bunyan.TRACE);
    t.equal(log.streams[0].level, bunyan.TRACE);
    t.end();
});

test('one stream, default level', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        streams: [
            {
                stream: process.stderr
            }
        ]
    });
    t.equal(log.level(), bunyan.INFO);
    t.equal(log.streams[0].level, bunyan.INFO);
    t.end();
});

test('one stream, top-"level" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        level: 'error',
        streams: [
            {
                stream: process.stderr
            }
        ]
    });
    t.equal(log.level(), bunyan.ERROR);
    t.equal(log.streams[0].level, bunyan.ERROR);
    t.end();
});

test('one stream, stream-"level" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        streams: [
            {
                stream: process.stderr,
                level: 'error'
            }
        ]
    });
    t.equal(log.level(), bunyan.ERROR);
    t.equal(log.streams[0].level, bunyan.ERROR);
    t.end();
});

test('one stream, both-"level" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        level: 'debug',
        streams: [
            {
                stream: process.stderr,
                level: 'error'
            }
        ]
    });
    t.equal(log.level(), bunyan.ERROR);
    t.equal(log.streams[0].level, bunyan.ERROR);
    t.end();
});

test('two streams, both-"level" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        level: 'debug',
        streams: [
            {
                stream: process.stdout,
                level: 'trace'
            },
            {
                stream: process.stderr,
                level: 'fatal'
            }
        ]
    });
    t.equal(log.level(), bunyan.TRACE, 'log.level()');
    t.equal(log.streams[0].level, bunyan.TRACE);
    t.equal(log.streams[1].level, bunyan.FATAL);
    t.end();
});

test('two streams, one with "level" specified', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        streams: [
            {
                stream: process.stdout,
            },
            {
                stream: process.stderr,
                level: 'fatal'
            }
        ]
    });
    t.equal(log.level(), bunyan.INFO);
    t.equal(log.streams[0].level, bunyan.INFO);
    t.equal(log.streams[1].level, bunyan.FATAL);
    t.end();
});
