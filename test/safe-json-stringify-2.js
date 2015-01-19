process.env.BUNYAN_TEST_NO_SAFE_JSON_STRINGIFY = '1';
var bunyan = require('../lib/bunyan');

var log = bunyan.createLogger({
    name: 'safe-json-stringify-2'
});

var obj = {};
obj.__defineGetter__('boom',
    function () { throw new Error('__defineGetter__ ouch!'); });
log.info({obj: obj}, 'using __defineGetter__');
