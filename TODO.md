- serializer support:
    - Ask mark what else to put in `req`
    - Ask mark what to put in `res`
    - restify-server.js example -> restifyReq ? or have `req` detect that.
      That is nicer for the "use all standard ones". *Does* restify req
      have anything special?
    - Add `err`.
    - `request_id` that pulls it from req? `log.info({request_id: req}, "hi")`
- `log.close` to close streams and shutdown and `this.closed`
- expand set of fields: from dap
    time, hostname
    <https://github.com/Graylog2/graylog2-docs/wiki/GELF>
    <http://journal.paul.querna.org/articles/2011/12/26/log-for-machines-in-json/>
    require: facility and hostname
    line/file: possible to get quickly with v8? Yunong asked.
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/EnhancedPatternLayout.html)
  Custom log formats (in config file? in '-f' arg) using printf or hogan.js
  or whatever. Dap wants field width control for lining up. Hogan.js is
  probably overkill for this.
- bunyan cli: filter args a la json
- bunyan cli: -c COND args a la json
- mark wants pretty output for debug output
    - not sure if 'bunyan --pretty' or whatever would suffice
- ringBuffer stream
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
- Logger.setLevel()? How to change level for a given stream. Default all,
  else, give an index... or type ... or support stream "names".
- Logger.set to mutate config or `this.fields`
- Logger.del to remove a field
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


# someday/maybe

- custom "emitter" feature: an additional "emitter" param on the "streams"
  objects: <https://github.com/trentm/node-bunyan/blob/master/examples/multi.js#L4-13>
  which you'd give instead of "stream" (a node "Writable Stream").
  It would take a Bunyan log record object and be expected to emit it.
  It would be a good hook for people with custom needs that Bunyan doesn't
  care about (e.g. log.ly or hook.io or whatever).
