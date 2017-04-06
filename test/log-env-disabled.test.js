/*
 * Copyright (c) 2014 Trent Mick. All rights reserved.
 *
 */

// Records that has this name will NOT be emitted.
process.env.BUNYAN_REC_DISABLE_name = "to-be-disabled";
process.env["BUNYAN_REC_DISABLE_fullName.first"] = "Marcello";

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

// ---- test `log.<level>(...)` calls which various input types

function Catcher() {
    this.records = [];
}
Catcher.prototype.write = function (record) {
    this.records.push(record);
}
var catcher = new Catcher();
var log3 = new bunyan.createLogger({
    name: 'to-be-disabled',
    streams: [
        {
            type: 'raw',
            stream: catcher,
            level: 'trace'
        }
    ]
});

var names = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

test('log.info(null, disabled by "name")', function (t) {
    names.forEach(function (lvl) {
        log3[lvl].call(log3, null, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.notEqual(rec, 'undefined');
    });
    delete process.env.BUNYAN_REC_DISABLE_name;
    t.end();
});

test('log.info(null, disabled by "object value")', function (t) {

    var myObj = {
        fullName: {
            first: "Marcello",
            last: "deSales"
        }
    };

    names.forEach(function (lvl) {
        log3[lvl].call(log3, myObj, 'some message');
        var rec = catcher.records[catcher.records.length - 1];
        t.notEqual(rec, 'undefined');
    });
    delete process.env.BUNYAN_REC_DISABLE_name;
    t.end();
});
