var bunyan = require('../lib/bunyan');

var log = bunyan.createLogger({
    name: 'safe-json-stringify-3'
});

// And using `Object.defineProperty`.
var obj = {};
Object.defineProperty(obj, 'boom', {
    get: function () { throw new Error('defineProperty ouch!'); },
    enumerable: true // enumerable is false by default
});
// Twice to test the 'warnKey' usage.
for (var i = 0; i < 2; i++) {
    log.info({obj: obj}, 'using defineProperty');
}
