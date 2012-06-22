Bunyan is a simple and fast a JSON Logger for node.js services (and a `bunyan`
CLI tool for nicely viewing those logs).

Server logs should be structured. JSON's a good format. Let's do that: a log
record is one line of `JSON.stringify`'d output. Let's also specify some common
names for the requisite and common fields for a log record (see below).

Also: log4j is way more than you need.


# Current Status

Solid core functionality is there. Joyent is using this for a number of
production services. Bunyan supports node 0.6 and greater.

Follow <a href="https://twitter.com/intent/user?screen_name=trentmick" target="_blank">@trentmick</a>
for updates to Bunyan.

See also: [Bunyan for Bash](https://github.com/trevoro/bash-bunyan).


# Installation

    npm install bunyan


# Usage

**The usual.** All loggers must provide a "name". This is somewhat akin
to log4j logger "name", but Bunyan doesn't do hierarchical logger names.

    $ cat hi.js
    var Logger = require('bunyan');
    var log = new Logger({name: "myapp"});
    log.info("hi");

Alternatively, bunyan 0.7.0 and up supports a more node.js-land typical
style (which might become the preferred form over time):

    var bunyan = require('bunyan');
    var log = bunyan.createLogger({name: "myapp"});

**Log records are JSON.** "hostname", "time" and "v" (the Bunyan log
format version) are added for you.

    $ node hi.js
    {"name":"myapp","hostname":"banana.local","pid":123,"level":2,"msg":"hi","time":"2012-01-31T00:07:44.216Z","v":0}

The full `log.{trace|debug|...|fatal}(...)` API is:

    log.info();     // Returns a boolean: is the "info" level enabled?

    log.info('hi');                     // Log a simple string message.
    log.info('hi %s', bob, anotherVar); // Uses `util.format` for msg formatting.

    log.info({foo: 'bar'}, 'hi');       // Adds "foo" field to log record.

    log.info(err);  // Special case to log an `Error` instance, adds "err"
                    // key with exception details (including the stack) and
                    // sets "msg" to the exception message.
    log.info(err, 'more on this: %s', more);
                    // ... or you can specify the "msg".

Note that this implies **you cannot pass any object as the first argument
to log it**. IOW, `log.info(myobject)` isn't going to work the way you
expect. Adding support for this API would necessitate (a) JSON-ifying safely
that given object (sometimes hard, and probably slow) and (b) putting all its
attribs under a top-level 'x' field name or something to avoid field name
collisions.


## bunyan tool

A `bunyan` tool is provided **for pretty-printing bunyan logs** and, eventually,
for filtering (e.g. `| bunyan -c 'level>3'`). This shows the default output
(which is fluid right now) and indented-JSON output. More output formats will
be added, including support for custom formats.

    $ node hi.js | ./bin/bunyan  # CLI tool to filter/pretty-print JSON logs.
    [2012-01-31T00:08:11.387Z] INFO: myapp on banana.local/123: hi

    $ node hi.js | ./bin/bunyan -o json
    {
      "name": "myapp",
      "hostname": "banana.local",
      "pid": 123,
      "level": 2,
      "msg": "hi",
      "time": "2012-01-31T00:10:00.676Z",
      "v": 0
    }


## streams

By default, log output is to stdout (**stream**) and at the "info" level.
Explicitly that looks like:

    var log = new Logger({name: "myapp", stream: process.stdout,
      level: "info"});

That is an abbreviated form for a single stream. **You can defined multiple
streams at different levels**.

    var log = new Logger({
      name: "amon",
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

More on streams in the "Streams" section below.


## log.child

A `log.child(...)` is provided to **specialize a logger for a sub-component**.
The following will have log records from "Wuzzle" instances use exactly the
same config as its parent, plus include the "component" field.

    var log = new Logger(...);

    ...

    function Wuzzle(options) {
      this.log = options.log;
      this.log.info("creating a wuzzle")
    }
    Wuzzle.prototype.woos = function () {
      this.log.warn("This wuzzle is woosey.")
    }

    var wuzzle = new Wuzzle({log: log.child({component: "wuzzle"})});
    wuzzle.woos();
    log.info("done with the wuzzle")

The [node-restify](https://github.com/mcavage/node-restify)
framework integrates bunyan. One feature of its integration, is that each
restify request handler includes a `req.log` logger that is:

    log.child({req_id: <unique request id>}, true)

Apps using restify can then use `req.log` and have all such log records
include the unique request id (as "req_id"). Handy.


## serializers

Bunyan has a concept of **"serializers" to produce a JSON-able object from a
JavaScript object**, so you can easily do the following:

    log.info({req: <request object>}, "something about handling this request");

Association is by log record field name, "req" in this example, so this
requires a registered serializer something like this:

    function reqSerializer(req) {
      return {
        method: req.method,
        url: req.url,
        headers: req.headers
      }
    }
    var log = new Logger({
      ...
      serializers: {
        req: reqSerializer
      }
    });

Or this:

    var log = new Logger({
      ...
      serializers: {req: Logger.stdSerializers.req}
    });

because Buyan includes a small set of standard serializers. To use all the
standard serializers you can use:

    var log = new Logger({
      ...
      serializers: Logger.stdSerializers
    });

*Note: Your own serializers should never throw, otherwise you'll get an
ugly message on stderr from Bunyan (along with the traceback) and the field
in your log record will be replaced with a short error message.*

## src

The **source file, line and function of the log call site** can be added to
log records by using the `src: true` config option:

    var log = new Logger({src: true, ...});

This adds the call source info with the 'src' field, like this:

    {
      "name": "src-example",
      "hostname": "banana.local",
      "pid": 123,
      "component": "wuzzle",
      "level": 4,
      "msg": "This wuzzle is woosey.",
      "time": "2012-02-06T04:19:35.605Z",
      "src": {
        "file": "/Users/trentm/tm/node-bunyan/examples/src.js",
        "line": 20,
        "func": "Wuzzle.woos"
      },
      "v": 0
    }

**WARNING: Determining the call source info is slow. Never use this option
in production.**


# Levels

The log levels in bunyan are:

- "fatal" (60): the service/app is going to stop or become unusable now
- "error" (50): fatal for a particular request, but the service/app continues servicing other requests
- "warn" (40): a note on something that should probably be looked at by an operator
- "info" (30): detail on regular operation
- "debug" (20): anything else, i.e. too verbose to be included in "info" level.
- "trace" (10): logging from external libraries used by your app

General level usage suggestions: "debug" should be used sparingly.
Information that will be useful to debug errors *post mortem* should usually
be included in "info" messages if it's generally relevant or else with the
corresponding "error" event. Don't rely on spewing mostly irrelevant debug
messages all the time and sifting through them when an error occurs.

Integers are used for the actual level values (10 for "trace", ..., 60 for
"fatal") and constants are defined for the (Logger.TRACE ... Logger.DEBUG).
The lowercase level names are aliases supported in the API.

Here is the API for changing levels in an existing logger:

    log.level() -> INFO   // gets current level (lowest level of all streams)

    log.level(INFO)       // set all streams to level INFO
    log.level("info")     // set all streams to level INFO

    log.levels() -> [DEBUG, INFO]   // get array of levels of all streams
    log.levels(0) -> DEBUG          // get level of stream at index 0
    log.levels("foo")               // get level of stream with name "foo"

    log.levels(0, INFO)             // set level of stream 0 to INFO
    log.levels(0, "info")           // can use "info" et al aliases
    log.levels("foo", WARN)         // set stream named "foo" to WARN



# Log Record Fields

This section will describe *rules* for the Bunyan log format: field names,
field meanings, required fields, etc. However, a Bunyan library doesn't
strictly enforce all these rules while records are being emitted. For example,
Bunyan will add a `time` field with the correct format to your log records,
but you can specify your own. It is the caller's responsibility to specify
the appropriate format.

The reason for the above leniency is because IMO logging a message should
never break your app. This leads to this rule of logging: **a thrown
exception from `log.info(...)` or equivalent (other than for calling with the
incorrect signature) is always a bug in Bunyan.**


A typical Bunyan log record looks like this:

    {"name":"myserver","hostname":"banana.local","pid":123,"req":{"method":"GET","url":"/path?q=1#anchor","headers":{"x-hi":"Mom","connection":"close"}},"level":3,"msg":"start request","time":"2012-02-03T19:02:46.178Z","v":0}

Pretty-printed:

    {
      "name": "myserver",
      "hostname": "banana.local",
      "pid": 123,
      "req": {
        "method": "GET",
        "url": "/path?q=1#anchor",
        "headers": {
          "x-hi": "Mom",
          "connection": "close"
        },
        "remoteAddress": "120.0.0.1",
        "remotePort": 51244
      },
      "level": 3,
      "msg": "start request",
      "time": "2012-02-03T19:02:57.534Z",
      "v": 0
    }


Core fields:

- `v`: Required. Integer. Added by Bunion. Cannot be overriden.
  This is the Bunyan log format version (`require('bunyan').LOG_VERSION`).
  The log version is a single integer. `0` is until I release a version
  "1.0.0" of node-bunyan. Thereafter, starting with `1`, this will be
  incremented if there is any backward incompatible change to the log record
  format. Details will be in "CHANGES.md" (the change log).
- `level`: Required. Integer. Added by Bunion. Cannot be overriden.
  See the "Levels" section.
- `name`: Required. String. Provided at Logger creation.
  You must specify a name for your logger when creating it. Typically this
  is the name of the service/app using Bunyan for logging.
- `hostname`: Required. String. Provided or determined at Logger creation.
  You can specify your hostname at Logger creation or it will be retrieved
  vi `os.hostname()`.
- `pid`: Required. Integer. Filled in automatically at Logger creation.
- `time`: Required. String. Added by Bunion. Can be overriden.
  The date and time of the event in [ISO 8601
  Extended Format](http://en.wikipedia.org/wiki/ISO_8601) format and in UTC,
  as from
  [`Date.toISOString()`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/toISOString).
- `msg`: Required. String.
  Every `log.debug(...)` et al call must provide a log message.
- `src`: Optional. Object giving log call source info. This is added
  automatically by Bunyan if the "src: true" config option is given to the
  Logger. Never use in production as this is really slow.


Go ahead and add more fields, and nest ones are fine (and recommended) as
well. This is why we're using JSON. Some suggestions and best practices
follow (feedback from actual users welcome).


Recommended/Best Practice Fields:

-   `err`: Object. A caught JS exception. Log that thing with `log.info(err)`
    to get:

        ...
        "err": {
          "message": "boom",
          "name": "TypeError",
          "stack": "TypeError: boom\n    at Object.<anonymous> ..."
        },
        "msg": "boom",
        ...

    Or use the `Logger.stdSerializers.err` serializer in your Logger and
    do this `log.error({err: err}, "oops")`. See "examples/err.js".

- `req_id`: String. A request identifier. Including this field in all logging
  tied to handling a particular request to your server is strongly suggested.
  This allows post analysis of logs to easily collate all related logging
  for a request. This really shines when you have a SOA with multiple services
  and you carry a single request ID from the top API down through all APIs
  (as [node-restify](https://github.com/mcavage/node-restify) facilitates
  with its 'X-Request-Id' header).

- `req`: An HTTP server request. Bunyan provides `Logger.stdSerializers.req`
  to serialize a request with a suggested set of keys. Example:

        {
          "method": "GET",
          "url": "/path?q=1#anchor",
          "headers": {
            "x-hi": "Mom",
            "connection": "close"
          },
          "remoteAddress": "120.0.0.1",
          "remotePort": 51244
        }

- `res`: An HTTP server response. Bunyan provides `Logger.stdSerializers.res`
  to serialize a response with a suggested set of keys. Example:

        {
          "statusCode": 200,
          "header": "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: keep-alive\r\nTransfer-Encoding: chunked\r\n\r\n"
        }


Other fields to consider:

- `req.username`: Authenticated user (or for a 401, the user attempting to
  auth).
- Some mechanism to calculate response latency. "restify" users will have
  a "X-Response-Time" header. A `latency` custom field would be fine.
- `req.body`: If you know that request bodies are small (common in APIs,
  for example), then logging the request body is good.


# Streams

A "stream" is Bunyan's name for an output for log messages (the equivalent
to a log4j Appender). Ultimately Bunyan uses a
[Writable Stream](http://nodejs.org/docs/latest/api/all.html#writable_Stream)
interface, but there are some additional attributes used to create and
manage the stream. A Bunyan Logger instance has one or more streams.
In general streams are specified with the "streams" option:

    var Logger = require('bunyan');
    var log = new Logger({
      name: "foo",
      streams: [
        {
            stream: process.stderr,
            level: "debug"
        },
        ...
      ]
    })

For convenience, if there is only one stream, it can specified with the
"stream" and "level" options (internal converted to a `Logger.streams`):

    var log = new Logger({
      name: "foo",
      stream: process.stderr,
      level: "debug"
    })

If none are specified, the default is a stream on `process.stdout` at the
"info" level.

`Logger.streams` is an array of stream objects with the following attributes:

- `type`: One of "stream", "file" or "raw". See below. Often this is
  implied from the other arguments.
- `path`: A file path for a file stream. If `path` is given and `type` is
  not specified, then `type` will be set to "file".
- `stream`: This is the "Writable Stream", e.g. a std handle or an open
  file write stream. If `stream` is given and `type` is not specified, then
  `type` will be set to "stream".
- `level`: The level at which logging to this stream is enabled. If not
  specified it defaults to INFO.

Supported stream types are:

- `stream`: A plain ol' node.js [Writable
  Stream](http://nodejs.org/docs/latest/api/all.html#writable_Stream).
  A "stream" (the writeable stream) value is required.

- `file`: A "path" argument is given. Bunyan will open this file for
  appending. E.g.:

        {
          "path": "/var/log/foo.log",
          "level": "warn"
        }

  Bunyan re-emits error events from the created `WriteStream`. So you can
  do this:

        var log = new Logger({name: 'mylog', streams: [{path: LOG_PATH}]});
        log.on('error', function (err, stream) {
            // Handle stream write or create error here.
        });

- `raw`: Similar to a "stream" writeable stream, except that the write method
  is given raw log record *Object*s instead of a JSON-stringified string.
  This can be useful for hooking on further processing to all Bunyan logging:
  pushing to an external service, a RingBuffer (see below), etc.


## RingBuffer Stream

Bunyan comes with a special stream called a RingBuffer which keeps the last N
records in memory and does *not* write the data anywhere else.  One common
strategy is to log 'info' and higher to a normal log file but log all records
(including 'trace') to a ringbuffer that you can access via a debugger, or your
own HTTP interface, or a post-mortem facility like MDB or node-panic.

To use a RingBuffer:

    /* Create a ring buffer that stores the last 100 records. */
    var bunyan = require('bunyan');
    var ringbuffer = new bunyan.RingBuffer({ limit: 100 });
    var log = new bunyan({
        name: 'foo',
        streams: [
            {
                level: 'info',
                stream: process.stdout
            },
            {
                level: 'trace',
                type: 'raw',    // use 'raw' to get raw log record objects
                stream: ringbuffer
            }
        ]
    });

    log.info('hello world');
    console.log(ringbuffer.records);

This example emits:

    [ { name: 'foo',
        hostname: '912d2b29',
        pid: 50346,
        level: 30,
        msg: 'hello world',
        time: '2012-06-19T21:34:19.906Z',
        v: 0 } ]



# License

MIT.



# Future

See "TODO.md".
