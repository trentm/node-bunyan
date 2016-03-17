
// A helper script to log a few times, pause, repeat. We attempt to NOT emit
// to stdout or stderr because this is used for dtrace testing
// and we don't want to mix output.

var bunyan = require('../lib/bunyan');
var log = bunyan.createLogger({
    name: 'play',
    serializers: bunyan.stdSerializers
});

setInterval(function logSome() {
    log.debug({foo: 'bar'}, 'hi at debug')
    log.trace('hi at trace')
}, 1000);
