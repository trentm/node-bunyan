/*
 * Copyright 2020 Trent Mick
 *
 * Test the bunyan CLI's handling of the "res" field.
 */

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');
var _ = require('util').format;
var test = require('tap').test;


// ---- globals

var BUNYAN = path.resolve(__dirname, '../bin/bunyan');
if (os.platform() === 'win32') {
    BUNYAN = process.execPath + ' ' + BUNYAN;
}


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
