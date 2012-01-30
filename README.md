Bunyan -- a JSON Logger for node.js servers.

Server logs should be structured. JSON's a good format. Let's do that: a log
record is one line of `JSON.stringify`'d output. Let's also specify some common
names for the requisite and common fields for a log record (see below).

Also: log4j is way more than you need.


# Usage

    // hi.js
    var Logger = require('bunyan');
    var log = new Logger({facility: "myapp", level: "info"});
    log.info("hi");

    $ node hi.js
    {"time":"2012-01-30T00:56:25.842Z","facility":"myapp","level":2,"message":"hi"}

    $ node hi.js | bunyan  # CLI tool to filter/pretty-print JSON logs.
    {
      "time": "2012-01-30T00:56:25.842Z",
      "facility": "myapp",
      "level": 2,
      "message": "hi"
    }


# Levels

    fatal
    error
    warn
    info
    debug

TODO


# Log Record Fields

TODO

# License

MIT.

