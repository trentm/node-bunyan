- expand set of fields: from dap
    time, hostname
    <https://github.com/Graylog2/graylog2-docs/wiki/GELF>
    <http://journal.paul.querna.org/articles/2011/12/26/log-for-machines-in-json/>
    require: facility and hostname
    line/file: possible to get quickly with v8? Yunong asked.
- fast clone: basically make it reasonable to clone per HTTP request.
  Ditch mutability. Add another context (another entry in Log record tuple?)?
- `log.close` to close streams and shutdown and `this.closed`
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

- file/line fields automatic: "but it's fucking slow" (https://gist.github.com/1733234)
        function getFileAndLine() {
            var self = this;
            var saveLimit = Error.stackTraceLimit;
            var savePrepare = Error.prepareStackTrace;
            Error.stackTraceLimit = 1;
            Error.captureStackTrace(this, getFileAndLine);
            Error.prepareStackTrace = function(_, stack) {
                self.file = stack[0].getFileName();
                self.line = stack[0].getLineNumber();
            };
            this.stack;
            Error.stackTraceLimit = saveLimit;
            Error.prepareStackTrace = savePrepare;
            return {
                file: self.file,
                line: self.line
            }
        }
    Want some way to have file/line only at certain levesl and lazily.
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
