/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Test the standard serializers in Bunyan.
 */

var test = require('tap').test;
var http = require('http');

var bunyan = require('../lib/bunyan');
var verror = require('verror');


function CapturingStream(recs) {
  this.recs = recs;
}
CapturingStream.prototype.write = function (rec) {
  this.recs.push(rec);
}


test('req serializer', function (t) {
  var records = [];
  var log = bunyan.createLogger({
    name: 'serializer-test',
    streams: [
      {
        stream: new CapturingStream(records),
        type: 'raw'
      }
    ],
    serializers: {
      req: bunyan.stdSerializers.req
    }
  });

  // None of these should blow up.
  var bogusReqs = [
    undefined,
    null,
    {},
    1,
    'string',
    [1,2,3],
    {'foo':'bar'}
  ];
  for (var i = 0; i < bogusReqs.length; i++) {
    log.info({req: bogusReqs[i]}, "hi");
    t.equal(records[i].req, bogusReqs[i]);
  }

  // Get http request and response objects to play with and test.
  var theReq, theRes;
  var server = http.createServer(function (req, res) {
    theReq = req;
    theRes = res;
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  })
  server.listen(8765, function () {
    http.get({host: '127.0.0.1', port: 8765, path: '/'}, function(res) {
      log.info({req: theReq}, 'the request');
      var lastRecord = records[records.length-1];
      t.equal(lastRecord.req.method, 'GET');
      t.equal(lastRecord.req.url, theReq.url);
      t.equal(lastRecord.req.remoteAddress, theReq.connection.remoteAddress);
      t.equal(lastRecord.req.remotePort, theReq.connection.remotePort);
      server.close();
      t.end();
    }).on('error', function (err) {
      t.ok(false, 'error requesting to our test server: ' + err);
      server.close();
      t.end();
    });
  });
});


test('res serializer', function (t) {
  var records = [];
  var log = bunyan.createLogger({
    name: 'serializer-test',
    streams: [
      {
        stream: new CapturingStream(records),
        type: 'raw'
      }
    ],
    serializers: {
      res: bunyan.stdSerializers.res
    }
  });

  // None of these should blow up.
  var bogusRess = [
    undefined,
    null,
    {},
    1,
    'string',
    [1,2,3],
    {'foo':'bar'}
  ];
  for (var i = 0; i < bogusRess.length; i++) {
    log.info({res: bogusRess[i]}, "hi");
    t.equal(records[i].res, bogusRess[i]);
  }

  // Get http request and response objects to play with and test.
  var theReq, theRes;
  var server = http.createServer(function (req, res) {
    theReq = req;
    theRes = res;
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  })
  server.listen(8765, function () {
    http.get({host: '127.0.0.1', port: 8765, path: '/'}, function(res) {
      log.info({res: theRes}, 'the response');
      var lastRecord = records[records.length-1];
      t.equal(lastRecord.res.statusCode, theRes.statusCode);
      t.equal(lastRecord.res.header, theRes._header);
      server.close();
      t.end();
    }).on('error', function (err) {
      t.ok(false, 'error requesting to our test server: ' + err);
      server.close();
      t.end();
    });
  });
});


test('err serializer', function (t) {
  var records = [];
  var log = bunyan.createLogger({
    name: 'serializer-test',
    streams: [
      {
        stream: new CapturingStream(records),
        type: 'raw'
      }
    ],
    serializers: {
      err: bunyan.stdSerializers.err
    }
  });

  // None of these should blow up.
  var bogusErrs = [
    undefined,
    null,
    {},
    1,
    'string',
    [1,2,3],
    {'foo':'bar'}
  ];
  for (var i = 0; i < bogusErrs.length; i++) {
    log.info({err: bogusErrs[i]}, "hi");
    t.equal(records[i].err, bogusErrs[i]);
  }

  var theErr = new TypeError('blah');

  log.info(theErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, theErr.message);
  t.equal(lastRecord.err.name, theErr.name);
  t.equal(lastRecord.err.stack, theErr.stack);
  t.end();
});


test('err serializer: long stack', function (t) {
  var records = [];
  var log = bunyan.createLogger({
    name: 'serializer-test',
    streams: [{
        stream: new CapturingStream(records),
        type: 'raw'
    }],
    serializers: {
      err: bunyan.stdSerializers.err
    }
  });

  var topErr, midErr, bottomErr;

  // Just a VError.
  topErr = new verror.VError('top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  t.equal(lastRecord.err.stack, topErr.stack);

  // Just a WError.
  topErr = new verror.WError('top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  t.equal(lastRecord.err.stack, topErr.stack);

  // WError <- TypeError
  bottomErr = new TypeError('bottom err');
  topErr = new verror.WError(bottomErr, 'top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  var expectedStack = topErr.stack + '\nCaused by: ' + bottomErr.stack;
  t.equal(lastRecord.err.stack, expectedStack);

  // WError <- WError
  bottomErr = new verror.WError('bottom err');
  topErr = new verror.WError(bottomErr, 'top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  var expectedStack = topErr.stack + '\nCaused by: ' + bottomErr.stack;
  t.equal(lastRecord.err.stack, expectedStack);

  // WError <- WError <- TypeError
  bottomErr = new TypeError('bottom err');
  midErr = new verror.WError(bottomErr, 'mid err');
  topErr = new verror.WError(midErr, 'top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  var expectedStack = (topErr.stack
    + '\nCaused by: ' + midErr.stack
    + '\nCaused by: ' + bottomErr.stack);
  t.equal(lastRecord.err.stack, expectedStack);

  // WError <- WError <- WError
  bottomErr = new verror.WError('bottom err');
  midErr = new verror.WError(bottomErr, 'mid err');
  topErr = new verror.WError(midErr, 'top err');
  log.info(topErr, 'the error');
  var lastRecord = records[records.length-1];
  t.equal(lastRecord.err.message, topErr.message);
  t.equal(lastRecord.err.name, topErr.name);
  var expectedStack = (topErr.stack
    + '\nCaused by: ' + midErr.stack
    + '\nCaused by: ' + bottomErr.stack);
  t.equal(lastRecord.err.stack, expectedStack);


  t.end();
});
