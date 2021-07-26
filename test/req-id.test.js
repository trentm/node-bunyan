/*
 * Copyright 2021 Slava Fomin II
 *
 * Test the `req_id` API.
 */

var test = require('tap').test;
var bunyan = require('../lib/bunyan');


function CapturingStream() {
    this.recs = [];
}
CapturingStream.prototype.write = function (rec) {
    this.recs.push(rec);
}
CapturingStream.prototype.clear = function () {
    this.recs = [];
}

var logStream = new CapturingStream();

var logger = bunyan.createLogger({
    name: 'logger',
    streams: [{
        type: 'raw',
        stream: logStream,
        level: 'info',
    }],
    req_id: () => {
        return '543' + '21';
    }
});


test('req_id passed by the user should take precedence', function (test) {
    logStream.clear();
    logger.info({ req_id: '12345' }, 'Hello world!');
    test.equal(logStream.recs[0].req_id, '12345');
    test.end();
});

test('req_id generator should be used', function (test) {
    logStream.clear();
    logger.info('Hello world!');
    test.equal(logStream.recs[0].req_id, '54321');
    test.end();
});
