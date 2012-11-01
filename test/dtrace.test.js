/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * If available, test dtrace support.
 */

var spawn = require('child_process').spawn;
var format = require('util').format;

var test = require('tap').test;
var bunyan = require('../lib/bunyan');


// Determine if we can run the dtrace tests.
var dtracePlats = ['sunos', 'darwin', 'freebsd'];
var runDtraceTests = true;
try {
  require('dtrace-provider')
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


test('basic', function (t) {
  var log = bunyan.createLogger({name: 'basic'}); // at default 'info' level

  // Should be '%%s' in that `format` frankly, but node *0.6* doesn't see
  // it that way. Node *0.8* has fixed '%%' handling.
  var dtrace = spawn('dtrace', ['-x', 'strsize=4k', '-qn',
    format('bunyan%d:::log-*{printf("%s", copyinstr(arg0))}', process.pid)]);
  var traces = [];
  dtrace.stdout.on('data', function (data) {
    traces.push(data.toString());
  });
  dtrace.stderr.on('data', function (data) {
    console.error(data.toString());
  });
  dtrace.on('exit', function (code) {
    if (code) {
      console.log("dtrace exited non-zero:", code);
    }
  });

  setTimeout(function () {
    log.debug({basic: true}, 'hi at debug');
    log.trace({basic: true}, 'hi at trace');

    setTimeout(function () {
      dtrace.kill('SIGTERM');

      traces = traces.join('').split('\n')
        .filter(function (t) { return t.trim().length })
        .map(function (t) { return JSON.parse(t) });
      t.equal(traces.length, 2);
      t.equal(traces[0].pid, process.pid);
      t.equal(traces[0].level, bunyan.DEBUG);
      t.equal(traces[1].basic, true);
      t.end();
    }, 1000);
  }, 1000); // Give dtrace some time to startup. How much?
});



} /* end of `if (runDtraceTests)` */
