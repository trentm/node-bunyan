#!/usr/bin/env node
/*
 * Time logging with/without a try/catch-guard on the JSON.stringify.
 */

console.log('Time try/catch-guard on JSON.stringify:');

var ben = require('ben');  // npm install ben
var Logger = require('../lib/bunyan');

var records = [];
function Collector() {
}
Collector.prototype.write = function (s) {
    //records.push(s);
}
var collector = new Collector();

var log = new Logger({
    name: 'timeguard',
    src: true,
    stream: collector
});

var ms = ben(1e5, function () {
    log.info('hi');
});
console.log(' - log.info:  %dms per iteration', ms);
