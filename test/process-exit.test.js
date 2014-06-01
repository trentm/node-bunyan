'use strict';
/*
 * Test that bunyan process will terminate.
 *
 * Note: Currently (bunyan 0.23.1) this fails on node 0.8, because there is
 * no `unref` in node 0.8 and bunyan doesn't yet have `Logger.prototype.close()`
 * support.
 */

var exec = require('child_process').exec;

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
    delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var test = tap4nodeunit.test;

var nodeVer = process.versions.node.split('.').map(Number);

if (nodeVer[0] <= 0 && nodeVer[1] <= 8) {
    console.warn('skip test (node <= 0.8)');
} else {
    test('log with rotating file stream will terminate', function (t) {
        exec('node ' +__dirname + '/process-exit.js', {timeout: 1000},
                function (err, stdout, stderr) {
            t.ifError(err);
            t.equal(stdout, 'done\n');
            t.equal(stderr, '');
            t.end();
        });
    });
}
