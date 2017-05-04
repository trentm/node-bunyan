# v2

- Exit handling:

    - make a ticket with notes from "bunyan CLI exit handling" section below
    - resolve it with the uncommited changes here

- figure out how to 'make cutarelease' for 2.x but tag as beta
- comment/grokking of bunyan.js flushing issues at
  https://github.com/trentm/node-bunyan/issues/37 would be nice. Even if just a
  link to exeunt and some examples. Wiki page?
    - respond to Qs here: https://github.com/trentm/node-bunyan/issues/37#issuecomment-282933502
- consider whether to backport the exit handling work to 1.x???
- `createLogger(<config-and-fields>, <fields>)` changes (#460)
    - see section below
- the dtrace-provider thing (#487)
    TODO: answer Cody email
- https://github.com/trentm/node-bunyan/issues/398 if easy, perhaps on 1.x
  as well
- use package.json version for VERSION
- use deps
    - dashdash
    - assert-plus?
    - verror?
- break out to multiple files
    - want to work through PRs before that, so don't just break them all
- TODO: a quick pass through tickets and pulls for other things to include
- get ticket refs for the above, if any
- formatters: read up again on `glp master..1.x`
- support for customer formatters
    - for the CLI as well? How? ~/.bunyanrc?
- if doing ~/.bunyanrc, then consider color schemes


# bunyan CLI exit handling

It has some problems currently.

One basic problem is that our stdout.on('error') handler can call into
drainStdoutAndExit multiple times, leading to the multiple Event Emitters
leak warning, and with a pager we are waiting for the pager to exit.
Why doesn't the pager exit on ^C? Is that a less thing? Perhaps due to our
LESS opts?



Setting up a file to work with:

```javascript
$ cat lots.js
var bunyan = require('./')
var log = bunyan.createLogger({
    name: 'lots',
    streams: [
        {
            type: 'file',
            path: './lots.log'
        }
    ]
});

N = Math.pow(2, 16);
for (var i = N; i >= 0; i--) {
    log.info({i: i}, 'another record');
}

$ node lots.js
```

## Issue 1: EventEmitter mem leak

```
$ node --version
v4.8.0
$ ./bin/bunyan lots.log | cat
[2017-04-05T01:47:15.899Z]  INFO: lots/53218 on danger0.local: another record (i=65536)
[2017-04-05T01:47:15.901Z]  INFO: lots/53218 on danger0.local: another record (i=65535)
...
^C       # ^C quickly before it is done writing rendered logs
...
[2017-04-05T01:47:16.023Z]  INFO: lots/53218 on danger0.local: another record (i=57351)
[2017-04-05T01:47:16.023Z]  INFO: lots/53218
^C(node) warning: possible EventEmitter memory leak detected. 11 drain listeners added. Use emitter.setMaxListeners() to increase limit.
Trace
    at Socket.addListener (events.js:239:17)
    at Socket.Readable.on (_stream_readable.js:680:33)
    at drainStdoutAndExit (/Users/trentm/tm/node-bunyan/bin/bunyan:1116:12)
    at Socket.<anonymous> (/Users/trentm/tm/node-bunyan/bin/bunyan:1597:13)
    at emitOne (events.js:77:13)
    at Socket.emit (events.js:169:7)
    at onwriteError (_stream_writable.js:313:10)
    at onwrite (_stream_writable.js:331:5)
    at WritableState.onwrite (_stream_writable.js:90:5)
    at fireErrorCallbacks (net.js:457:13)
```

## Issue 2: "write after end" infinite loop with ^C in pager

Mac. Node v4.8.0. Happens with node 0.10 as well.

```
$ ./bin/bunyan lots.log
[2017-04-05T01:47:15.899Z]  INFO: lots/53218 on danger0.local: another record (i=65536)
[2017-04-05T01:47:15.901Z]  INFO: lots/53218 on danger0.local: another record (i=65535)
[2017-04-05T01:47:15.901Z]  INFO: lots/53218 on danger0.local: another record (i=65534)
...
^C
...
[2017-04-05T01:47:15.909Z]  INFO: lots/53218 on danger0.local: another record (i=65490)
:[Error: write after end]
[Error: write after end]
[Error: write after end]
[Error: write after end]
[Error: write after end]
(node) warning: possible EventEmitter memory leak detected. 11 drain listeners added. Use emitter.setMaxListeners() to increase limit.
Trace
    at Socket.addListener (events.js:239:17)
    at Socket.Readable.on (_stream_readable.js:680:33)
    at drainStdoutAndExit (/Users/trentm/tm/node-bunyan/bin/bunyan:1116:12)
    at Socket.<anonymous> (/Users/trentm/tm/node-bunyan/bin/bunyan:1600:13)
    at emitOne (events.js:77:13)
    at Socket.emit (events.js:169:7)
    at writeAfterEnd (_stream_writable.js:169:10)
    at Socket.Writable.write (_stream_writable.js:212:5)
    at Socket.write (net.js:645:40)
    at emit (/Users/trentm/tm/node-bunyan/bin/bunyan:1097:32)
[Error: write after end]
[Error: write after end]
[Error: write after end]
[Error: write after end]
...                         # this goes forever until 'q' to quit pager
```

With bunyan's internal `_DEBUG`:

```
...
[2017-04-05T01:47:15.909Z]  INFO: lots/53218 on danger0.local: another record (i=65491)
[2017-04-05T01:47:15.909Z]  INFO: lots/53218 on danger0.local: another record (i=65490)
:(bunyan: cleanupAndExit)
(stdout error event: Error: write after end)
[Error: write after end]
(drainStdoutAndExit(1))
(stdout error event: Error: write after end)
[Error: write after end]
(drainStdoutAndExit(1))
(stdout error event: Error: write after end)
[Error: write after end]
(drainStdoutAndExit(1))
(stdout error event: Error: write after end)
[Error: write after end]
...
(drainStdoutAndExit(1))
(stdout error event: Error: write EPIPE)
(drainStdoutAndExit(0))
(bunyan: pager exit)
(bunyan: pager exit -> process.exit(1))
```



# changes to ctor and log.child to separate fields from config

<https://github.com/trentm/node-bunyan/issues/460>

Current:

    createLogger(<config-and-fields>)
    log.child(<config-and-fields>, <just-fields-bool>)

Could be:

    createLogger(<config-and-fields>, <fields>)
    log.child(<config-and-fields>, <fields>)
        # Still support: log.child(<config-and-fields>, <just-fields-bool>)

Pros: Compat issues are minimal: a change is only required if there is a
collision with used field and a new config var name.
Cons: A *slight* con is that my guess is the common usage of child is
`log.child(<fields>)`, so the more future-proof common usage becomes:

    log.child(null, <fields>)

That's not too bad. It is clearer at least than:

    log.child(<fields>, true)

TODO:

- is there a ticket for this work already?  #460
- make the change
- do a migration guide? i.e. provide the grep commands to find all
  possible calls to inspect. E.g. if don't have `rg logUndefined` in your
  code, then you are fine. And one time future-proofing via changing
  to fields in the *second* arg.
- list of issues/pulls that wanted to add new config fields


# higher prio

- man page for the bunyan CLI (refer to it in the readme)
    - perhaps wait for a bunyan new version with deps, and use dashdash
      with a (vapour) man page generator


# docs

- document log.addStream() and log.addSerializers()


# someday/maybe

- 2.0 (?) with `v: 1` in log records. Fwd/bwd compat in `bunyan` CLI
- `tail -f`-like support
- full-on docs
- better examples/
- better coloring
- look at pino (bunyan style, perf benefits)
- would be exciting to have bunyan support in http://lnav.org/ if that
  made sense
- "template" support for 'rotating-file' stream to get dated rolled files
- "all" or "off" levels? log4j? logging.py?
  logging.py has NOTSET === 0. I think that is only needed/used for
  multi-level hierarchical effective level.
- buffered writes to increase speed:
    - I'd start with a tools/timeoutput.js for some numbers to compare
      before/after. Sustained high output to a file.
    - perhaps this would be a "buffered: true" option on the stream object
    - then wrap the "stream" with a local class that handles the buffering
    - to finish this, need the 'log.close' and `process.on('exit', ...)`
      work that Trent has started.
- "canWrite" handling for full streams. Need to buffer a la log4js
- test file log with logadm rotation: does it handle that?
- test suite:
    - test for a cloned logger double-`stream.end()` causing problems.
      Perhaps the "closeOnExit" for existing streams should be false for
      clones.
    - test that a `log.clone(...)` adding a new field matching a serializer
      works *and* that an existing field in the parent is not *re-serialized*.
- split out `bunyan` cli to a "bunyan" or "bunyan-reader" or "node-bunyan-reader"
  as the basis for tools to consume bunyan logs. It can grow indep of node-bunyan
  for generating the logs.
  It would take a Bunyan log record object and be expected to emit it.

        node-bunyan-reader
            .createReadStream(path, [options]) ?

- coloring bug: in less the indented extra info lines only have the first
  line colored. Do we need the ANSI char on *each* line? That'll be
  slower.
- document "well-known" keys from bunyan CLI p.o.v.. Add "client_req".
- More `bunyan` output formats and filtering features.
- Think about a bunyan dashboard that supports organizing and viewing logs
  from multiple hosts and services.
- doc the restify RequestCaptureStream usage of RingBuffer. Great example.
- A vim plugin (a la http://vim.cybermirror.org/runtime/autoload/zip.vim ?) to
  allow browsing (read-only) a bunyan log in rendered form.
- Some speed comparisons with others to get a feel for Bunyan's speed.
- what about promoting 'latency' field and making that easier?
- `log.close` to close streams and shutdown and `this.closed`
  process.on('exit', log.close)
  -> 'end' for the name
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/EnhancedPatternLayout.html)
  Custom log formats (in config file? in '-f' arg) using printf or hogan.js
  or whatever. Dap wants field width control for lining up. Hogan.js is
  probably overkill for this.
- loggly example using raw streams, hook.io?, whatever.
- serializer support:
    - restify-server.js example -> restifyReq ? or have `req` detect that.
      That is nicer for the "use all standard ones". *Does* restify req
      have anything special?
    - differential HTTP *client* req/res with *server* req/res.
- statsd stream? http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
  Think about it.
- web ui. Ideas: http://googlecloudplatform.blogspot.ca/2014/04/a-new-logs-viewer-for-google-cloud.html
