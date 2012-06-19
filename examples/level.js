// Play with setting levels.
//
// TODO: put this in a damn test suite

var Logger = require('../lib/bunyan'),
  DEBUG = Logger.DEBUG,
  INFO = Logger.INFO,
  WARN = Logger.WARN;
var assert = require('assert');

// Basic usage.
var log = new Logger({
  name: 'example-level',
  streams: [
    {
      name: 'stdout',
      stream: process.stdout,
      level: 'debug'
    },
    {
      name: 'stderr',
      stream: process.stderr
    }
  ]
});

assert.equal(log.level(), DEBUG);
assert.equal(log.levels()[0], DEBUG);
assert.equal(log.levels()[1], INFO);
assert.equal(log.levels(0), DEBUG);
assert.equal(log.levels(1), INFO);

assert.equal(log.levels('stdout'), DEBUG)
try {
  log.levels('foo')
} catch (e) {
  assert.ok(e.message.indexOf('name') !== -1)
}

log.trace('no one should see this')
log.debug('should see this once (on stdout)')
log.info('should see this twice')
log.levels('stdout', INFO)
log.debug('no one should see this either')
log.level('trace')
log.trace('should see this twice as 4th and 5th emitted log messages')
