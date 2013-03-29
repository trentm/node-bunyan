// Show the usage of `src: true` config option to get log call source info in
// log records (the `src` field).

var Logger = require('../lib/bunyan');

var log = new Logger({name: 'src-example', src: true});

log.info('one');
log.info('two');
function doSomeFoo() {
    log.info({foo:'bar'}, 'three');
}
doSomeFoo();

function Wuzzle(options) {
    this.log = options.log;
    this.log.info('creating a wuzzle')
}
Wuzzle.prototype.woos = function () {
    this.log.warn('This wuzzle is woosey.')
}

var wuzzle = new Wuzzle({log: log.child({component: 'wuzzle'})});
wuzzle.woos();
log.info('done with the wuzzle')
