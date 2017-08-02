/*
 * Copyright (c) 2017, Trent Mick.
 *
 * Test the bunyan CLI's handling of the "client_req" field.
 * "client_req" is a common-ish Bunyan log field from restify-clients. See:
 *      // JSSTYLED
 *      https://github.com/restify/clients/blob/85374f87db9f4469de2605b6b15632b317cc12be/lib/helpers/bunyan.js#L213
 */

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('util').format;
var vasync = require('vasync');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


// ---- globals

var BUNYAN = path.resolve(__dirname, '../bin/bunyan');


// ---- tests

// The bunyan CLI shouldn't add a "Host:" line if client_req.headers has one.
// See <https://github.com/trentm/node-bunyan/issues/504>.
test('client_req renders without extra Host header', function (t) {
    exec(_('%s %s/corpus/issue504-client-req-with-host.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, [
            // JSSTYLED
            '[2017-05-12T23:59:15.877Z] TRACE: minfo/66266 on sharptooth.local: request sent (client_req.address=127.0.0.1)',
            '    HEAD /dap/stor HTTP/1.1',
            '    accept: application/json, */*',
            '    host: foo.example.com',
            '    date: Fri, 12 May 2017 23:59:15 GMT',
            ''
        ].join('\n'));
        t.end();
    });
});

test('client_req added Host header elides port 80', function (t) {
    exec(_('%s %s/corpus/issue504-client-req-with-port80.log',
            BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, [
            // JSSTYLED
            '[2017-05-12T23:59:15.877Z] TRACE: minfo/66266 on sharptooth.local: request sent',
            '    HEAD /dap/stor HTTP/1.1',
            '    Host: 127.0.0.1',
            '    accept: application/json, */*',
            '    date: Fri, 12 May 2017 23:59:15 GMT',
            ''
        ].join('\n'));
        t.end();
    });
});

test('client_req added Host header elides port 443', function (t) {
    exec(_('%s %s/corpus/issue504-client-req-with-port443.log',
            BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, [
            // JSSTYLED
            '[2017-05-12T23:59:15.877Z] TRACE: minfo/66266 on sharptooth.local: request sent',
            '    HEAD /dap/stor HTTP/1.1',
            '    Host: 127.0.0.1',
            '    accept: application/json, */*',
            '    date: Fri, 12 May 2017 23:59:15 GMT',
            ''
        ].join('\n'));
        t.end();
    });
});

test('client_req added Host header, non-default port', function (t) {
    exec(_('%s %s/corpus/issue504-client-req-with-port8080.log',
            BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, [
            // JSSTYLED
            '[2017-05-12T23:59:15.877Z] TRACE: minfo/66266 on sharptooth.local: request sent',
            '    HEAD /dap/stor HTTP/1.1',
            '    Host: 127.0.0.1:8080',
            '    accept: application/json, */*',
            '    date: Fri, 12 May 2017 23:59:15 GMT',
            ''
        ].join('\n'));
        t.end();
    });
});

test('client_req without address does not add Host header', function (t) {
    exec(_('%s %s/corpus/issue504-client-req-without-address.log',
            BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, [
            // JSSTYLED
            '[2017-05-12T23:59:15.877Z] TRACE: minfo/66266 on sharptooth.local: request sent',
            '    HEAD /dap/stor HTTP/1.1',
            '    accept: application/json, */*',
            '    date: Fri, 12 May 2017 23:59:15 GMT',
            ''
        ].join('\n'));
        t.end();
    });
});
