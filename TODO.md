- "all" or "off" levels? log4j? logging.py?
  logging.py has NOTSET === 0. I think that is only needed/used for
  multi-level hierarchical effective level.
- move custom keys out to 'x' ? What about req, res? Compat issues there?
  Bunyan CLI would have to deal with both for a while. Just a change in
  record.v from 0 to 1.
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
- a "rolling-file" stream: but specifically by time, e.g. hourly. (MarkC
  requested)
- split out `bunyan` cli to a "bunyan" or "bunyan-reader" or "node-bunyan-reader"
  as the basis for tools to consume bunyan logs. It can grow indep of node-bunyan
  for generating the logs.
  It would take a Bunyan log record object and be expected to emit it.

        node-bunyan-reader
            .createReadStream(path, [options]) ?

- document "well-known" keys from bunyan CLI p.o.v.. Add "client_req".
- bunyan tool: built in less usage (a la git?) so that I don't have to
  go through this: `bunyan --color master.log  | less -R`
- want `bunyan -f foo.log` a la `tail -f`


# someday/maybe

- More `bunyan` output formats and filtering features.
- Think about a bunyan dashboard that supports organizing and viewing logs
  from multiple hosts and services.
- Syslog support.
- A vim plugin (a la http://vim.cybermirror.org/runtime/autoload/zip.vim ?) to
  allow browsing (read-only) a bunyan log in rendered form.
- Some speed comparisons with others to get a feel for Bunyan's speed.
- remove "rm -rf tmp" when this fixed: <https://github.com/isaacs/npm/issues/2144>
- what about promoting 'latency' field and making that easier?
- `log.close` to close streams and shutdown and `this.closed`
  process.on('exit', log.close)
- bunyan cli: -c COND args a la json
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/EnhancedPatternLayout.html)
  Custom log formats (in config file? in '-f' arg) using printf or hogan.js
  or whatever. Dap wants field width control for lining up. Hogan.js is
  probably overkill for this.
- syslog: Josh uses https://github.com/chrisdew/node-syslog
    streams: [
        ...
        {
            level: "warn",
            type: "syslog",
            syslog_facility: "LOG_LOCAL1", // one of the syslog facility defines
            syslog_pid: true,   // syslog logopt "LOG_PID"
            syslog_cons: false  // syslog logopt "LOG_CONS"
        }
- bunyan "compact" or "light", '-l'? Something like. Or pehaps this (with
  color) could be the default, with '-l' for long output.
    13:51.340 [src.js:20#Wuzzle.woos] WARN: This wuzzle is woosey.
- get Mark to show me dtrace provider stuff and consider adding for
  logging, if helpful.
- add option to "streams" to take the raw object, not serialized.
  It would be a good hook for people with custom needs that Bunyan doesn't
  care about (e.g. http://loggly.com/ or hook.io or whatever).
- serializer `req_id` that pulls it from req? `log.info({req_id: req}, "hi")`
- serializer support:
    - restify-server.js example -> restifyReq ? or have `req` detect that.
      That is nicer for the "use all standard ones". *Does* restify req
      have anything special?
    - differential HTTP *client* req/res with *server* req/res.
- statsd stream? http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
  Think about it.
