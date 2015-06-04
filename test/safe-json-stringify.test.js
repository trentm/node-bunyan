/*
 * Copyright (c) 2015 Trent Mick. All rights reserved.
 *
 * If available, use `safe-json-stringfy` as a fallback stringifier.
 * This covers the case where an enumerable property throws an error
 * in its getter.
 *
 * See <https://github.com/trentm/node-bunyan/pull/182>
 */

var p = console.warn;
var exec = require('child_process').exec;

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


test('__defineGetter__ boom', function (t) {
    var cmd = process.execPath + ' ' + __dirname + '/safe-json-stringify-1.js';
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err, err);
        var rec = JSON.parse(stdout.trim());
        t.equal(rec.obj.boom, '[Throws: __defineGetter__ ouch!]');
        t.end();
    });
});

test('__defineGetter__ boom, without safe-json-stringify', function (t) {
    var cmd = process.execPath + ' ' + __dirname + '/safe-json-stringify-2.js';
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err, err);
        t.ok(stdout.indexOf('Exception in JSON.stringify') !== -1);
        t.ok(stderr.indexOf(
            'You can install the "safe-json-stringify" module') !== -1);
        t.end();
    });
});

test('defineProperty boom', function (t) {
    var cmd = process.execPath + ' ' + __dirname + '/safe-json-stringify-3.js';
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err, err);
        var recs = stdout.trim().split(/\n/g);
        t.equal(recs.length, 2);
        var rec = JSON.parse(recs[0]);
        t.equal(rec.obj.boom, '[Throws: defineProperty ouch!]');
        t.end();
    });
});

test('defineProperty boom, without safe-json-stringify', function (t) {
    var cmd = process.execPath + ' ' + __dirname + '/safe-json-stringify-4.js';
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err, err);
        t.ok(stdout.indexOf('Exception in JSON.stringify') !== -1);
        t.equal(stdout.match(/Exception in JSON.stringify/g).length, 2);
        t.ok(stderr.indexOf(
            'You can install the "safe-json-stringify" module') !== -1);
        t.equal(stderr.match(
            /* JSSTYLED */
            /You can install the "safe-json-stringify" module/g).length, 1);
        t.end();
    });
});
