/**
 * Copyright (c) 2014 Trent Mick. All rights reserved.
 * Copyright (c) 2014 Joyent Inc. All rights reserved.
 *
 * bunyan -- filter and pretty-print Bunyan log files (line-delimited JSON)
 *
 * See <https://github.com/trentm/node-bunyan>.
 *
 * -*- mode: js -*-
 * vim: expandtab:ts=4:sw=4
 */
var util = require('util');
var http = require('http');

var Transform = require('stream').Transform;


//---- globals and constants

// Output modes.
var OM_LONG = 1;
var OM_JSON = 2;
var OM_INSPECT = 3;
var OM_SIMPLE = 4;
var OM_SHORT = 5;
var OM_BUNYAN = 6;


// Levels
var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;

var levelFromName = {
    'trace': TRACE,
    'debug': DEBUG,
    'info': INFO,
    'warn': WARN,
    'error': ERROR,
    'fatal': FATAL
};
var nameFromLevel = {};
var upperNameFromLevel = {};
var upperPaddedNameFromLevel = {};
Object.keys(levelFromName).forEach(function (name) {
    var lvl = levelFromName[name];
    nameFromLevel[lvl] = name;
    upperNameFromLevel[lvl] = name.toUpperCase();
    upperPaddedNameFromLevel[lvl] = (
        name.length === 4 ? ' ' : '') + name.toUpperCase();
});

//---- support functions

var format = util.format;
if (!format) {
    /* BEGIN JSSTYLED */
    // If not node 0.6, then use its `util.format`:
    // <https://github.com/joyent/node/blob/master/lib/util.js#L22>:
    var inspect = util.inspect;
    var formatRegExp = /%[sdj%]/g;
    format = function format(f) {
        if (typeof f !== 'string') {
            var objects = [];
            for (var i = 0; i < arguments.length; i++) {
                objects.push(inspect(arguments[i]));
            }
            return objects.join(' ');
        }

        var i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function (x) {
            if (i >= len)
                return x;
            switch (x) {
                case '%s': return String(args[i++]);
                case '%d': return Number(args[i++]);
                case '%j': return JSON.stringify(args[i++]);
                case '%%': return '%';
                default:
                    return x;
            }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
            if (x === null || typeof x !== 'object') {
                str += ' ' + x;
            } else {
                str += ' ' + inspect(x);
            }
        }
        return str;
    };
    /* END JSSTYLED */
}

function indent(s) {
    return '    ' + s.split(/\r?\n/).join('\n    ');
}

// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
// Suggested colors (some are unreadable in common cases):
// - Good: cyan, yellow (limited use), bold, green, magenta, red
// - Bad: blue (not visible on cmd.exe), grey (same color as background on
//   Solarized Dark theme from <https://github.com/altercation/solarized>, see
//   issue #160)
var colors = {
    'bold' : [1, 22],
    'italic' : [3, 23],
    'underline' : [4, 24],
    'inverse' : [7, 27],
    'white' : [37, 39],
    'grey' : [90, 39],
    'black' : [30, 39],
    'blue' : [34, 39],
    'cyan' : [36, 39],
    'green' : [32, 39],
    'magenta' : [35, 39],
    'red' : [31, 39],
    'yellow' : [33, 39]
};

/**
 * Is this a valid Bunyan log record.
 */
function isValidRecord(rec) {
    if (rec.v == null ||
            rec.level == null ||
            rec.name == null ||
            rec.hostname == null ||
            rec.pid == null ||
            rec.time == null ||
            rec.msg == null) {
        // Not valid Bunyan log.
        return false;
    } else {
        return true;
    }
}

function Formatter(opts) {
    opts = opts || { };
    
    Transform.call(this);
    
    this._writableState.objectMode = true;
    
    if (opts.hasOwnProperty('color')) {
        this.color = !!opts.color;
        this._forced = true;
    } else {
        if (process.env.BUNYAN_NO_COLOR &&
                process.env.BUNYAN_NO_COLOR.length > 0) {
            this.color = false;
        } else {
            this.color = true;
        }
        this._forced = false;
    }
    
    this.stylize = (this.color ? this.stylizeWithColor : this.stylizeWithoutColor);

    this.outputMode = opts.outputMode;
    this.jsonIndent = !!opts.jsonIndent;
}
util.inherits(Formatter, Transform);

Formatter.prototype.stylizeWithColor = function (str, color) {
    if (!str)
        return '';
    var codes = colors[color];
    if (codes) {
        return '\033[' + codes[0] + 'm' + str +
                     '\033[' + codes[1] + 'm';
    } else {
        return str;
    }
};
Formatter.prototype.stylizeWithoutColor = function (str, color) {
    return str;
};

/**
 * Print out a single result, considering input options.
 */
