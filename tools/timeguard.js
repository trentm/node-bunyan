#!/usr/bin/env node
/*
 * Time logging with/without a try/catch-guard on the JSON.stringify
 * and other code options around that section (see #427).
 */

console.log('Time JSON.stringify and alternatives in Logger._emit:');

var ben = require('ben');  // npm install ben
var bunyan = require('../lib/bunyan');

function Collector() {}
Collector.prototype.write = function (s) {};

var log = bunyan.createLogger({
    name: 'timeguard',
    stream: new Collector()
});

var ms, fields;
ms = ben(1e5, function () { log.info('hi'); });
console.log(' - log.info with no fields:     %dms per iteration', ms);

fields = {foo: 'bar'};
ms = ben(1e5, function () { log.info(fields, 'hi'); });
console.log(' - log.info with small fields:  %dms per iteration', ms);

fields = {
    versions: process.versions,
    moduleLoadList: process.moduleLoadList
};
ms = ben(1e5, function () { log.info(fields, 'hi'); });
console.log(' - log.info with medium fields: %dms per iteration', ms);

// JSSTYLED
fields = {"name":"cloudapi","hostname":"5bac70c2-fad9-426d-99f1-2854efdad922","pid":53688,"component":"audit","audit":true,"level":30,"remoteAddress":"172.25.1.28","remotePort":49596,"req_id":"574e5560-6a9d-11e6-af76-3dadd30aa0da","req":{"method":"POST","url":"/my/machines","headers":{"host":"cloudapi.nightly-1.joyent.us","user-agent":"curl/7.42.0","accept":"application/json","content-type":"application/json","x-api-version":"~7","authorization":"Signature keyId=\"/admin/keys/64:86:e3:ef:0a:76:bc:43:02:8c:02:04\",algorithm=\"rsa-sha256\" PJmFgjoiW/+MqhYyzjtckFptmcFrHqV1zuETRh+hv8ApxyKZ/+xO6G8q4PPNDxfbhAsP6/kKrV7DJklyIn0KunkyHbonAUGuUb4eq0CghmVX0jwma2ttdvNB2n8k3rvUDlQXp+X/Bi2PNj7D1zjcBQlkRhx118JTtR+QZp+bdTrJ+g6lIs1CMPnRHEQkGOYw3mjDjRNwPiPqcQPmGj7qY/DW0lEfIj/41z7dWS6vUA50RrV1EeM1hD7VCKYZAC41hFC/VLSG1Lbhq7gTykZ3QjM0WyOaDX06cKWxdS+x4VveyvFMVUaiGCeiWpOXmbiLbGomII2AR8NK1+LWfaqH4C31y0bjZ+iK7SBMQ+XY3QjlFv/di3CdlEylUKXsJoKxGqhuCzg+7eXzCNqMj5tdvOdKwizPpazwzPbjAyDeU2l8dTwggMQSuLy7qC7UVtRN2AUgWxw8fxGqivnmbGfRE+KFxA+VrizG+DLFQBve/bd3ZQvKmS/HKM1ATomYyW9g7W8Z2lKbmPtbv91A77bLRh7f6OA2fwaBPW3HP89adC2Gsyj+0sCcPq3F+r/lAT3gEw+tuVBlBbJsS1IV19FQAl0ajCd9ZJ/mJMPGt5hLwbVA7mU6yyU5J71elaBs6klmaKBNPesGLBSv55/xnZlU6mS9FXPdC5Sg=","date":"Thu, 25 Aug 2016 08:24:28 GMT","content-length":"184","x-forwarded-for":"::ffff:172.25.1.28"},"httpVersion":"1.1","trailers":{},"timers":{"parseAccept":743,"parseAuthorization":2051,"parseDate":20,"parseQueryString":50,"bunyan":79,"readBody":1699,"parseBody":218,"restifyResponseHeaders":9,"xForwardedFor":108,"setupSDCProxies":18,"accountMgmt":114,"signatureAuth":182865,"tokenAuth":42,"assertAuthenticated":15,"loadAccount":56,"resourceName":55,"loadDatasets":10765,"loadPackages":9280}},"res":{"statusCode":404,"headers":{"content-type":"application/json","content-length":99,"access-control-allow-origin":"*","access-control-allow-headers":"Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, Api-Version, Response-Time","access-control-allow-methods":"POST, GET, HEAD","access-control-expose-headers":"Api-Version, Request-Id, Response-Time","connection":"Keep-Alive","content-md5":"O3boRcASC7JNu/huA6qnPw==","date":"Thu, 25 Aug 2016 08:24:29 GMT","server":"Joyent Triton 8.0.2","api-version":"8.0.0","request-id":"574e5560-6a9d-11e6-af76-3dadd30aa0da","response-time":210},"trailer":false},"err":{"message":"Package 92e2b20a-0c37-11e3-9605-63a778146273 does not exist","name":"ResourceNotFoundError","stack":"ResourceNotFoundError: Package 92e2b20a-0c37-11e3-9605-63a778146273 does not exist\n    at parseResponse (/opt/smartdc/cloudapi/node_modules/sdc-clients/node_modules/restify/lib/clients/json_client.js:67:23)\n    at IncomingMessage.done (/opt/smartdc/cloudapi/node_modules/sdc-clients/node_modules/restify/lib/clients/string_client.js:151:17)\n    at IncomingMessage.g (events.js:180:16)\n    at IncomingMessage.emit (events.js:117:20)\n    at _stream_readable.js:944:16\n    at process._tickDomainCallback (node.js:502:13)"},"latency":210,"route":"createmachine","_audit":true,"msg":"handled: 404","time":"2016-08-25T08:24:29.063Z","v":0};
ms = ben(1e5, function () { log.info(fields, 'hi'); });
console.log(' - log.info with large fields:  %dms per iteration', ms);

console.log('\nNow you need to manually change `Logger.prototype._emit` in'
    + '"../lib/bunyan.js"\nto an alternative impl. Then re-run this a '
    + 'few times to compare speed.');
