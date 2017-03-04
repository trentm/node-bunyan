#!/usr/bin/env node
/* BEGIN JSSTYLED */
/**
 * <https://github.com/trentm/node-bunyan/pull/473> is a change to add a
 * feature to Bunyan's log record stringification to log `undefined` values.
 * Let's attempt that with a custom raw stream.
 *
 * Note that a raw stream here isn't ideal, because using a custom raw stream
 * means that it is a pain to use some of the other built-in stream types
 * (file, rotating-file). However, it might be a satisfactory workaround for
 * some.
 *
 * Example:
 *      $ node log-undefined-values.js
 *      {"name":"log-undefined-values","hostname":"danger0.local","pid":28161,"level":30,"anull":null,"aundef":"[Undefined]","anum":42,"astr":"foo","msg":"hi","time":"2017-03-04T20:53:54.331Z","v":0}
 *      $ node log-undefined-values.js | bunyan
 *      [2017-03-04T20:54:41.874Z]  INFO: log-undefined-values/28194 on danger0.local: hi (anull=null, aundef=[Undefined], anum=42, astr=foo)
 */
/* END JSSTYLED */

var bunyan = require('../lib/bunyan');
var fs = require('fs');


function replacer() {
    // Note: If node > 0.10, then could use Set here (see `safeCyclesSet()`
    // in bunyan.js) for a performance improvement.
    var seen = [];
    return function (key, val) {
        if (val === undefined) {
            return '[Undefined]';
        } else if (!val || typeof (val) !== 'object') {
            return val;
        }
        if (seen.indexOf(val) !== -1) {
            return '[Circular]';
        }
        seen.push(val);
        return val;
    };
}

function LogUndefinedValuesStream(stream) {
    this.stream = stream;
}
LogUndefinedValuesStream.prototype.write = function (rec) {
    var str = JSON.stringify(rec, replacer()) + '\n';
    this.stream.write(str);
}

var log = bunyan.createLogger({
    name: 'log-undefined-values',
    streams: [ {
        level: 'info',
        type: 'raw',
        stream: new LogUndefinedValuesStream(process.stdout)
    } ]
});

log.info({anull: null, aundef: undefined, anum: 42, astr: 'foo'}, 'hi');
