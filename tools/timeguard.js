#!/usr/bin/env node
/*
 * Time logging with/without a try/catch-guard on the JSON.stringify.
 */

console.log('Time try/catch-guard on JSON.stringify:');

var ben = require('ben');  // npm install ben
var bunyan = require('../lib/bunyan');

function Collector() {}
Collector.prototype.write = function (s) {};

var log = bunyan.createLogger({
    name: 'timeguard',
    stream: new Collector()
});

var ms = ben(1e5, function () {
    log.info('hi');
});
console.log(' - log.info:  %dms per iteration', ms);

console.log('\nNow you need to manually change `Logger.prototype._emit` in\n'
    + '"../lib/bunyan.js" to (not) have a try/catch around `JSON.stringify`.\n'
    + 'Then re-run this a few times to compare speed.');
