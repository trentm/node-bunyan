/*
 * Copyright 2016 Trent Mick. All rights reserved.
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


test('error event on log write', function (t) {
    LOG_PATH = '/this/path/is/bogus.log'
    var log = bunyan.createLogger(
        {name: 'error-event', streams: [ {path: LOG_PATH} ]});
    log.on('error', function (err, stream) {
        t.ok(err, 'got err in error event: ' + err);
        t.equal(err.code, 'ENOENT', 'error code is ENOENT');
        t.ok(stream, 'got a stream argument');
        t.equal(stream.path, LOG_PATH);
        t.equal(stream.type, 'file');
        t.end();
    });
    log.info('info log message');
});


function MyErroringStream() {

}
util.inherits(MyErroringStream, EventEmitter);

MyErroringStream.prototype.write = function (rec) {
    this.emit('error', new Error('boom'));
}

test('error event on log write (raw stream)', function (t) {
    LOG_PATH = '/this/path/is/bogus.log'
    var log = bunyan.createLogger({
        name: 'error-event-raw',
        streams: [
            {
                stream: new MyErroringStream(),
                type: 'raw'
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
