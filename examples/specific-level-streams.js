#!/usr/bin/env node
/**
 * <https://github.com/trentm/node-bunyan/issues/130> was a request to have
 * bunyan core support logging some levels to one stream and others to another,
 * *not* limited by bunyan's current support that a stream `level` implies
 * "that level and higher".
 *
 * Let's do that with a custom raw stream.
 */

var bunyan = require('../lib/bunyan'),
    safeCycles = bunyan.safeCycles;
var fs = require('fs');

/**
 * Use case #1: cli tool that outputs errors on stderr and everything else on
 * stdout.
 *
 * First make a raw bunyan stream (i.e. an object with a `.write(rec)`).
 */
function SpecificLevelStream(levels, stream) {
    var self = this;
    this.levels = {};
    levels.forEach(function (lvl) {
        self.levels[bunyan.resolveLevel(lvl)] = true;
    });
    this.stream = stream;
}
SpecificLevelStream.prototype.write = function (rec) {
    if (this.levels[rec.level] !== undefined) {
        var str = JSON.stringify(rec, safeCycles()) + '\n';
        this.stream.write(str);
    }
}

var log1 = bunyan.createLogger({
    name: 'use-case-1',
    streams: [ {
        level: 'trace',
        type: 'raw',
        stream: new SpecificLevelStream(
            ['trace', 'debug', 'info', 'warn'],
            process.stdout)
    }, {
        level: 'error',
        type: 'raw',
        stream: new SpecificLevelStream(
            ['error'],
            process.stderr)
    } ]
});

log1.info('hi at info level (this should be on stdout)');
log1.error('alert alert (this should be on stderr)');


/**
 * Use case #2: nginx-style logger that separates error- and access-logs
 */
var log2 = bunyan.createLogger({
    name: 'use-case-2',
    streams: [ {
        level: 'info',
        type: 'raw',
        stream: new SpecificLevelStream(
            ['info'],
            fs.createWriteStream('specific-level-streams-http.log',
                {flags: 'a', encoding: 'utf8'}))
    }, {
        level: 'warn',
        path: 'specific-level-streams-http.err.log'
    } ]
});

log2.info('200 GET /blah');
log2.error('500 GET /boom');
