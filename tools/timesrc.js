#!/usr/bin/env node
/*
 * Time 'src' fields (getting log call source info). This is expensive.
 */

console.log('Time adding "src" field with call source info:');

var ben = require('ben');  // npm install ben
var Logger = require('../lib/bunyan');

var records = [];
function Collector() {
}
Collector.prototype.write = function (s) {
    //records.push(s);
}
var collector = new Collector();

var logwith = new Logger({
    name: 'with-src',
    src: true,
    stream: collector
});

var ms = ben(1e5, function () {
    logwith.info('hi');
});
console.log(' - log.info with    src:  %dms per iteration', ms);

var logwithout = new Logger({
    name: 'without-src',
    stream: collector
});
var ms = ben(1e5, function () {
    logwithout.info('hi');
});
console.log(' - log.info without src:  %dms per iteration', ms);
