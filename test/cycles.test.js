/*
 * Copyright 2020 Trent Mick.
 *
 * Make sure cycles are safe.
 */

var Logger = require('../lib/bunyan.js');
var test = require('tap').test;


var Stream = require('stream').Stream;
var outstr = new Stream;
outstr.writable = true;
var output = [];
outstr.write = function (c) {
    output.push(JSON.parse(c + ''));
};
outstr.end = function (c) {
    if (c) this.write(c);
    this.emit('end');
};

var expect =
        [
            {
                'name': 'blammo',
                'level': 30,
                'msg': 'bango { bang: \'boom\', KABOOM: [Circular] }',
                'v': 0
            },
            {
                'name': 'blammo',
                'level': 30,
                'msg': 'kaboom { bang: \'boom\', KABOOM: [Circular] }',
                'v': 0
            },
            {
                'name': 'blammo',
                'level': 30,
                'bang': 'boom',
                'KABOOM': {
                    'bang': 'boom',
                    'KABOOM': '[Circular]'
                },
                'msg': '',
                'v': 0
            }
        ];

var log = new Logger({
    name: 'blammo',
    streams: [
        {
            type: 'stream',
            level: 'info',
            stream: outstr
        }
    ]
});

test('cycles', function (t) {
    var rec;

    outstr.on('end', function () {
        output.forEach(function (o, i) {
            // Drop variable parts for comparison.
            delete o.hostname;
            delete o.pid;
            delete o.time;

            // In change https://github.com/nodejs/node/pull/27685 (part of
            // node v14), how objects with circular references are stringified
            // with `util.inspect` changed.
            if (Number(process.versions.node.split('.')[0]) >= 14) {
                expect[i].msg = expect[i].msg.replace(
                    // JSSTYLED
                    /{ bang: 'boom', KABOOM: \[Circular\] }/,
                    '<ref *1> { bang: \'boom\', KABOOM: [Circular *1] }'
                );
            }

            t.equal(JSON.stringify(o), JSON.stringify(expect[i]),
                'log record ' + i + ' matches');
        });
        t.end();
    });

    var obj = { bang: 'boom' };
    obj.KABOOM = obj;  // This creates a circular reference.

    log.info('bango', obj);
    log.info('kaboom', obj.KABOOM);
    log.info(obj);

    t.ok('did not throw');

    outstr.end();
});
