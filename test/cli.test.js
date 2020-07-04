/*
 * Copyright 2020 Trent Mick
 *
 * Test the `bunyan` CLI.
 */

var p = console.warn;
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');
var _ = require('util').format;
var test = require('tap').test;
var vasync = require('vasync');


// ---- globals

var BUNYAN = path.resolve(__dirname, '../bin/bunyan');
if (os.platform() === 'win32') {
    BUNYAN = process.execPath + ' ' + BUNYAN;
}


// ---- support stuff

/**
 * Copies over all keys in `from` to `to`, or
 * to a new object if `to` is not given.
 */
function objCopy(from, to) {
    if (to === undefined) {
        to = {};
    }
    for (var k in from) {
        to[k] = from[k];
    }
    return to;
}


// ---- tests

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

// Test some local/UTC time handling by changing to a known non-UTC timezone
// for some tests.
//
// I don't know how to effectively do this on Windows (at least
// https://stackoverflow.com/questions/2611017 concurs), so we skip these on
// Windows. Help is welcome if you know how to do this on Windows.
test('time TZ tests', {
    skip: os.platform() === 'win32'
        ? 'do not know how to set timezone on Windows' : false
}, function (suite) {
    // A stable 'TZ' for 'local' timezone output.
    tzEnv = objCopy(process.env);
    tzEnv.TZ = 'Pacific/Honolulu';

    test('time: simple.log local long', function (t) {
        exec(_('%s -o long -L %s/corpus/simple.log', BUNYAN, __dirname),
                {env: tzEnv}, function (err, stdout, stderr) {
            t.ifError(err)
            t.equal(stdout,
                // JSSTYLED
                '[2012-02-08T12:56:52.856-10:00]  INFO: myservice/123 on example.com: '
                + 'My message\n');
            t.end();
        });
    });
    test('time: simple.log utc long', function (t) {
        exec(_('%s -o long --time utc %s/corpus/simple.log', BUNYAN, __dirname),
                {env: tzEnv}, function (err, stdout, stderr) {
            t.ifError(err)
            t.equal(stdout,
                // JSSTYLED
                '[2012-02-08T22:56:52.856Z]  INFO: myservice/123 on example.com: '
                + 'My message\n');
            t.end();
        });
    });
    test('time: simple.log local short', function (t) {
        exec(_('%s -o short -L %s/corpus/simple.log', BUNYAN, __dirname),
                {env: tzEnv}, function (err, stdout, stderr) {
            t.ifError(err)
            t.equal(stdout,
                '12:56:52.856  INFO myservice: '
                + 'My message\n');
            t.end();
        });
    });
    test('time: simple.log utc short', function (t) {
        exec(_('%s -o short %s/corpus/simple.log', BUNYAN, __dirname),
                {env: tzEnv}, function (err, stdout, stderr) {
            t.ifError(err)
            t.equal(stdout,
                '22:56:52.856Z  INFO myservice: '
                + 'My message\n');
            t.end();
        });
    });

    suite.end();
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
            + ' (extra=field)\n\u001b[0m');
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
            // io.js 2.2 (at least):
            //   ENOENT: no such file or directory, open 'doesnotexist1.log'
            // in GitHub Actions windows-latest runner:
            //   JSSTYLED
            //   ENOENT: no such file or directory, open 'D:\\a\\node-bunyan\\node-bunyan\\doesnotexist1.log
            var matches = [
                /^bunyan: ENOENT.*?, open '.*?doesnotexist1.log'/m,
                /^bunyan: ENOENT.*?, open '.*?doesnotexist2.log'/m,
            ];
            matches.forEach(function (match) {
                t.ok(match.test(stderr), 'stderr matches ' + match.toString() +
                    ', stderr=' + JSON .stringify(stderr));
            });
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

test('--condition "this.level === 10 && this.pid === 123"', function (t) {
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
    var cmd = _('%s -c "this.level === 10 && this.pid === 123"'
                + ' %s/corpus/all.log', BUNYAN, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        var cmd = _(
            '%s --condition "this.level === 10 && this.pid === 123"'
            + ' %s/corpus/all.log', BUNYAN, __dirname);
        exec(cmd, function (err, stdout, stderr) {
            t.ifError(err);
            t.equal(stdout, expect);
            t.end();
        });
    });
});

