#!/usr/bin/env node
/*
 * Time logging below the current level, which should do very little work.
 */

console.log('Time log.trace() when log level is "info":');

var ben = require('ben');  // npm install ben
var bunyan = require('../lib/bunyan');

function Collector() {}
Collector.prototype.write = function (s) {};

var log = bunyan.createLogger({
    name: 'timeguard',
    level: 'info',
    stream: new Collector()
});

var i = 0;
var ms, fields;

ms = ben(1e7, function () {
    log.trace({ count: i++ }, 'hello');
});
console.log(' - log.trace:     %dms per iteration', ms);
