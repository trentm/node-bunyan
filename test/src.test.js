/*
 * Copyright (c) 2015 Trent Mick.
 *
 * Test `src: true` usage.
 */

// Intentionally on line 8 for tests below:
function logSomething(log) { log.info('something'); }

function someFunc(log) {
    log.customLevel = function () {
        log.info('something else');
    }
    // Intentionally on line 15 for tests below:
    log.customLevel();
}

var format = require('util').format;
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

    t.equal(log.src, 2);

    log.info('top-level');
    logSomething(log);
    log.src = 3;
    someFunc(log);

    t.equal(recs.length, 3);
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
    var rec = recs[2];
    t.ok(rec.src.func);
    t.equal(rec.src.func, 'someFunc');
    t.equal(rec.src.line, 15);

    t.end();
});
