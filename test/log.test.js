/*
 * Copyright 2020 Trent Mick
 *
 * Test the `log.trace(...)`, `log.debug(...)`, ..., `log.fatal(...)` API.
 */

var util = require('util'),
    format = util.format,
    inspect = util.inspect;
var test = require('tap').test;
var p = console.log;

var bunyan = require('../lib/bunyan');


// ---- test boolean `log.<level>()` calls

var log1 = bunyan.createLogger({
    name: 'log1',
    streams: [
        {
            path: __dirname + '/log.test.log1.log',
            level: 'info'
        }
    ]
});

var log2 = bunyan.createLogger({
    name: 'log2',
    streams: [
        {
            path: __dirname + '/log.test.log2a.log',
            level: 'error'
        },
        {
            path: __dirname + '/log.test.log2b.log',
            level: 'debug'
        }
    ]
})

test('log.LEVEL() -> boolean', function (t) {
    t.equal(log1.trace(), false, 'log1.trace() is false')
    t.equal(log1.debug(), false)
    t.equal(log1.info(), true)
    t.equal(log1.warn(), true)
    t.equal(log1.error(), true)
    t.equal(log1.fatal(), true)

    // Level is the *lowest* level of all streams.
    t.equal(log2.trace(), false)
    t.equal(log2.debug(), true)
    t.equal(log2.info(), true)
    t.equal(log2.warn(), true)
    t.equal(log2.error(), true)
    t.equal(log2.fatal(), true)
    t.end();
});


// ---- test `log.<level>(...)` calls which various input types

function Catcher() {
    this.records = [];
}
Catcher.prototype.write = function (record) {
    this.records.push(record);
}
var catcher = new Catcher();
var log3 = new bunyan.createLogger({
    name: 'log3',
    streams: [
        {
            type: 'raw',
            stream: catcher,
            level: 'trace'
        }
    ]
});

var names = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
var fields = {one: 'un'};

test('log.info(undefined, <msg>)', function (t) {
    // https://github.com/nodejs/node/pull/23162 (starting in node v12) changed
    // util.format() handling such that this test case expected string differs.
    var expect;
    if (Number(process.versions.node.split('.')[0]) >= 12) {
        expect = 'undefined some message';
    } else {
        expect = 'undefined \'some message\'';
    }

    names.forEach(function (lvl) {
        log3[lvl].call(log3, undefined, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, expect,
            format('log.%s(undefined, "some message")', lvl));
    });
    t.end();
});

test('log.info(<fields>, undefined)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, undefined);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'undefined',
            format('log.%s msg: expect "undefined", got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(null, <msg>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, null, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'some message',
            format('log.%s msg is "some message"', lvl));
    });
    t.end();
});

test('log.info(<fields>, null)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, null);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'null',
            format('log.%s msg: expect "null", got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(<str>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'some message',
            format('log.%s msg is "some message"', lvl));
    });
    t.end();
});

test('log.info(<fields>, <str>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'some message',
            format('log.%s msg: got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(<bool>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, true);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'true',
            format('log.%s msg is "true"', lvl));
    });
    t.end();
});

test('log.info(<fields>, <bool>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, true);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'true',
            format('log.%s msg: got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(<num>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, 3.14);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '3.14',
            format('log.%s msg: got %j', lvl, rec.msg));
    });
    t.end();
});

test('log.info(<fields>, <num>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, 3.14);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '3.14',
            format('log.%s msg: got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(<function>)', function (t) {
    var func = function func1() {};
    names.forEach(function (lvl) {
        log3[lvl].call(log3, func);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '[Function: func1]',
            format('log.%s msg: got %j', lvl, rec.msg));
    });
    t.end();
});

test('log.info(<fields>, <function>)', function (t) {
    var func = function func2() {};
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, func);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '[Function: func2]',
            format('log.%s msg: got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});

test('log.info(<array>)', function (t) {
    var arr = ['a', 1, {two: 'deux'}];
    names.forEach(function (lvl) {
        log3[lvl].call(log3, arr);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, format(arr),
            format('log.%s msg: got %j', lvl, rec.msg));
    });
    t.end();
});

test('log.info(<fields>, <array>)', function (t) {
    var arr = ['a', 1, {two: 'deux'}];
    names.forEach(function (lvl) {
        log3[lvl].call(log3, fields, arr);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, format(arr),
            format('log.%s msg: got %j', lvl, rec.msg));
        t.equal(rec.one, 'un');
    });
    t.end();
});


/*
 * By accident (starting with trentm/node-bunyan#85 in bunyan@0.23.0),
 *      log.info(null, ...)
 * was interpreted as `null` being the object of fields. It is gracefully
 * handled, which is good. However, had I to do it again, I would have made
 * that interpret `null` as the *message*, and no fields having been passed.
 * I think it is baked now. It would take a major bunyan rev to change it,
 * but I don't think it is worth it: passing `null` as the first arg isn't
 * really an intended way to call these Bunyan methods for either case.
 */

test('log.info(null)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, null);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '', format('log.%s msg: got %j', lvl, rec.msg));
    });
    t.end();
});

test('log.info(null, <msg>)', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, null, 'my message');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'my message',
            format('log.%s msg: got %j', lvl, rec.msg));
    });
    t.end();
});
