// Example logging HTTP server request and response objects.

var http = require('http');
var Logger = require('../lib/bunyan');

var log = new Logger({
    name: 'myserver',
    serializers: {
        req: Logger.stdSerializers.req,
        res: Logger.stdSerializers.res
    }
});

var server = http.createServer(function (req, res) {
    log.info({req: req}, 'start request');  // <-- this is the guy we're testing
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
    log.info({res: res}, 'done response');  // <-- this is the guy we're testing
});
server.listen(1337, '127.0.0.1', function () {
    log.info('server listening');
    var options = {
        port: 1337,
        hostname: '127.0.0.1',
        path: '/path?q=1#anchor',
        headers: {
            'X-Hi': 'Mom'
        }
    };
    var req = http.request(options);
    req.on('response', function (res) {
        res.on('end', function () {
            process.exit();
        })
    });
    req.write('hi from the client');
    req.end();
});


/* BEGIN JSSTYLED */
/**
 *
 * $ node server.js
 * {"service":"myserver","hostname":"banana.local","level":3,"msg":"server listening","time":"2012-02-02T05:32:13.257Z","v":0}
 * {"service":"myserver","hostname":"banana.local","req":{"method":"GET","url":"/path?q=1#anchor","headers":{"x-hi":"Mom","connection":"close"}},"level":3,"msg":"start request","time":"2012-02-02T05:32:13.260Z","v":0}
 * {"service":"myserver","hostname":"banana.local","res":{"statusCode":200,"_hasBody":true,"_header":"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n\r\n","_trailer":""},"level":3,"msg":"done response","time":"2012-02-02T05:32:13.261Z","v":0}
 *
 * $ node server.js | ../bin/bunyan
 * [2012-02-02T05:32:16.006Z] INFO: myserver on banana.local: server listening
 * [2012-02-02T05:32:16.010Z] INFO: myserver on banana.local: start request
 *     GET /path?q=1#anchor
 *     x-hi: Mom
 *     connection: close
 * [2012-02-02T05:32:16.011Z] INFO: myserver on banana.local: done response
 *     HTTP/1.1 200 OK
 *     Content-Type: text/plain
 *     Connection: close
 *     Transfer-Encoding: chunked
 *     (body)
 *
 */
/* END JSSTYLED */
