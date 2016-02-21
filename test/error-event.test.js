/*
 * Copyright 2016 Trent Mick
 *
 * Test emission and handling of 'error' event in a logger with a 'path'
 * stream.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


var BOGUS_PATH = '/this/path/is/bogus.log';

test('error event on file stream (reemitErrorEvents=undefined)', function (t) {
    var log = bunyan.createLogger(
        {name: 'error-event-1', streams: [ {path: BOGUS_PATH} ]});
    log.on('error', function (err, stream) {
        t.ok(err, 'got err in error event: ' + err);
        t.equal(err.code, 'ENOENT', 'error code is ENOENT');
        t.ok(stream, 'got a stream argument');
        t.equal(stream.path, BOGUS_PATH);
        t.equal(stream.type, 'file');
        t.end();
    });
    log.info('info log message');
});

test('error event on file stream (reemitErrorEvents=true)', function (t) {
    var log = bunyan.createLogger({
        name: 'error-event-2',
        streams: [ {
            path: BOGUS_PATH,
            reemitErrorEvents: true
        } ]
    });
    log.on('error', function (err, stream) {
        t.ok(err, 'got err in error event: ' + err);
        t.equal(err.code, 'ENOENT', 'error code is ENOENT');
        t.ok(stream, 'got a stream argument');
        t.equal(stream.path, BOGUS_PATH);
        t.equal(stream.type, 'file');
        t.end();
    });
    log.info('info log message');
});

test('error event on file stream (reemitErrorEvents=false)',
        function (t) {
    var log = bunyan.createLogger({
        name: 'error-event-3',
        streams: [ {
            path: BOGUS_PATH,
            reemitErrorEvents: false
        } ]
    });
    // Hack into the underlying created file stream to catch the error event.
    log.streams[0].stream.on('error', function (err) {
        t.ok(err, 'got error event on the file stream');
        t.end();
    });
    log.on('error', function (err, stream) {
        t.fail('should not have gotten error event on logger');
        t.end();
    });
    log.info('info log message');
});


function MyErroringStream() {}
util.inherits(MyErroringStream, EventEmitter);
MyErroringStream.prototype.write = function (rec) {
    this.emit('error', new Error('boom'));
}

test('error event on raw stream (reemitErrorEvents=undefined)', function (t) {
    var estream = new MyErroringStream();
    var log = bunyan.createLogger({
        name: 'error-event-raw',
        streams: [
            {
                stream: estream,
                type: 'raw'
            }
        ]
    });
    estream.on('error', function (err) {
        t.ok(err, 'got error event on the raw stream');
        t.end();
    });
    log.on('error', function (err, stream) {
        t.fail('should not have gotten error event on logger');
        t.end();
    });
    log.info('info log message');
});

test('error event on raw stream (reemitErrorEvents=false)', function (t) {
    var estream = new MyErroringStream();
    var log = bunyan.createLogger({
        name: 'error-event-raw',
        streams: [
            {
                stream: estream,
                type: 'raw',
                reemitErrorEvents: false
            }
        ]
    });
    estream.on('error', function (err) {
        t.ok(err, 'got error event on the raw stream');
        t.end();
    });
    log.on('error', function (err, stream) {
        t.fail('should not have gotten error event on logger');
        t.end();
    });
    log.info('info log message');
});

test('error event on raw stream (reemitErrorEvents=true)', function (t) {
    var estream = new MyErroringStream();
    var log = bunyan.createLogger({
        name: 'error-event-raw',
        streams: [
            {
                stream: estream,
                type: 'raw',
                reemitErrorEvents: true
            }
        ]
    });
    log.on('error', function (err, stream) {
        t.ok(err, 'got err in error event: ' + err);
        t.equal(err.message, 'boom');
        t.ok(stream, 'got a stream argument');
        t.ok(stream.stream instanceof MyErroringStream);
        t.equal(stream.type, 'raw');
        t.end();
    });
    log.info('info log message');
});
