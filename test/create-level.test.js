/*
 * Copyright (c) 2014 Trent Mick. All rights reserved.
 *
 * Test the `log.level(...)`.
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
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;

// ---- test level creation failures

test('bunyan.createLevel(<not-a-string>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel({}, 10); },
        /* JSSTYLED */
        /name \(string\) is required/);

    t.end();
});

test('bunyan.createLevel(<missing>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel(null, 10); },
        /* JSSTYLED */
        /name \(string\) is required/);

    t.end();
});

test('bunyan.createLevel(<spaces>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel("    ", 10); },
        /* JSSTYLED */
        /name \(string\) is required/);

    t.end();
});

test('bunyan.createLevel(<existing name>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel('info', 10); },
        /* JSSTYLED */
        /level 'info' already exists/);

    t.end();
});

test('bunyan.createLevel(<existing non-lowercase name>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel('iNFo', 10); },
        /* JSSTYLED */
        /level 'info' already exists/);

    t.end();
});

test('bunyan.createLevel(<existing prototype>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel('child', 10); },
        /* JSSTYLED */
        /level 'child' is invalid/);

    t.end();
});

test('bunyan.createLevel(<non-alpha-underscore>, ...)', function (t) {
    t.throws(function () { bunyan.createLevel('abc34', 10); },
        /* JSSTYLED */
        /level 'abc34' is invalid/);

    t.end();
});

test('bunyan.createLevel(..., <existing level>)', function (t) {
    t.throws(function () { bunyan.createLevel('abc', 10); },
        /* JSSTYLED */
        /level 'abc' would duplicate 'trace'/);

    t.end();
});

test('bunyan.createLevel(..., <not-a-number>)', function (t) {
    t.throws(function () { bunyan.createLevel('abc', {}); },
        /* JSSTYLED */
        /level \(number\) is required/);

    t.end();
});

test('bunyan.createLevel(<name>, <number>)', function (t) {
    bunyan.createLevel('createlevel_test', 1);
    t.end();
});


bunyan.createLevel('notice', 35);

// ---- test logging occurs as expected around level 35 / notice

function Catcher() {
    this.records = [];
}
Catcher.prototype.write = function (record) {
    this.records.push(record);
}
var catcher = new Catcher();
var log1 = new bunyan.createLogger({
    name: 'log1',
    streams: [
        {
            type: 'raw',
            stream: catcher,
            level: 'warn'
        }
    ]
});

test('log.notice() at level info', function(t) {
    log1.level('info');
    log1.notice('at level info');
    var rec = catcher.records[catcher.records.length - 1];
    t.equal(rec.msg, 'at level info', 'log.notice msg is "at level info"');
    t.done();
});

test('log.notice() at level 37', function(t) {
    log1.level(37);
    log1.notice('at level 37');
    var rec = catcher.records[catcher.records.length - 1];
    t.notEqual(rec.msg, 'at level 37', 'log.notice msg is not "at level 37"');
    t.done();
});

test('log.notice() at level warn', function(t) {
    log1.level('warn');
    log1.notice('at level warn');
    var rec = catcher.records[catcher.records.length - 1];
    t.notEqual(rec.msg, 'at level warn', 'log.notice msg is not "at level warn"');
    t.done();
});

