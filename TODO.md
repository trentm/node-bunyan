- renderer support (i.e. repr of a restify request obj)
- expand set of fields: from dap
    time, hostname
    <https://github.com/Graylog2/graylog2-docs/wiki/GELF>
    <http://journal.paul.querna.org/articles/2011/12/26/log-for-machines-in-json/>
    require: facility and hostname
    line/file: possible to get quickly with v8?
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/PatternLayout.html)
- bunyan cli: filter args a la json
- bunyan cli: -c COND args a la json
- docs
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
- test suite