test('--condition "this.level === TRACE', function (t) {
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
    var cmd = _('%s -c "this.level === TRACE" %s/corpus/all.log',
        BUNYAN, __dirname);
    exec(cmd, function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});

// multiple
test('multiple --conditions', function (t) {
    var expect = [
        '# levels\n',
        /* JSSTYLED */
        '[2012-02-08T22:56:53.856Z]  WARN: myservice/123 on example.com: My message\n',
        '\n',
        '# extra fields\n',
        '\n',
        '# bogus\n',
        'not a JSON line\n',
        '{"hi": "there"}\n'
    ].join('');
    exec(_('%s %s/corpus/all.log -c "this.level === 40" -c "this.pid === 123"',
            BUNYAN, __dirname), function (err, stdout, stderr) {
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
        '    HTTP/1.1 200 OK',
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

// Some past crashes from issues.
test('should not crash on corpus/old-crashers/*.log', function (t) {
    var oldCrashers = fs.readdirSync(
        path.resolve(__dirname, 'corpus/old-crashers'))
        .filter(function (f) { return f.slice(-4) === '.log'; });
    vasync.forEachPipeline({
        inputs: oldCrashers,
        func: function (logName, next) {
            exec(_('%s %s/corpus/old-crashers/%s', BUNYAN, __dirname, logName),
                    function (err, stdout, stderr) {
                next(err);
            });
        }
    }, function (err, results) {
        t.ifError(err);
        t.end();
    });
});

test('client_req extra newlines, client_res={} (pull #252)', function (t) {
    var expect = [
        /* BEGIN JSSTYLED */
        '[2016-02-10T07:28:40.510Z] TRACE: aclientreq/23280 on danger0.local: request sent',
        '    GET /--ping HTTP/1.1',
        '[2016-02-10T07:28:41.419Z] TRACE: aclientreq/23280 on danger0.local: Response received',
        '    HTTP/1.1 200 OK',
        '    request-id: e8a5a700-cfc7-11e5-a3dc-3b85d20f26ef',
        '    content-type: application/json'
        /* END JSSTYLED */
    ].join('\n') + '\n';
    exec(_('%s %s/corpus/clientreqres.log', BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});

test('should only show nonempty response bodies', function (t) {
    var expect = [
        /* BEGIN JSSTYLED */
        '[2016-02-10T07:28:41.419Z]  INFO: myservice/123 on example.com: UnauthorizedError',
        '    HTTP/1.1 401 Unauthorized',
        '    content-type: text/plain',
        '    date: Sat, 07 Mar 2015 06:58:43 GMT',
        '[2016-02-10T07:28:41.419Z]  INFO: myservice/123 on example.com: hello',
        '    HTTP/1.1 200 OK',
        '    content-type: text/plain',
        '    content-length: 0',
        '    date: Sat, 07 Mar 2015 06:58:43 GMT',
        '    ',
        '    hello',
        '[2016-02-10T07:28:41.419Z]  INFO: myservice/123 on example.com: UnauthorizedError',
        '    HTTP/1.1 401 Unauthorized',
        '    content-type: text/plain',
        '    date: Sat, 07 Mar 2015 06:58:43 GMT'
        /* END JSSTYLED */
    ].join('\n') + '\n';
    exec(_('%s %s/corpus/content-length-0-res.log', BUNYAN, __dirname),
            function (err, stdout, stderr) {
        t.ifError(err);
        t.equal(stdout, expect);
        t.end();
    });
});
