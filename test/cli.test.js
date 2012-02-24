/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test the `bunyan` CLI.
 */

var path = require('path');
var exec = require('child_process').exec;
var format = require('util').format;
var test = require('tap').test;
var debug = console.warn;

var BUNYAN = path.resolve(__dirname, '../bin/bunyan');

//child = exec('cat *.js bad_file | wc -l',
//  function (error, stdout, stderr) {
//    console.log('stdout: ' + stdout);
//    console.log('stderr: ' + stderr);
//    if (error !== null) {
//      console.log('exec error: ' + error);
//    }
//});

test('--version', function (t) {
  var version = require('../package.json').version;
  exec(BUNYAN + ' --version', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, 'bunyan ' + version + '\n');
    t.end();
  });
});

test('--help', function (t) {
  exec(BUNYAN + ' --help', function (err, stdout, stderr) {
    t.error(err)
    t.ok(stdout.indexOf('Options:') !== -1);
    t.end();
  });
});

test('-h', function (t) {
  exec(BUNYAN + ' -h', function (err, stdout, stderr) {
    t.error(err)
    t.ok(stdout.indexOf('Options:') !== -1);
    t.end();
  });
});

test('--bogus', function (t) {
  exec(BUNYAN + ' --bogus', function (err, stdout, stderr) {
    t.ok(err, 'should error out')
    t.equal(err.code, 1, '... with exit code 1')
    t.end();
  });
});

test('simple.log', function (t) {
  exec(BUNYAN + ' corpus/simple.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message\n');
    t.end();
  });
});
test('cat simple.log', function (t) {
  exec(format('cat corpus/simple.log | %s', BUNYAN),
    function (err, stdout, stderr) {
      t.error(err)
      t.equal(stdout, '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message\n');
      t.end();
    }
  );
});
test('simple.log with color', function (t) {
  exec(BUNYAN + ' --color corpus/simple.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: myservice/123 on example.com: \u001b[36mMy message\u001b[39m\n');
    t.end();
  });
});

test('extrafield.log', function (t) {
  exec(BUNYAN + ' corpus/extrafield.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message (extra=field)\n');
    t.end();
  });
});
test('extrafield.log with color', function (t) {
  exec(BUNYAN + ' --color corpus/extrafield.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: myservice/123 on example.com: \u001b[36mMy message\u001b[39m\u001b[90m (extra=field)\u001b[39m\n');
    t.end();
  });
});

test('bogus.log', function (t) {
  exec(BUNYAN + ' corpus/bogus.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, 'not a JSON line\n{"hi": "there"}\n');
    t.end();
  });
});

test('bogus.log -j', function (t) {
  exec(BUNYAN + ' -j corpus/bogus.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout, 'not a JSON line\n{\n  "hi": "there"\n}\n');
    t.end();
  });
});

test('all.log', function (t) {
  exec(BUNYAN + ' corpus/all.log', function (err, stdout, stderr) {
    // Just make sure don't blow up on this.
    t.error(err)
    t.end();
  });
});

test('simple.log doesnotexist1.log doesnotexist2.log', function (t) {
  exec(BUNYAN + ' corpus/simple.log doesnotexist1.log doesnotexist2.log',
    function (err, stdout, stderr) {
      t.ok(err)
      t.equal(err.code, 2)
      t.equal(stdout, '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message\n');
      t.equal(stderr, "bunyan: ENOENT, no such file or directory 'doesnotexist1.log'\nbunyan: ENOENT, no such file or directory 'doesnotexist2.log'\n");
      t.end();
    }
  );
});