Formatter.prototype._transform = function (rec, encoding, cb) {
    var short = false;

    switch (this.outputMode) {
    case OM_SHORT:
        short = true;
        /* jsl:fall-thru */

    case OM_LONG:
        //    [time] LEVEL: name[/comp]/pid on hostname (src): msg* (extras...)
        //        msg*
        //        --
        //        long and multi-line extras
        //        ...
        // If 'msg' is single-line, then it goes in the top line.
        // If 'req', show the request.
        // If 'res', show the response.
        // If 'err' and 'err.stack' then show that.
        if (!isValidRecord(rec)) {
            console.log(rec);
            process.exit();
            this._push(rec);
            break;
        }

        delete rec.v;

        /*
         * We assume the Date is formatted according to ISO8601, in which
         * case we can safely chop off the date information.
         */
        var time;
        if (short && rec.time[10] == 'T') {
            time = this.stylize(rec.time.substr(11), 'XXX');
        } else {
            time = this.stylize('[' + rec.time + ']', 'XXX');
        }

        delete rec.time;

        var nameStr = rec.name;
        delete rec.name;

        if (rec.component) {
            nameStr += '/' + rec.component;
        }
        delete rec.component;

        if (!short)
            nameStr += '/' + rec.pid;
        delete rec.pid;

        var level = (upperPaddedNameFromLevel[rec.level] || 'LVL' + rec.level);
        if (this.color) {
            var colorFromLevel = {
                10: 'white',    // TRACE
                20: 'yellow',   // DEBUG
                30: 'cyan',     // INFO
                40: 'magenta',  // WARN
                50: 'red',      // ERROR
                60: 'inverse',  // FATAL
            };
            level = this.stylize(level, colorFromLevel[rec.level]);
        }
        delete rec.level;

        var src = '';
        if (rec.src && rec.src.file) {
            var s = rec.src;
            if (s.func) {
                src = format(' (%s:%d in %s)', s.file, s.line, s.func);
            } else {
                src = format(' (%s:%d)', s.file, s.line);
            }
            src = this.stylize(src, 'green');
        }
        delete rec.src;

        var hostname = rec.hostname;
        delete rec.hostname;

        var extras = [];
        var details = [];

        if (rec.req_id) {
            extras.push('req_id=' + rec.req_id);
        }
        delete rec.req_id;

        var onelineMsg;
        if (rec.msg.indexOf('\n') !== -1) {
            onelineMsg = '';
            details.push(indent(this.stylize(rec.msg, 'cyan')));
        } else {
            onelineMsg = ' ' + this.stylize(rec.msg, 'cyan');
        }
        delete rec.msg;

        if (rec.req && typeof (rec.req) === 'object') {
            var req = rec.req;
            delete rec.req;
            var headers = req.headers;
            if (!headers) {
                headers = '';
            } else if (typeof (headers) === 'string') {
                headers = '\n' + headers;
            } else if (typeof (headers) === 'object') {
                headers = '\n' + Object.keys(headers).map(function (h) {
                    return h + ': ' + headers[h];
                }).join('\n');
            }
            var s = format('%s %s HTTP/%s%s', req.method,
                req.url,
                req.httpVersion || '1.1',
                headers
            );
            delete req.url;
            delete req.method;
            delete req.httpVersion;
            delete req.headers;
            if (req.body) {
                s += '\n\n' + (typeof (req.body) === 'object'
                    ? JSON.stringify(req.body, null, 2) : req.body);
                delete req.body;
            }
            if (req.trailers && Object.keys(req.trailers) > 0) {
                s += '\n' + Object.keys(req.trailers).map(function (t) {
                    return t + ': ' + req.trailers[t];
                }).join('\n');
            }
            delete req.trailers;
            details.push(indent(s));
            // E.g. for extra 'foo' field on 'req', add 'req.foo' at
            // top-level. This *does* have the potential to stomp on a
            // literal 'req.foo' key.
            Object.keys(req).forEach(function (k) {
                rec['req.' + k] = req[k];
            })
        }

        if (rec.client_req && typeof (rec.client_req) === 'object') {
            var client_req = rec.client_req;
            delete rec.client_req;
            var headers = client_req.headers;
            var hostHeaderLine = '';
            var s = '';
            if (client_req.address) {
                hostHeaderLine = 'Host: ' + client_req.address;
                if (client_req.port)
                    hostHeaderLine += ':' + client_req.port;
                hostHeaderLine += '\n';
            }
            delete client_req.headers;
            delete client_req.address;
            delete client_req.port;
            s += format('%s %s HTTP/%s\n%s%s', client_req.method,
                client_req.url,
                client_req.httpVersion || '1.1',
                hostHeaderLine,
                (headers ?
                    Object.keys(headers).map(
                        function (h) {
                            return h + ': ' + headers[h];
                        }).join('\n') :
                    ''));
            delete client_req.method;
            delete client_req.url;
            delete client_req.httpVersion;
            if (client_req.body) {
                s += '\n\n' + (typeof (client_req.body) === 'object' ?
                    JSON.stringify(client_req.body, null, 2) :
                    client_req.body);
                delete client_req.body;
            }
            // E.g. for extra 'foo' field on 'client_req', add
            // 'client_req.foo' at top-level. This *does* have the potential
            // to stomp on a literal 'client_req.foo' key.
            Object.keys(client_req).forEach(function (k) {
                rec['client_req.' + k] = client_req[k];
            })
            details.push(indent(s));
        }

        function _res(res) {
            var s = '';
            if (res.statusCode !== undefined) {
                s += format('HTTP/1.1 %s %s\n', res.statusCode,
                    http.STATUS_CODES[res.statusCode]);
                delete res.statusCode;
            }
            // Handle `res.header` or `res.headers` as either a string or
            // and object of header key/value pairs. Prefer `res.header` if set
            // (TODO: Why? I don't recall. Typical of restify serializer?
            // Typical JSON.stringify of a core node HttpResponse?)
            var headers;
            if (res.header !== undefined) {
                headers = res.header;
                delete res.header;
            } else if (res.headers !== undefined) {
                headers = res.headers;
                delete res.headers;
            }
            if (!headers) {
                /* pass through */
            } else if (typeof (headers) === 'string') {
                s += headers.trimRight();
            } else {
                s += Object.keys(headers).map(
                    function (h) { return h + ': ' + headers[h]; }).join('\n');
            }
            if (res.body !== undefined) {
                s += '\n\n' + (typeof (res.body) === 'object'
                    ? JSON.stringify(res.body, null, 2) : res.body);
                delete res.body;
            } else {
                s = s.trimRight();
            }
            if (res.trailer) {
                s += '\n' + res.trailer;
            }
            delete res.trailer;
            if (s) {
                details.push(indent(s));
            }
            // E.g. for extra 'foo' field on 'res', add 'res.foo' at
            // top-level. This *does* have the potential to stomp on a
            // literal 'res.foo' key.
            Object.keys(res).forEach(function (k) {
                rec['res.' + k] = res[k];
            });
        }

        if (rec.res && typeof (rec.res) === 'object') {
            _res(rec.res);
            delete rec.res;
        }
        if (rec.client_res && typeof (rec.client_res) === 'object') {
            _res(rec.client_res);
            delete rec.res;
        }

        if (rec.err && rec.err.stack) {
            var err = rec.err
            details.push(indent(err.stack));
            delete err.message;
            delete err.name;
            delete err.stack;
            // E.g. for extra 'foo' field on 'err', add 'err.foo' at
            // top-level. This *does* have the potential to stomp on a
            // literal 'err.foo' key.
            Object.keys(err).forEach(function (k) {
                rec['err.' + k] = err[k];
            })
            delete rec.err;
        }

        var leftover = Object.keys(rec);
        for (var i = 0; i < leftover.length; i++) {
            var key = leftover[i];
            var value = rec[key];
            var stringified = false;
            if (typeof (value) !== 'string') {
                value = JSON.stringify(value, null, 2);
                stringified = true;
            }
            if (value.indexOf('\n') !== -1 || value.length > 50) {
                details.push(indent(key + ': ' + value));
            } else if (!stringified && (value.indexOf(' ') != -1 ||
                value.length === 0))
            {
                extras.push(key + '=' + JSON.stringify(value));
            } else {
                extras.push(key + '=' + value);
            }
        }

        extras = this.stylize(
            (extras.length ? ' (' + extras.join(', ') + ')' : ''), 'XXX');
        details = this.stylize(
            (details.length ? '\n' + details.join('\n    --\n') : ''), 'XXX');
        if (!short)
            this._push(format('%s %s: %s on %s%s:%s%s%s',
                time,
                level,
                nameStr,
                hostname || '<no-hostname>',
                src,
                onelineMsg,
                extras,
                details));
        else
            this._push(format('%s %s %s:%s%s%s',
                time,
                level,
                nameStr,
                onelineMsg,
                extras,
                details));
        break;

    case OM_INSPECT:
        this._push(util.inspect(rec, false, Infinity, true));
        break;

    case OM_BUNYAN:
        this._push(JSON.stringify(rec, null, 0));
        break;

    case OM_JSON:
        this._push(JSON.stringify(rec, null, this.jsonIndent));
        break;

    case OM_SIMPLE:
        /* JSSTYLED */
        // <http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/SimpleLayout.html>
        if (!isValidRecord(rec)) {
            this._push(line);
        } else {
            this._push(format('%s - %s',
                upperNameFromLevel[rec.level] || 'LVL' + rec.level,
                rec.msg));
        }
        break;
    default:
        throw new Error('unknown output mode: '+this.outputMode);
    }
    cb();
};

Formatter.prototype._push = function (str) {
    this.push(str);
    this.push('\n');
};

Formatter.prototype.pipe = function (targetStream) {
    if (!this._forced) { this.color = !!targetStream.isTTY; }
    this.stylize = (this.color ? this.stylizeWithColor : this.stylizeWithoutColor);
    
    Formatter.super_.prototype.pipe.call(this, targetStream);
};

module.exports = Formatter;
