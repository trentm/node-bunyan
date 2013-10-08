
/*
 *  Common functions/variables shared by both bin/bunyan and lib/bunyan.js
 */

var VERSION = '0.21.5';

// Bunyan log format version. This becomes the 'v' field on all log records.
// `0` is until I release a version '1.0.0' of node-bunyan. Thereafter,
// starting with `1`, this will be incremented if there is any backward
// incompatible change to the log record format. Details will be in
// 'CHANGES.md' (the change log).
var LOG_VERSION = 0;


/*
 *  Exports
 */

module.exports.VERSION = VERSION;
module.exports.LOG_VERSION = LOG_VERSION;

