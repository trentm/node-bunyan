Bunyan -- a JSON Logger for node.js servers.

Server logs should be structured. JSON's a good format. Let's do that: a log
record is one line of `JSON.stringify`'d output. Let's also specify some common
names for the requisite and common fields for a log record (see below).

Also: log4j is way more than you need.


# Current Status

Just play stuff here. Don't try to use this for realz yet.


# Usage

The usual. All loggers must provide a "service" name. This is somewhat akin
to log4j logger "name", but Bunyan doesn't so hierarchical logger names.

    $ cat hi.js
    var Logger = require('bunyan');
    var log = new Logger({service: "myapp", level: "info"});
    log.info("hi");

Log records are JSON. "hostname", "time" and "v" (the Bunyan log
format version) are added for you.

    $ node hi.js
    {"service":"myapp","hostname":"banana.local","level":2,"msg":"hi","time":"2012-01-31T00:07:44.216Z","v":0}

A `bunyan` tool is provided for pretty-printing bunyan logs and, eventually,
for filtering (e.g. `| bunyan -c 'level>3'`). This shows the default output
(which is fluid right now) and indented-JSON output. More output formats will
be added, including support for custom formats.

    $ node hi.js | ./bin/bunyan  # CLI tool to filter/pretty-print JSON logs.
    [2012-01-31T00:08:11.387Z] INFO: myapp on banana.local: hi (<no-request_id>)
    
    $ node hi.js | ./bin/bunyan -o json
    {
      "service": "myapp",
      "hostname": "banana.local",
      "level": 2,
      "msg": "hi",
      "time": "2012-01-31T00:10:00.676Z",
      "v": 0
    }

By default, log output is to stdout. Explicitly that looks like:

    var log = new Logger({service: "myapp", stream: process.stdout});

That is an abbreviated form for a single stream. You can defined multiple
streams at different levels:

    var log = new Logger({
      service: "amon",
      streams: [
        {
          level: "info",
          stream: process.stdout, // log INFO and above to stdout
        },
        {
          level: "error",
          path: "tmp/error.log"   // log ERROR and above to a file
        }
      ]
    });

Support for syslog is planned.


# Future

See "TODO.md", but basically:

- "Renderer" support to handle extracting a JSON object for a log record
  for particular object types, e.g. an HTTP request. So for example we
  could do:
  
        log.info({req: req}, "something about handling this request")

  And the "req" renderer would extract a reasonable JSON object for that
  request object -- presumably a subset of all attributes on the request
  object.
  
  This will key off the field name, IOW by convention, rather than getting
  into `instanceof` grossness.

- Spec'ing and enforcing the fields (from dap's section in eng guide).

- Syslog support. Ring-buffer support for storing last N debug messages
  (or whatever) in memory to support debugability without too much log load.

- More `bunyan` output formats and filtering features.

- Think about a bunyan dashboard that supports organizing and viewing logs
  from multiple hosts and services.



# Levels

    fatal
    error
    warn
    info
    debug

TODO: doc these.


# Log Record Fields

TODO: from dap and enforce these

- "request_id" (better name?) can't be required because some things don't
  happen in a per-request context. Startup and background processing stuff
  for example. Tho for request-y things, it is strongly encouraged because it
  allows collating logs from multiple services for the same request.


# License

MIT.

