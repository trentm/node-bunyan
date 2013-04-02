/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test the `bunyan` CLI.
 */

var path = require('path');
var exec = require('child_process').exec;
var _ = require('util').format;
var debug = console.warn;

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;



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
        t.ifError(err)
        t.equal(stdout, 'bunyan ' + version + '\n');
        t.end();
    });
});

test('--help', function (t) {
    exec(BUNYAN + ' --help', function (err, stdout, stderr) {
        t.ifError(err)
        t.ok(stdout.indexOf('General options:') !== -1);
        t.end();
    });
});

test('-h', function (t) {
    exec(BUNYAN + ' -h', function (err, stdout, stderr) {
        t.ifError(err)
        t.ok(stdout.indexOf('General options:') !== -1);
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
    exec(_('%s %s/corpus/simple.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout,
            '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
            + 'My message\n');
        t.end();
    });
});
test('cat simple.log', function (t) {
    exec(_('cat %s/corpus/simple.log | %s', __dirname, BUNYAN),
        function (err, stdout, stderr) {
            t.ifError(err)
            t.equal(stdout,
                /* JSSTYLED */
                '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message\n');
            t.end();
        }
    );
});
test('simple.log with color', function (t) {
    exec(_('%s --color %s/corpus/simple.log', BUNYAN, __dirname),
        function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout,
            /* JSSTYLED */
            '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: myservice/123 on example.com: \u001b[36mMy message\u001b[39m\n\u001b[0m');
        t.end();
    });
});

test('extrafield.log', function (t) {
    exec(_('%s %s/corpus/extrafield.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout,
            '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
            + 'My message (extra=field)\n');
        t.end();
    });
});
test('extrafield.log with color', function (t) {
    exec(_('%s --color %s/corpus/extrafield.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout,
            '[2012-02-08T22:56:52.856Z] \u001b[36m INFO\u001b[39m: '
            + 'myservice/123 '
            + 'on example.com: \u001b[36mMy message\u001b[39m'
            + '\u001b[90m (extra=field)\u001b[39m\n\u001b[0m');
        t.end();
    });
});

test('bogus.log', function (t) {
    exec(_('%s %s/corpus/bogus.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, 'not a JSON line\n{"hi": "there"}\n');
        t.end();
    });
});

test('bogus.log -j', function (t) {
    exec(_('%s -j %s/corpus/bogus.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err)
        t.equal(stdout, 'not a JSON line\n{"hi": "there"}\n');
        t.end();
    });
});

test('all.log', function (t) {
    exec(_('%s %s/corpus/all.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        // Just make sure don't blow up on this.
        t.ifError(err)
        t.end();
    });
});

test('simple.log doesnotexist1.log doesnotexist2.log', function (t) {
    exec(_('%s %s/corpus/simple.log doesnotexist1.log doesnotexist2.log',
                 BUNYAN, __dirname),
        function (err, stdout, stderr) {
            t.ok(err)
            t.equal(err.code, 2)
            t.equal(stdout,
                /* JSSTYLED */
                '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: My message\n');
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
    var cmd = _('%s %s/corpus/log1.log %s/corpus/log2.log',
        BUNYAN, __dirname, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, [
            /* BEGIN JSSTYLED */
            '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T16:58:55.586Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:01:49.339Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:02:47.404Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:57.404Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:08:01.105Z]  INFO: agent2/76156 on headnode: message\n',
            /* END JSSTYLED */
        ].join(''));
        t.end();
    });
});

test('multiple logs, bunyan format', function (t) {
    var cmd = _('%s -o bunyan %s/corpus/log1.log %s/corpus/log2.log',
        BUNYAN, __dirname, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, [
            /* BEGIN JSSTYLED */
            '{"name":"agent1","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T16:57:55.586Z","v":0}',
            '{"name":"agent2","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T16:58:55.586Z","v":0}',
            '{"name":"agent2","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:01:49.339Z","v":0}',
            '{"name":"agent2","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:02:47.404Z","v":0}',
            '{"name":"agent1","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:02:49.339Z","v":0}',
            '{"name":"agent1","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:02:49.404Z","v":0}',
            '{"name":"agent1","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:02:49.404Z","v":0}',
            '{"name":"agent2","pid":73267,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:02:57.404Z","v":0}',
            '{"name":"agent2","pid":76156,"hostname":"headnode","level":30,"msg":"message","time":"2012-05-08T17:08:01.105Z","v":0}',
            ''
            /* END JSSTYLED */
        ].join('\n'));
        t.end();
    });
});

test('log1.log.gz', function (t) {
    exec(_('%s %s/corpus/log1.log.gz', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, [
            /* BEGIN JSSTYLED */
            '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            /* END JSSTYLED */
        ].join(''));
        t.end();
    });
});

