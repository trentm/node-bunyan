/*
 * Example of a MuteByEnvVars Bunyan stream to mute log records matching some
 * envvars. I.e. as a way to do:
 *      https://github.com/trentm/node-bunyan/issues/175
 *      https://github.com/trentm/node-bunyan/pull/176
 * outside of core.
 *
 * Usage:
 *  $ node mute-by-envvars-stream.js
 *  {"name":"mute-by-envvars-stream",...,"msg":"hi raw stream"}
 *  {"name":"mute-by-envvars-stream",...,"foo":"bar","msg":"added \"foo\" key"}
 *
 *  $ BUNYAN_MUTE_foo=bar node mute-by-envvars-stream.js
 *  {"name":"mute-by-envvars-stream",...,"msg":"hi raw stream"}
 *
 * Dev Notes:
 * - This currently treats all 'BUNYAN_MUTE_foo=bar' envvar values as strings.
 *   That might not be desired.
 * - This is a quick implementation: inefficient and not well tested.
 * - Granted that Bunyan streams are hard to compose. For example, using
 *   `MuteByEnvVars` to be a filter before writing logs to a *file* is a pain
 *   for the file open/close handling. It would be nicer if Bunyan had a
 *   pipeline of "filters" (more like core node.js streams).
 */

var bunyan = require('../lib/bunyan');


function MuteByEnvVars(opts) {
    opts = opts || {};
    this.stream = opts.stream || process.stdout;

    var PREFIX = 'BUNYAN_MUTE_';

    // Process the env once.
    this.mutes = {};
    for (k in process.env) {
        if (k.indexOf(PREFIX) === 0) {
            this.mutes[k.slice(PREFIX.length)] = process.env[k];
        }
    }
}

/**
 * Returns the given object's "o" property named by "s" using the dot notation.
 *
 * this({ name: { first: "value" } }, name.first) == "value"
 *
 * This is a verbatin copy of http://stackoverflow.com/a/6491621/433814
 *
 * @param o {object} is an object.
 * @param s (string} is the string in the "dot" notation.
 */
MuteByEnvVars.prototype._objectFromDotNotation = function (o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');  // convert indexes to properties
    s = s.replace(/^\./, ''); // strip leading dot
    var a = s.split('.');
    while (a.length) {
        var n = a.shift();
        if (n in o) {
            o = o[n];
        } else {
            return;
        }
    }
    return o;
}

MuteByEnvVars.prototype.write = function (rec) {
    if (typeof (rec) !== 'object') {
        console.error('error: MuteByEnvVars raw stream got a non-object '
            + 'record: %j', rec);
        return;
    }

    var muteRec = false;
    var keys = Object.keys(this.mutes);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var match = this._objectFromDotNotation(rec, k);
        if (match === this.mutes[k]) {
            muteRec = true;
            break;
        }
    }
    if (!muteRec) {
        this.stream.write(JSON.stringify(rec) + '\n');
    }
}



// ---- example usage of the MuteByEnvVars stream

var log = bunyan.createLogger({
    name: 'mute-by-envvars-stream',
    streams: [
        {
            level: 'info',
            stream: new MuteByEnvVars(),
            type: 'raw'
        },
    ]
});


log.info('hi raw stream');
log.info({foo: 'bar'}, 'added "foo" key');
