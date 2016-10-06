/*
 * Copyright 2016 Trent Mick
 *
 * If available, test dtrace support.
 */

var spawn = require('child_process').spawn;
var format = require('util').format;

var bunyan = require('../lib/bunyan');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


// Determine if we can run the dtrace tests.
var dtracePlats = ['sunos', 'darwin', 'freebsd'];
var runDtraceTests = true;
try {
    require('dtrace-provider');
} catch (e) {
    console.log('# skip dtrace tests: no dtrace-provider module');
    runDtraceTests = false;
}
if (!runDtraceTests) {
    /* pass through */
} else if (dtracePlats.indexOf(process.platform) === -1) {
    console.log('# skip dtrace tests: not on a platform with dtrace');
    runDtraceTests = false;
} else if (process.env.SKIP_DTRACE) {
    console.log('# skip dtrace tests: SKIP_DTRACE envvar set');
    runDtraceTests = false;
} else if (process.getgid() !== 0) {
    console.log('# skip dtrace tests: gid is not 0, run with `sudo`');
    runDtraceTests = false;
}
if (runDtraceTests) {


test('basic dtrace', function (t) {
    var argv = ['dtrace', '-Z', '-x', 'strsize=4k', '-qn',
        'bunyan$target:::log-*{printf("%s", copyinstr(arg0))}',
        '-c', format('node %s/log-some.js', __dirname)];
    var dtrace = spawn(argv[0], argv.slice(1));
    //console.error('ARGV: %j', argv);
    //console.error('CMD: %s', argv.join(' '));

    var traces = [];
    dtrace.stdout.on('data', function (data) {
        //console.error('DTRACE STDOUT:', data.toString());
        traces.push(data.toString());
    });
    dtrace.stderr.on('data', function (data) {
        console.error('DTRACE STDERR:', data.toString());
    });
    dtrace.on('exit', function (code) {
        t.notOk(code, 'dtrace exited cleanly');
        traces = traces.join('').split('\n')
            .filter(function (t) { return t.trim().length })
            .map(function (t) { return JSON.parse(t) });
        t.equal(traces.length, 2, 'got 2 log records');
        if (traces.length) {
            t.equal(traces[0].level, bunyan.DEBUG);
            t.equal(traces[0].foo, 'bar');
            t.equal(traces[1].level, bunyan.TRACE);
            t.equal(traces[1].msg, 'hi at trace');
        }
        t.end();
    });
});


/*
 * Run a logger that logs a couple records every second.
 * Then run `bunyan -p PID` to capture.
 * Let those run for a few seconds to ensure dtrace has time to attach and
 * capture something.
 */
test('bunyan -p', function (t) {
    var p = spawn('node', [__dirname + '/log-some-loop.js']);

    var bunyanP = spawn('node',
        [__dirname + '/../bin/bunyan', '-p', String(p.pid), '-0']);
    var traces = [];
    bunyanP.stdout.on('data', function (data) {
        //console.error('BUNYAN -P STDOUT:', data.toString());
        traces.push(data.toString());
    });
    bunyanP.stderr.on('data', function (data) {
        console.error('BUNYAN -P STDERR:', data.toString());
    });
    bunyanP.on('exit', function (code) {
        traces = traces.join('').split('\n')
            .filter(function (t) { return t.trim().length })
            .map(function (t) { return JSON.parse(t) });
        t.ok(traces.length >= 3, 'got >=3 log records: ' + traces.length);
        if (traces.length >= 3) {
            if (traces[0].level !== bunyan.DEBUG) {
                traces.shift();
            }
            t.equal(traces[0].level, bunyan.DEBUG);
            t.equal(traces[0].foo, 'bar');
            t.equal(traces[1].level, bunyan.TRACE);
            t.equal(traces[1].msg, 'hi at trace');
        }
        t.end();
    });

    // Give it a few seconds to ensure we get some traces.
    setTimeout(function () {
        p.kill();
        bunyanP.kill();
    }, 5000);
});


} /* end of `if (runDtraceTests)` */
