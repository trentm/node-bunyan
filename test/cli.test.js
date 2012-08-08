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
    t.equal(stdout,
      '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
      + 'My message\n');
    t.end();
  });
});
test('cat simple.log', function (t) {
  exec(format('cat corpus/simple.log | %s', BUNYAN),
    function (err, stdout, stderr) {
      t.error(err)
      t.equal(stdout,
        '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
        + 'My message\n');
      t.end();
    }
  );
});
test('simple.log with color', function (t) {
  exec(BUNYAN + ' --color corpus/simple.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout,
      '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: myservice/123 '
      + 'on example.com: \u001b[36mMy message\u001b[39m\n');
    t.end();
  });
});

test('extrafield.log', function (t) {
  exec(BUNYAN + ' corpus/extrafield.log', function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout,
      '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
      + 'My message (extra=field)\n');
    t.end();
  });
});
test('extrafield.log with color', function (t) {
  exec(BUNYAN + ' --color corpus/extrafield.log',
       function (err, stdout, stderr) {
    t.error(err)
    t.equal(stdout,
      '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: myservice/123 '
      + 'on example.com: \u001b[36mMy message\u001b[39m'
      + '\u001b[90m (extra=field)\u001b[39m\n');
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
      t.equal(stdout,
        '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
        + 'My message\n');
      // Note: node v0.6.10:
      //   ENOENT, no such file or directory 'asdf.log'
      // but node v0.6.14:
      //   ENOENT, open 'asdf.log'
      // Somewhat annoying change.
      t.equal(stderr,
        'bunyan: ENOENT, open \'doesnotexist1.log\'\nbunyan: ENOENT, '
        + 'open \'doesnotexist2.log\'\n');
      t.end();
    }
  );
});

test('multiple logs', function (t) {
  exec(BUNYAN + ' corpus/log1.log corpus/log2.log',
      function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, [
      '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T16:58:55.586Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:01:49.339Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:02:47.404Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:57.404Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:08:01.105Z]  INFO: agent2/76156 on headnode: message\n',
    ].join(''));
    t.end();
  });
});

test('log1.log.gz', function (t) {
  exec(BUNYAN + ' corpus/log1.log.gz', function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, [
      '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
    ].join(''));
    t.end();
  });
});

test('mixed text and gzip logs', function (t) {
  exec(BUNYAN + ' corpus/log1.log.gz corpus/log2.log',
      function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, [
      '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T16:58:55.586Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:01:49.339Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:02:47.404Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
      '[2012-05-08T17:02:57.404Z]  INFO: agent2/73267 on headnode: message\n',
      '[2012-05-08T17:08:01.105Z]  INFO: agent2/76156 on headnode: message\n',
    ].join(''));
    t.end();
  });
});

test('--level 40', function (t) {
  expect = [
    '# levels\n',
    '[2012-02-08T22:56:53.856Z]  WARN: myservice/123 on example.com: My message\n',
    '[2012-02-08T22:56:54.856Z] ERROR: myservice/123 on example.com: My message\n',
    '[2012-02-08T22:56:55.856Z] LVL55: myservice/123 on example.com: My message\n',
    '[2012-02-08T22:56:56.856Z] FATAL: myservice/123 on example.com: My message\n',
    '\n',
    '# extra fields\n',
    '\n',
    '# bogus\n',
    'not a JSON line\n',
    '{"hi": "there"}\n'
  ].join('');
  exec(BUNYAN + ' -l 40 corpus/all.log', function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, expect);
    t.end();
    exec(BUNYAN + ' --level 40 corpus/all.log', function (err, stdout, stderr) {
      t.error(err);
      t.equal(stdout, expect);
      t.end();
    });
  });
});

test('--condition "level === 10 && pid === 123"', function (t) {
  var expect = [
    '# levels\n',
    '[2012-02-08T22:56:50.856Z] TRACE: myservice/123 on example.com: My message\n',
    '\n',
    '# extra fields\n',
    '\n',
    '# bogus\n',
    'not a JSON line\n',
    '{"hi": "there"}\n'
  ].join('');
  exec(BUNYAN + ' -c "level === 10 && pid === 123" corpus/all.log',
       function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, expect);
    t.end();
    exec(BUNYAN + ' --condition "level === 10 && pid === 123" corpus/all.log',
         function (err, stdout, stderr) {
      t.error(err);
      t.equal(stdout, expect);
      t.end();
    });
  });
});

// multiple
// not sure if this is a bug or a feature.  let's call it a feature!
test('multiple --conditions', function (t) {
  var expect = [
    '# levels\n',
    '[2012-02-08T22:56:53.856Z]  WARN: myservice/1 on example.com: My message\n',
    '\n',
    '# extra fields\n',
    '\n',
    '# bogus\n',
    'not a JSON line\n',
    '{"hi": "there"}\n'
  ].join('');
  t.end();
  exec(BUNYAN + ' test/corpus/all.log ' +
       '-c "if (level === 40) pid = 1; true" ' +
       '-c "pid === 1"', function (err, stdout, stderr) {
    t.error(err);
    t.equal(stdout, expect);
    t.end();
  });
});
