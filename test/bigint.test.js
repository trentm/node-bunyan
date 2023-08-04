/*
 * Make sure bigints are safe
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
                'name': 'bigint',
                'level': 30,
                'msg': 'amount 100n',
                'v': 0
            },
            {
                'name': 'bigint',
                'level': 30,
                'msg': 'obj { amount: 100n, numAmount: 100 }',
                'v': 0
            },
            {
                'name': 'bigint',
                'level': 30,
                'amount': '100n',
                'numAmount': 100,
                'msg': '',
                'v': 0
            }
        ];

var log = new Logger({
    name: 'bigint',
    streams: [
        {
            type: 'stream',
            level: 'info',
            stream: outstr
        }
    ]
});

// Bigint is only supported in nodejs 10+
if (Number(process.versions.node.split('.')[0]) >= 10) {
    test('bigints', function (t) {
        outstr.on('end', function () {
            output.forEach(function (o, i) {
                // Drop variable parts for comparison.
                delete o.hostname;
                delete o.pid;
                delete o.time;

                t.equal(JSON.stringify(o), JSON.stringify(expect[i]),
                'log record ' + i + ' matches');
            });
            t.end();
        });

        var amount = BigInt('100');
        var numAmount = 100
        var obj = { amount: amount, numAmount: numAmount };

        log.info('amount', amount);
        log.info('obj', obj);
        log.info(obj);

        t.ok('did not throw');

        outstr.end();
    })
}