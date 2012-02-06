- Logger.setLevel()? How to change level for a given stream. Default all,
  else, give an index... or type ... or support stream "names". Some positives
  to stream names.
- service -> name
- 10, 20,...
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/EnhancedPatternLayout.html)
  Custom log formats (in config file? in '-f' arg) using printf or hogan.js
  or whatever. Dap wants field width control for lining up. Hogan.js is
  probably overkill for this.
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
- (mark) instanceof-based serialization:
    log.info(new Error("blah blah")) -> {err: ..., msg: ""}
  perhaps at least default for Error. Then perhaps augment or replace
  serializers with registerable instanceof's.
    log = new Logger({
        serializers
    })
    


# someday/maybe

- bunyan cli: filter args a la json
- bunyan cli: -c COND args a la json
- bunyan "compact" or "light", '-l'? Something like. Or pehaps this (with
  color) could be the default, with '-l' for long output.
    13:51.340 [src.js:20#Wuzzle.woos] WARN: This wuzzle is woosey.
- `log.close` to close streams and shutdown and `this.closed`
- get Mark to show me dtrace provider stuff and consider adding for
  logging, if helpful.
- add option to "streams" to take the raw object, not serialized.
  It would be a good hook for people with custom needs that Bunyan doesn't
  care about (e.g. log.ly or hook.io or whatever).
- split out `bunyan` cli to a "bunyan" or "bunyan-reader" or "node-bunyan-reader"
  as the basis for tools to consume bunyan logs. It can grow indep of node-bunyan
  for generating the logs.
  It would take a Bunyan log record object and be expected to emit it.
- serializer `request_id` that pulls it from req? `log.info({request_id: req}, "hi")`
- serializer support:
    - restify-server.js example -> restifyReq ? or have `req` detect that.
      That is nicer for the "use all standard ones". *Does* restify req
      have anything special?
    - differential HTTP *client* req/res with *server* req/res.
- statsd stream? http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
  Think about it.
