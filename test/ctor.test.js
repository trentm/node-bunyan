/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test type checking on creation of the Logger.
 */

var bunyan = require('../lib/bunyan'),
        Logger = bunyan;

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;



test('ensure Logger creation options', function (t) {
    t.throws(function () { new Logger(); },
        'options (object) is required',
        'no options should throw');

    t.throws(function () { new Logger({}); },
        'options.name (string) is required',
        'no options.name should throw');

    t.doesNotThrow(function () { new Logger({name: 'foo'}); },
        'just options.name should be sufficient');

    var options = {name: 'foo', stream: process.stdout, streams: []};
    t.throws(function () { new Logger(options); },
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {name: 'foo', streams: {}};
    t.throws(function () { new Logger(options); },
        'invalid options.streams: must be an array',
        '"streams" must be an array');

    options = {name: 'foo', serializers: 'a string'};
    t.throws(function () { new Logger(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be a string');

    options = {name: 'foo', serializers: [1, 2, 3]};
    t.throws(function () { new Logger(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be an array');

    t.end();
});


test('ensure Logger creation options (createLogger)', function (t) {
    t.throws(function () { bunyan.createLogger(); },
        'options (object) is required',
        'no options should throw');

    t.throws(function () { bunyan.createLogger({}); },
        'options.name (string) is required',
        'no options.name should throw');

    t.doesNotThrow(function () { bunyan.createLogger({name: 'foo'}); },
        'just options.name should be sufficient');

    var options = {name: 'foo', stream: process.stdout, streams: []};
    t.throws(function () { bunyan.createLogger(options); },
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {name: 'foo', streams: {}};
    t.throws(function () { bunyan.createLogger(options); },
        'invalid options.streams: must be an array',
        '"streams" must be an array');

    options = {name: 'foo', serializers: 'a string'};
    t.throws(function () { bunyan.createLogger(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be a string');

    options = {name: 'foo', serializers: [1, 2, 3]};
    t.throws(function () { bunyan.createLogger(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be an array');

    t.end();
});


test('ensure Logger child() options', function (t) {
    var log = new Logger({name: 'foo'});

    t.doesNotThrow(function () { log.child(); },
        'no options should be fine');

    t.doesNotThrow(function () { log.child({}); },
        'empty options should be fine too');

    t.throws(function () { log.child({name: 'foo'}); },
        'invalid options.name: child cannot set logger name',
        'child cannot change name');

    var options = {stream: process.stdout, streams: []};
    t.throws(function () { log.child(options); },
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {streams: {}};
    t.throws(function () { log.child(options); },
        'invalid options.streams: must be an array',
        '"streams" must be an array');

    options = {serializers: 'a string'};
    t.throws(function () { log.child(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be a string');

    options = {serializers: [1, 2, 3]};
    t.throws(function () { log.child(options); },
        'invalid options.serializers: must be an object',
        '"serializers" cannot be an array');

    t.end();
});
