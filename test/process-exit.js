var bunyan = require('../lib/bunyan');
var log = bunyan.createLogger({
    name: 'default',
    streams: [ {
        type: 'rotating-file',
        path: __dirname + '/log.test.rot.log',
        period: '1d',
        count: 7
    } ]
});
console.log('done');
