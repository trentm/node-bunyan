- mark wants pretty output for debug output
    - not sure if 'bunyan --pretty' or whatever would suffice
- mark suggested a list of streams. This is what ring could be.
- `bunyan` cli
- expand set of fields
    <https://github.com/Graylog2/graylog2-docs/wiki/GELF>
    <http://journal.paul.querna.org/articles/2011/12/26/log-for-machines-in-json/>
    require: facility and hostname
- renderer support (i.e. repr of a restify request obj)
- docs
- feel out usage
- not sure about `log.info()` for is-enabled. Perhaps `log.isInfo()` because
  can then use that for `log.isInfo(true)` for 'ring' argument. Separate level
  and ringLevel.
- Logger.set to mutate config or `this.fields`
- Logger.del to remove a field
- test suite