test('mixed text and gzip logs', function (t) {
    var cmd = _('%s %s/corpus/log1.log.gz %s/corpus/log2.log',
        BUNYAN, __dirname, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, [
            /* BEGIN JSSTYLED */
            '[2012-05-08T16:57:55.586Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T16:58:55.586Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:01:49.339Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:02:47.404Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.339Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:49.404Z]  INFO: agent1/73267 on headnode: message\n',
            '[2012-05-08T17:02:57.404Z]  INFO: agent2/73267 on headnode: message\n',
            '[2012-05-08T17:08:01.105Z]  INFO: agent2/76156 on headnode: message\n',
            /* END JSSTYLED */
        ].join(''));
        t.end();
    });
});

test('--level 40', function (t) {
    expect = [
        /* BEGIN JSSTYLED */
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
        /* END JSSTYLED */
    ].join('');
    exec(_('%s -l 40 %s/corpus/all.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        exec(_('%s --level 40 %s/corpus/all.log', BUNYAN, __dirname),
                 function (err, stdout, stderr) {
            t.ifError(err);
            t.equal(stdout, expect);
            t.end();
        });
    });
});

test('--condition "level === 10 && pid === 123"', function (t) {
    var expect = [
        '# levels\n',
        /* JSSTYLED */
        '[2012-02-08T22:56:50.856Z] TRACE: myservice/123 on example.com: My message\n',
        '\n',
        '# extra fields\n',
        '\n',
        '# bogus\n',
        'not a JSON line\n',
        '{"hi": "there"}\n'
    ].join('');
    var cmd = _('%s -c "level === 10 && pid === 123" %s/corpus/all.log',
        BUNYAN, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        var cmd = _(
            '%s --condition "level === 10 && pid === 123" %s/corpus/all.log',
            BUNYAN, __dirname);
        exec(cmd, function (err, stdout, stderr) {
            t.ifError(err);
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
        /* JSSTYLED */
        '[2012-02-08T22:56:53.856Z]  WARN: myservice/1 on example.com: My message\n',
        '\n',
        '# extra fields\n',
        '\n',
        '# bogus\n',
        'not a JSON line\n',
        '{"hi": "there"}\n'
    ].join('');
    exec(_('%s %s/corpus/all.log ' +
                 '-c "if (level === 40) pid = 1; true" ' +
                 '-c "pid === 1"', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});

// https://github.com/trentm/node-bunyan/issues/30
//
// One of the records in corpus/withreq.log has a 'req'
// field with no 'headers'. Ditto for the 'res' field.
test('robust req handling', function (t) {
    var expect = [
        /* BEGIN JSSTYLED */
        '[2012-08-08T10:25:47.636Z] DEBUG: amon-master/12859 on 9724a190-27b6-4fd8-830b-a574f839c67d: headAgentProbes respond (req_id=cce79d15-ffc2-487c-a4e4-e940bdaac31e, route=HeadAgentProbes, contentMD5=11FxOYiYfpMxmANj4kGJzg==)',
        '[2012-08-08T10:25:47.637Z]  INFO: amon-master/12859 on 9724a190-27b6-4fd8-830b-a574f839c67d: HeadAgentProbes handled: 200 (req_id=cce79d15-ffc2-487c-a4e4-e940bdaac31e, audit=true, remoteAddress=10.2.207.2, remotePort=50394, latency=3, secure=false, _audit=true, req.version=*)',
        '    HEAD /agentprobes?agent=ccf92af9-0b24-46b6-ab60-65095fdd3037 HTTP/1.1',
        '    accept: application/json',
        '    content-type: application/json',
        '    host: 10.2.207.16',
        '    connection: keep-alive',
        '    --',
        '    HTTP/1.1 200 OK',
        '    content-md5: 11FxOYiYfpMxmANj4kGJzg==',
        '    access-control-allow-origin: *',
        '    access-control-allow-headers: Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
        '    access-control-allow-methods: HEAD',
        '    access-control-expose-headers: X-Api-Version, X-Request-Id, X-Response-Time',
        '    connection: Keep-Alive',
        '    date: Wed, 08 Aug 2012 10:25:47 GMT',
        '    server: Amon Master/1.0.0',
        '    x-request-id: cce79d15-ffc2-487c-a4e4-e940bdaac31e',
        '    x-response-time: 3',
        '    --',
        '    route: {',
        '      "name": "HeadAgentProbes",',
        '      "version": false',
        '    }',
        '[2012-08-08T10:25:47.637Z]  INFO: amon-master/12859 on 9724a190-27b6-4fd8-830b-a574f839c67d: HeadAgentProbes handled: 200 (req_id=cce79d15-ffc2-487c-a4e4-e940bdaac31e, audit=true, remoteAddress=10.2.207.2, remotePort=50394, latency=3, secure=false, _audit=true, req.version=*)',
        '    HEAD /agentprobes?agent=ccf92af9-0b24-46b6-ab60-65095fdd3037 HTTP/1.1',
        '    --',
        '    route: {',
        '      "name": "HeadAgentProbes",',
        '      "version": false',
        '    }'
        /* END JSSTYLED */
    ].join('\n') + '\n';
    exec(_('%s %s/corpus/withreq.log', BUNYAN, __dirname),
             function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});
