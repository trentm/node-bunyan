/*
 * A long-running process that does some periodic logging. Use bunyan with
 * it some of these ways:
 *
 * 1. Direct piping:
 *        node long-running.js | bunyan
 * 2. Logging to file (e.g. if run via a service system like upstart or
 *    illumos' SMF that sends std output to a log file), then tail -f that
 *    log file.
 *        node long-running.js > long-running.log 2>&1
 *        tail -f long-running.log | bunyan
 * 3. Dtrace to watch the logging. This has the bonus of being able to watch
 *    all log levels... even if not normally emitted.
 *        node long-running.js > long-running.log 2>&1
 *        bunyan -p $(head -1 long-running.log | json pid)
 *
 */

var fs = require('fs');
var bunyan = require('../lib/bunyan');


function randint(n) {
    return Math.floor(Math.random() * n);
}

function randchoice(array) {
    return array[randint(array.length)];
}


//---- mainline

var words = fs.readFileSync(
    __dirname + '/long-running.js', 'utf8').split(/\s+/);
var levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
var timeout;

var log = bunyan.createLogger({name: 'lr', level: 'debug'});

// We're logging to stdout. Let's exit gracefully on EPIPE. E.g. if piped
// to `head` which will close after N lines.
process.stdout.on('error', function (err) {
    if (err.code === 'EPIPE') {
        process.exit(0);
    }
})

function logOne() {
    var level = randchoice(levels);
    var msg = [randchoice(words), randchoice(words)].join(' ');
    var delay = randint(300);
    //console.warn('long-running about to log.%s(..., "%s")', level, msg)
    log[level]({'word': randchoice(words), 'delay': delay}, msg);
    timeout = setTimeout(logOne, delay);
}

log.info('hi, this is the start');
timeout = setTimeout(logOne, 1000);
