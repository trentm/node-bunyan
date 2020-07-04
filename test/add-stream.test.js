/*
 * Copyright (c) 2016 Trent Mick. All rights reserved.
 *
 * Test stream adding.
 */

var test = require('tap').test;

var bunyan = require('../lib/bunyan');


test('non-writables passed as stream', function (t) {
    var things = ['process.stdout', {}];
    things.forEach(function (thing) {
        function createLogger() {
            bunyan.createLogger({
                name: 'foo',
                stream: thing
            });
        }
        t.throws(createLogger,
            /stream is not writable/,
            '"stream" stream is not writable');
    })
    t.end();
});

test('proper stream', function (t) {
    var log = bunyan.createLogger({
        name: 'foo',
        stream: process.stdout
    });
    t.ok('should not throw');
    t.end();
});
