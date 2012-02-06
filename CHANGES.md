# bunyan Changelog

## bunyan 0.5.0 (not yet released)

- Add `log.level(...)` and `log.levels(...)` API for changing logger stream
  levels.
- Add `TRACE|DEBUG|INFO|WARN|ERROR|FATAL` level constants to exports.
- Add `log.info(err)` special case for logging an `Error` instance. For
  example `log.info(new TypeError("boom")` will produce:

        ...
        "err": {
          "message": "boom",
          "name": "TypeError",
          "stack": "TypeError: boom\n    at Object.<anonymous> ..."
        },
        "msg": "boom",
        ...


## bunyan 0.4.0

- Add `new Logger({src: true})` config option to have a 'src' attribute be
  automatically added to log records with the log call source info. Example:

        "src": {
          "file": "/Users/trentm/tm/node-bunyan/examples/src.js",
          "line": 20,
          "func": "Wuzzle.woos"
        },


## bunyan 0.3.0

- `log.child(options[, simple])` Added `simple` boolean arg. Set `true` to
  assert that options only add fields (no config changes). Results in a 10x
  speed increase in child creation. See "tools/timechild.js". On my Mac, 
  "fast child" creation takes about 0.001ms. IOW, if your app is dishing
  10,000 req/s, then creating a log child for each request will take
  about 1% of the request time.
- `log.clone` -> `log.child` to better reflect the relationship: streams and
  serializers are inherited. Streams can't be removed as part of the child
  creation. The child doesn't own the parent's streams (so can't close them).
- Clean up Logger creation. The goal here was to ensure `log.child` usage
  is fast. TODO: measure that.
- Add `Logger.stdSerializers.err` serializer which is necessary to get good
  Error object logging with node 0.6 (where core Error object properties
  are non-enumerable).


## bunyan 0.2.0

- Spec'ing core/recommended log record fields.
- Add `LOG_VERSION` to exports.
- Improvements to request/response serializations.


## bunyan 0.1.0

First release.

