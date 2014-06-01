'use strict';
/*
 * Test that bunyan process will terminate
 */

var exec = require('child_process').exec;

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
    delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var test = tap4nodeunit.test;

test('log with rotating file stream will terminate gracefully', function (t) {
    exec('node ' +__dirname + '/process-exit.js', {timeout: 1000},
            function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, 'done\n');
        t.equal(stderr, '');
        t.end();
    });
});
