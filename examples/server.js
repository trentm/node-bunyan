var http = require('http');
var Logger = require('../lib/bunyan');

// Basic usage.
var log = new Logger({
  service: "myserver",
  serializers: {req: Logger.stdSerializers.req}
});

http.createServer(function (req, res) {
  log.info({req: req}, "start request");  // <-- this is the guy we're testing
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(1337, "127.0.0.1", function () {
  log.info("server listening");
  var options = {
    port: 1337,
    host: '127.0.0.1',
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
  req.end();
});
