/*
 * Copyright (c) 2017, Trent Mick.
 *
 * Test the bunyan CLI's handling of the "res" field.
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

test('res with "header" string (issue #444)', function (t) {
    var expect = [
        /* BEGIN JSSTYLED */
        '[2017-08-02T22:37:34.798Z]  INFO: res-header/76488 on danger0.local: response sent',
        '    HTTP/1.1 200 OK',
        '    Foo: bar',
        '    Date: Wed, 02 Aug 2017 22:37:34 GMT',
        '    Connection: keep-alive',
        '    Content-Length: 21'
        /* END JSSTYLED */
    ].join('\n') + '\n';
    exec(_('%s %s/corpus/res-header.log', BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});

test('res without "header"', function (t) {
    var expect = [
        /* BEGIN JSSTYLED */
        '[2017-08-02T22:37:34.798Z]  INFO: res-header/76488 on danger0.local: response sent',
        '    HTTP/1.1 200 OK'
        /* END JSSTYLED */
    ].join('\n') + '\n';
    exec(_('%s %s/corpus/res-without-header.log', BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});
