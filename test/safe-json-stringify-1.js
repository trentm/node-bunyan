var bunyan = require('../lib/bunyan');

var log = bunyan.createLogger({
    name: 'safe-json-stringify-1'
});

var obj = {};
obj.__defineGetter__('boom',
    function () { throw new Error('__defineGetter__ ouch!'); });
log.info({obj: obj}, 'using __defineGetter__');
