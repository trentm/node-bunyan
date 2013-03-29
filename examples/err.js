// Example logging an error:

var http = require('http');
var Logger = require('../lib/bunyan');
var util = require('util');

var log = new Logger({
    name: 'myserver',
    serializers: {
        err: Logger.stdSerializers.err,   // <--- use this
    }
});

try {
    throw new TypeError('boom');
} catch (err) {
    log.warn({err: err}, 'operation went boom: %s', err)   // <--- here
}

log.info(new TypeError('how about this?'))  // <--- alternatively this


try {
    throw 'boom string';
} catch (err) {
    log.error(err)
}

/* BEGIN JSSTYLED */
/**
 *
 *  $ node err.js  | ../bin/bunyan -j
 *  {
 *    "name": "myserver",
 *    "hostname": "banana.local",
 *    "err": {
 *      "stack": "TypeError: boom\n    at Object.<anonymous> (/Users/trentm/tm/node-bunyan/examples/err.js:15:9)\n    at Module._compile (module.js:411:26)\n    at Object..js (module.js:417:10)\n    at Module.load (module.js:343:31)\n    at Function._load (module.js:302:12)\n    at Array.0 (module.js:430:10)\n    at EventEmitter._tickCallback (node.js:126:26)",
 *      "name": "TypeError",
 *      "message": "boom"
 *    },
 *    "level": 4,
 *    "msg": "operation went boom: TypeError: boom",
 *    "time": "2012-02-02T04:42:53.206Z",
 *    "v": 0
 *  }
 *  $ node err.js  | ../bin/bunyan
 *  [2012-02-02T05:02:39.412Z] WARN: myserver on banana.local: operation went boom: TypeError: boom
 *      TypeError: boom
 *          at Object.<anonymous> (/Users/trentm/tm/node-bunyan/examples/err.js:15:9)
 *          at Module._compile (module.js:411:26)
 *          at Object..js (module.js:417:10)
 *          at Module.load (module.js:343:31)
 *          at Function._load (module.js:302:12)
 *          at Array.0 (module.js:430:10)
 *          at EventEmitter._tickCallback (node.js:126:26)
 *
 */
/* END JSSTYLED */
