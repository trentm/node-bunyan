var bunyan = require('./'),
    safeCycles = bunyan.safeCycles;
var util = require('util');


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


var log = bunyan.createLogger({
    name: 'rot-specific-levels',
    streams: [
        {
            type: 'raw',
            level: 'debug',
            stream: new SpecificLevelStream(
                ['debug'],
                new bunyan.RotatingFileStream({
                    path: './rot-specific-levels.debug.log',
                    period: '3000ms',
                    count: 10
                })
            )
        },
        {
            type: 'raw',
            level: 'info',
            stream: new SpecificLevelStream(
                ['info'],
                new bunyan.RotatingFileStream({
                    path: './rot-specific-levels.info.log',
                    period: '3000ms',
                    count: 10
                })
            )
        }
    ]
});


setInterval(function () {
    log.trace('hi on trace')    // goes nowhere
    log.debug('hi on debug')    // goes to rot-specific-levels.debug.log.*
    log.info('hi on info')      // goes to rot-specific-levels.info.log.*
}, 1000);
