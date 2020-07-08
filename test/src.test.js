/*
 * Copyright 2020 Trent Mick.
 *
 * Test `src: true` usage.
 */

// Intentionally on line 8 for tests below:
function logSomething(log) { log.info('something'); }

var test = require('tap').test;
var format = require('util').format;

var Logger = require('../lib/bunyan');


function CapturingStream(recs) {
    this.recs = recs;
}
CapturingStream.prototype.write = function (rec) {
    this.recs.push(rec);
}


test('src', function (t) {
    var recs = [];

    var log = new Logger({
        name: 'src-test',
        src: true,
        streams: [
            {
                stream: new CapturingStream(recs),
                type: 'raw'
            }
        ]
    });

    log.info('top-level');
    logSomething(log);

    t.equal(recs.length, 2);
    recs.forEach(function (rec) {
        t.ok(rec.src);
        t.equal(typeof (rec.src), 'object');
        t.equal(rec.src.file, __filename);
        t.ok(rec.src.line);
        t.equal(typeof (rec.src.line), 'number');
    });
    var rec = recs[1];
    t.ok(rec.src.func);
    t.equal(rec.src.func, 'logSomething');
    t.equal(rec.src.line, 8);

    t.end();
});
