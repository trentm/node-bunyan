/*
 * Copyright 2020 Trent Mick
 *
 * Test type checking on creation of the Logger.
 */

var test = require('tap').test;

var bunyan = require('../lib/bunyan')
var Logger = bunyan;


test('ensure Logger creation options', function (t) {
    t.throws(function () { new Logger(); },
        /options \(object\) is required/,
        'no options should throw');

    t.throws(function () { new Logger({}); },
        /options\.name \(string\) is required/,
        'no options.name should throw');

    t.doesNotThrow(function () { new Logger({name: 'foo'}); },
        'just options.name should be sufficient');

    var options = {name: 'foo', stream: process.stdout, streams: []};
    t.throws(function () { new Logger(options); },
        /* JSSTYLED */
        /cannot mix "streams" and "stream" options/,
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {name: 'foo', streams: {}};
    t.throws(function () { new Logger(options); },
        /invalid options.streams: must be an array/,
        '"streams" must be an array');

    options = {name: 'foo', serializers: 'a string'};
    t.throws(function () { new Logger(options); },
        /invalid options.serializers: must be an object/,
        '"serializers" cannot be a string');

    options = {name: 'foo', serializers: [1, 2, 3]};
    t.throws(function () { new Logger(options); },
        /invalid options.serializers: must be an object/,
        '"serializers" cannot be an array');

    t.end();
});


test('ensure Logger constructor is safe without new', function (t) {
    t.doesNotThrow(function () { Logger({name: 'foo'}); },
        'constructor should call self with new if necessary');

    t.end();
});


test('ensure Logger creation options (createLogger)', function (t) {
    t.throws(function () { bunyan.createLogger(); },
        /options \(object\) is required/,
        'no options should throw');

    t.throws(function () { bunyan.createLogger({}); },
        /options\.name \(string\) is required/,
        'no options.name should throw');

    t.doesNotThrow(function () { bunyan.createLogger({name: 'foo'}); },
        'just options.name should be sufficient');

    var options = {name: 'foo', stream: process.stdout, streams: []};
    t.throws(function () { bunyan.createLogger(options); },
        /* JSSTYLED */
        /cannot mix "streams" and "stream" options/,
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {name: 'foo', streams: {}};
    t.throws(function () { bunyan.createLogger(options); },
        /invalid options.streams: must be an array/,
        '"streams" must be an array');

    options = {name: 'foo', serializers: 'a string'};
    t.throws(function () { bunyan.createLogger(options); },
        /invalid options.serializers: must be an object/,
        '"serializers" cannot be a string');

    options = {name: 'foo', serializers: [1, 2, 3]};
    t.throws(function () { bunyan.createLogger(options); },
        /invalid options.serializers: must be an object/,
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
        /invalid options.name: child cannot set logger name/,
        'child cannot change name');

    var options = {stream: process.stdout, streams: []};
    t.throws(function () { log.child(options); },
        /* JSSTYLED */
        /cannot mix "streams" and "stream" options/,
        'cannot use "stream" and "streams"');

    // https://github.com/trentm/node-bunyan/issues/3
    options = {streams: {}};
    t.throws(function () { log.child(options); },
        /invalid options.streams: must be an array/,
        '"streams" must be an array');

    options = {serializers: 'a string'};
    t.throws(function () { log.child(options); },
        /invalid options.serializers: must be an object/,
        '"serializers" cannot be a string');

    options = {serializers: [1, 2, 3]};
    t.throws(function () { log.child(options); },
        /invalid options.serializers: must be an object/,
        '"serializers" cannot be an array');

    t.end();
});


test('ensure Logger() rejects non-Logger parents', function (t) {
    var dad = new Logger({name: 'dad', streams: []});

    t.throws(function () { new Logger({}, {}); },
        /invalid Logger creation: do not pass a second arg/,
        'Logger arguments must be valid');

    t.doesNotThrow(function () { new Logger(dad, {}); },
        'Logger allows Logger instance as parent');

    t.end();
});
