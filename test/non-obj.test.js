/*
 * Test logging with anything but an object as the first param.
 */

var util = require('util'),
    inspect = util.inspect,
    format = util.format;
var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;



function Catcher() {
    this.records = [];
}
Catcher.prototype.write = function (record) {
    this.records.push(record);
}

var catcher = new Catcher();
var log = new bunyan.createLogger({
    name: 'non-obj.test',
    streams: [
        {
            type: 'raw',
            stream: catcher,
            level: 'trace'
        }
    ]
});


test('log.info(undefined)', function (t) {
    var undef = undefined;

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, undef);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'undefined',
            format('log.%s msg is "undefined"', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});

test('log.info(null)', function (t) {
    var nullObj = null;

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, nullObj);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'null',
            format('log.%s msg is "null"', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});

test('log.info(String)', function (t) {
    var str = 'some message';

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, str);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'some message',
            format('log.%s msg is str', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});

test('log.info(Boolean)', function (t) {
    var bool = false;

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, bool);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, 'false',
            format('log.%s msg is bool.toString()', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});

test('log.info(Number)', function (t) {
    var num = 23;

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, num);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '23',
            format('log.%s msg is num.toString()', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});

test('log.info(Function)', function (t) {
    var func = function(){};

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, func);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, '[Function]',
            format('log.%s msg is "[Function]"', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));
    });

    t.end();
});


