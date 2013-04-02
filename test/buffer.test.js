/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 * Copyright (c) 2012 Joyent Inc. All rights reserved.
 *
 * Test logging with (accidental) usage of buffers.
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
    name: 'buffer.test',
    streams: [
        {
            type: 'raw',
            stream: catcher,
            level: 'trace'
        }
    ]
});


test('log.info(BUFFER)', function (t) {
    var b = new Buffer('foo');

    ['trace',
     'debug',
     'info',
     'warn',
     'error',
     'fatal'].forEach(function (lvl) {
        log[lvl].call(log, b);
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, inspect(b),
            format('log.%s msg is inspect(BUFFER)', lvl));
        t.ok(rec['0'] === undefined,
            'no "0" array index key in record: ' + inspect(rec['0']));
        t.ok(rec['parent'] === undefined,
            'no "parent" array index key in record: ' + inspect(rec['parent']));

        log[lvl].call(log, b, 'bar');
        var rec = catcher.records[catcher.records.length - 1];
        t.equal(rec.msg, inspect(b) + ' bar', format(
            'log.%s(BUFFER, "bar") msg is inspect(BUFFER) + " bar"', lvl));
    });

    t.end();
});


//test('log.info({buf: BUFFER})', function (t) {
//  var b = new Buffer('foo');
//
//  // Really there isn't much Bunyan can do here. See
//  // <https://github.com/joyent/node/issues/3905>. An unwelcome hack would
//  // be to monkey-patch in Buffer.toJSON. Bletch.
//  log.info({buf: b}, 'my message');
//  var rec = catcher.records[catcher.records.length - 1];
//
//  t.end();
//});
