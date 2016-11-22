/*
 * Copyright (c) 2015 Trent Mick.
 *
 * Test `customStringifier` usage.
 */

function logSomething(log) { log.info('something'); }

var Logger = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


function CapturingStream(recs) {
    this.recs = recs;
}

CapturingStream.prototype.write = function (rec) {
    this.recs.push(rec);
};


test('customStringifier', function (t) {
    var recs = [];

    var log = new Logger({
        name: 'custom-stringifier-test',
        customStringify: function(rec) {
            console.log("Hello");
            return rec.msg;
        },
        streams: [
            {
                stream: new CapturingStream(recs)
            }
        ]
    });

    log.info('top-level');
    logSomething(log);

    t.equal(recs.length, 2);
    recs.forEach(function (rec) {
        console.log(rec);
        t.equal(typeof rec, 'string');
    });

    t.equal(recs[0], "top-level");
    t.equal(recs[1], "something");

    t.end();
});
