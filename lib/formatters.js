/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 * Copyright (c) 2012 Joyent Inc. All rights reserved.
 *
 * Formatter handling for the Bunyan logging library.
 *
 * Here "formatting" handles transforming Bunyan log record objects
 * to strings (for writing to files, stdout, etc.).
 */

var warn = console.warn;
var util = require('util'),
    _ = util.format,
    inspect = util.inspect;
var http = require('http');


var levels = require('./levels'),
    upperNameFromLevel = levels.upperNameFromLevel,
    upperPaddedNameFromLevel = levels.upperPaddedNameFromLevel,
    nameFromLevel = levels.nameFromLevel;



//---- Internal support stuff

function objCopy(obj) {
  if (obj === null) {
    return null;
  } else if (Array.isArray(obj)) {
    return obj.slice();
  } else {
    var copy = {};
    Object.keys(obj).forEach(function (k) {
      copy[k] = obj[k];
    });
    return copy;
  }
}

function indent(s) {
  return '    ' + s.split(/\r?\n/).join('\n    ');
}



//---- Stylers
// These are functions to markup a string with a given style.

function nullStyler(s, style) {
    return s;
}


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
// Suggested colors (some are unreadable in common cases):
// - Good: cyan, yellow (limited use), grey, bold, green, magenta, red
// - Bad: blue (not visible on cmd.exe)
var ansiCodesFromColor = {
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    white: [37, 39],
    grey: [90, 39],
    black: [30, 39],
    blue: [34, 39],
    cyan: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [31, 39],
    yellow: [33, 39]
};

var ansiColorFromStyle = {
    time: null,
    src: 'green',
    msg: 'cyan',
    msgblock: 'cyan',
    extra: 'grey',
    extrablock: 'grey',
    // level styles
    trace: 'grey',
    debug: 'grey',
    info: 'cyan',
    warn: 'magenta',
    error: 'red',
    fatal: 'inverse'
};

var ansiMarkupFromStyle = {};
Object.keys(ansiColorFromStyle).forEach(function (style) {
    var color = ansiColorFromStyle[style];
    if (color) {
        var codes = ansiCodesFromColor[color];
        ansiMarkupFromStyle[style] = [
            '\033[' + codes[0] + 'm',
            '\033[' + codes[1] + 'm'
        ];
    }
});

function ansiStyler(s, style) {
    if (!s.length) {
        return s;
    }
    var markup = ansiMarkupFromStyle[style];
    if (markup) {
        return markup[0] + s + markup[1];
    } else {
        return s;
    }
}


function htmlStyler(s, style) {
    //XXX
    return s;
}


var stylerFromMarkup = {
    none: nullStyler,
    ansi: ansiStyler,
    html: htmlStyler
};



//---- Formatters

/**
 * An objCopy that copies a Bunyan record object sufficiently to not have
 * it be mutated by a Bunyan formatter.
 */
var recCopyKeys = {
    req: true,
    client_req: true,
    res: true
};
function recCopy(rec) {
    var copy = {};
    Object.keys(rec).forEach(function (k) {
        if (recCopyKeys[k]) {
            copy[k] = objCopy[k];
        } else {
            copy[k] = rec[k];
        }
    });
    return copy;
}


/**
 * Format an HTTP request object (typically serialized by
 * `bunyan.stdSerializers.req`).
 */
function formatReq(req) {
    var headers = req.headers;
    var s = _("%s %s HTTP/%s%s", req.method,
        req.url,
        req.httpVersion || "1.1",
        (headers
            ? '\n' + Object.keys(headers).map(
                function (h) { return h + ': ' + headers[h]; }).join('\n')
            : '')
    );
    delete req.url;
    delete req.method;
    delete req.httpVersion;
    delete req.headers;
    if (req.body) {
        s += '\n\n' + (typeof(req.body) === 'object'
            ? JSON.stringify(req.body, null, 2) : req.body);
        delete req.body;
    }
    if (req.trailers && Object.keys(req.trailers) > 0) {
        s += '\n' + Object.keys(req.trailers).map(
            function (t) { return t + ': ' + req.trailers[t]; }).join('\n');
    }
    delete req.trailers;
    return s;
}

/**
 * Format a client HTTP request object (typically serialized by
 * `restify...TODO` client_req serializer).
 */
function formatClientReq(client_req) {
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
    s += _("%s %s HTTP/%s\n%s%s", client_req.method,
        client_req.url,
        client_req.httpVersion || "1.1",
        hostHeaderLine,
        Object.keys(headers).map(
            function (h) { return h + ': ' + headers[h]; }).join('\n'));
    delete client_req.method;
    delete client_req.url;
    delete client_req.httpVersion;
    if (client_req.body) {
        s += '\n\n' + (typeof(client_req.body) === 'object'
            ? JSON.stringify(client_req.body, null, 2) : client_req.body);
        delete client_req.body;
    }
    // E.g. for extra 'foo' field on 'client_req', add 'client_req.foo' at
    // top-level. This *does* have the potential to stomp on a literal
    // 'client_req.foo' key.
    Object.keys(client_req).forEach(function (k) {
        rec["client_req." + k] = client_req[k];
    })
    return s;
}

/**
 * XXX: doc
 */
function formatRes(res) {
    var s = '';
    if (res.header) {
        s += res.header.trimRight();
    } else if (res.headers) {
        if (res.statusCode) {
            s += _("HTTP/1.1 %s %s\n", res.statusCode,
                http.STATUS_CODES[res.statusCode]);
        }
        var headers = res.headers;
        s += Object.keys(headers).map(
            function (h) { return h + ': ' + headers[h]; }).join('\n');
    }
    delete res.header;
    delete res.headers;
    delete res.statusCode;
    if (res.body) {
        s += '\n\n' + res.body
        delete res.body;
    }
    if (res.trailer) {
        s += '\n' + res.trailer;
    }
    delete res.trailer;
    return s;
}

/**
 * Create and return a formatter function for formatting Bunyan record
 * objects into strings.
 *
 * @param rec {Bunyan record object}
 * @param options {Object} Formatting options.
 *      - format {String} Formatting type. Defaults to 'wide'
 *        (aka 'paul'). Other possible values: 'json', 'short', 'inspect',
 *        etc.
 *      - jsonIndent {Number} An indent for JSON.stringify indent arg when
 *        when `format == 'json'`.
 *      - markup {String} A markup method for certain elements of the
 *        formatted string. Default is 'none'. Valid values: 'none', 'ansi',
 *        'html'.
 * @returns {Function} `function (rec) -> String`.
 *      - Warning: The formatter functions can only take valid Bunyan record
 *        objects, else they may blow up.
 *
 * TODO: clarify usage of isValidRecord (move it to bunyan.js), etc.
 */
function createFormatter(options) {
    if (!options) options = {};

    var format = options.format || 'wide';  // actually default might be 'paul'
    if (format === 'paul')  // backward compat name from bunyan 0.x
        format = 'wide';

    var markup = options.markup || 'none';
    var stylize = stylerFromMarkup[markup];
    if (!stylize) {
        throw new Error('unknown markup: %j', markup)
    }

    switch (format) {
    case 'json':
        return function jsonFormatter(rec) {
            return JSON.stringify(rec, null, options.jsonIndent) + '\n';
        }

    case 'inspect':
        return function inspectFormatter(rec) {
            return inspect(rec, false, Infinity, true) + '\n';
        }

    case 'wide':
        /*    [time] LEVEL: name[/component]/pid on hostname (src): msg* (extras...)
         *        msg (if msg is long or multi-line)
         *        --
         *        long and multi-line extras...
         *        --
         *        if have `req`, show it similar to raw HTTP request form
         *        --
         *        ditto `client_req`
         *        --
         *        if have `res`, show it similar to raw HTTP response
         *        --
         *        if have `err`, show the err stack
         */
        return function wideFormatter(origRec) {
        //try {
            var rec = recCopy(origRec);
            delete rec.v;

            // `rec.time` is a string if is parsed from a JSON file, or
            // a `Date` instance if from a live process.
            var time = (typeof (rec.time) === 'string'
              ? rec.time : rec.time.toISOString())
            time = stylize('[' + time + ']', 'time');
            delete rec.time;

            var nameStr = rec.name;
            delete rec.name;

            if (rec.component)
                nameStr += '/' + rec.component;
            delete rec.component;
            nameStr += '/' + rec.pid;
            delete rec.pid;

            var level = (upperPaddedNameFromLevel[rec.level]
                || "LVL" + rec.level);
            level = stylize(level, nameFromLevel[rec.level]);
            delete rec.level;

            var src = "";
            if (rec.src && rec.src.file) {
                var s = rec.src;
                if (s.func) {
                    src = _(" (%s:%d in %s)", s.file, s.line, s.func);
                } else {
                    src = _(" (%s:%d)", s.file, s.line);
                }
                src = stylize(src, 'src');
            }
            delete rec.src;

            var hostname = rec.hostname;
            delete rec.hostname;

            var extras = [];
            var details = [];

            if (rec.req_id) {
                extras.push("req_id=" + rec.req_id);
            }
            delete rec.req_id;

            if (rec.latency) {
                extras.push(rec.latency + "ms");
            }
            delete rec.latency;

            var onelineMsg;
            if (rec.msg.indexOf('\n') !== -1) {
                onelineMsg = '';
                details.push(indent(stylize(rec.msg, 'msgblock')));
            } else {
                onelineMsg = ' ' + stylize(rec.msg, 'msg');
            }
            delete rec.msg;

            if (rec.req) {
                var req = rec.req;
                details.push(indent(formatReq(req)));
                // E.g. for extra 'foo' field on 'req', add 'req.foo' at
                // top-level. This *does* have the potential to stomp on a
                // literal 'req.foo' key.
                Object.keys(req).forEach(function (k) {
                    rec["req." + k] = req[k];
                })
            }
            delete rec.req;

            if (rec.client_req) {
                details.push(indent(formatClientReq(rec.client_req)));
            }
            delete rec.client_req;

            if (rec.res) {
                var res = rec.res;
                var s = formatRes(res);
                if (s)
                    details.push(indent(s));
                // E.g. for extra 'foo' field on 'res', add 'res.foo' at
                // top-level. This *does* have the potential to stomp on a
                // literal 'res.foo' key.
                Object.keys(res).forEach(function (k) {
                    rec["res." + k] = res[k];
                })
            }
            delete rec.res;

            if (rec.err && rec.err.stack) {
                details.push(indent(rec.err.stack));
                delete rec.err;
            }

            var leftover = Object.keys(rec);
            for (var i = 0; i < leftover.length; i++) {
                var key = leftover[i];
                var value = rec[key];
                var stringified = false;
                if (typeof(value) !== 'string') {
                    value = JSON.stringify(value, null, 2);
                    stringified = true;
                }
                if (value.indexOf('\n') !== -1 || value.length > 50) {
                    details.push(indent(key + ': ' + value));
                } else if (!stringified && (value.indexOf(' ') != -1 ||
                                            value.length === 0)) {
                    extras.push(key + '=' + JSON.stringify(value));
                } else {
                    extras.push(key + '=' + value);
                }
            }

            extras = stylize(
                (extras.length ? ' (' + extras.join(', ') + ')' : ''),
                'extra');
            details = stylize(
                (details.length ? details.join('\n    --\n') + '\n' : ''),
                'extrablock');
            return _("%s %s: %s on %s%s:%s%s\n%s",
                time,
                level,
                nameStr,
                hostname || "<no-hostname>",
                src,
                onelineMsg,
                extras,
                details);
        //} catch (e) {
        //    warn("error in wideFormatter: rec=%j e=%s", rec, e.stack || e);
        //}
        }

    case 'short':
        return function shortFormatter(origRec) {
            var rec = recCopy(origRec);
            delete rec.v;

            var time = (typeof (rec.time) === 'string'
              ? rec.time : rec.time.toISOString())
            time = (time[10] === 'T' ? time.substr(11) : time);
            time = stylize(time, 'time');
            delete rec.time;

            var nameStr = rec.name;
            delete rec.name;

            if (rec.component)
                nameStr += '/' + rec.component;
            delete rec.component;
            delete rec.pid;

            var level = (upperPaddedNameFromLevel[rec.level]
                || "LVL" + rec.level);
            level = stylize(level, nameFromLevel[rec.level]);
            delete rec.level;

            var src = "";
            if (rec.src && rec.src.file) {
                var s = rec.src;
                if (s.func) {
                    src = _(" (%s:%d in %s)", s.file, s.line, s.func);
                } else {
                    src = _(" (%s:%d)", s.file, s.line);
                }
                src = stylize(src, 'src');
            }
            delete rec.src;

            var hostname = rec.hostname;
            delete rec.hostname;

            var extras = [];
            var details = [];

            if (rec.req_id) {
                extras.push("req_id=" + rec.req_id);
            }
            delete rec.req_id;

            if (rec.latency) {
                extras.push(rec.latency + "ms");
            }
            delete rec.latency;

            var onelineMsg;
            if (rec.msg.indexOf('\n') !== -1) {
                onelineMsg = '';
                details.push(indent(stylize(rec.msg, 'msgblock')));
            } else {
                onelineMsg = ' ' + stylize(rec.msg, 'msg');
            }
            delete rec.msg;

            if (rec.req) {
                var req = rec.req;
                details.push(indent(formatReq(req)));
                // E.g. for extra 'foo' field on 'req', add 'req.foo' at
                // top-level. This *does* have the potential to stomp on a
                // literal 'req.foo' key.
                Object.keys(req).forEach(function (k) {
                    rec["req." + k] = req[k];
                })
            }
            delete rec.req;

            if (rec.client_req) {
                details.push(indent(formatClientReq(rec.client_req)));
            }
            delete rec.client_req;

            if (rec.res) {
                var res = rec.res;
                var s = formatRes(res);
                if (s)
                    details.push(indent(s));
                // E.g. for extra 'foo' field on 'res', add 'res.foo' at
                // top-level. This *does* have the potential to stomp on a
                // literal 'res.foo' key.
                Object.keys(res).forEach(function (k) {
                    rec["res." + k] = res[k];
                })
            }
            delete rec.res;

            if (rec.err && rec.err.stack) {
                details.push(indent(rec.err.stack));
                delete rec.err;
            }

            var leftover = Object.keys(rec);
            for (var i = 0; i < leftover.length; i++) {
                var key = leftover[i];
                var value = rec[key];
                var stringified = false;
                if (typeof(value) !== 'string') {
                    value = JSON.stringify(value, null, 2);
                    stringified = true;
                }
                if (value.indexOf('\n') !== -1 || value.length > 50) {
                    details.push(indent(key + ': ' + value));
                } else if (!stringified && (value.indexOf(' ') != -1 ||
                                            value.length === 0)) {
                    extras.push(key + '=' + JSON.stringify(value));
                } else {
                    extras.push(key + '=' + value);
                }
            }

            extras = stylize(
                (extras.length ? ' (' + extras.join(', ') + ')' : ''),
                'extra');
            details = stylize(
                (details.length ? details.join('\n    --\n') + '\n' : ''),
                'extrablock');
            return _("%s %s %s:%s%s\n%s",
                time,
                level,
                nameStr,
                onelineMsg,
                extras,
                details);
        }

    case 'simple':
        return function simpleFormatter(rec) {
            // <http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/SimpleLayout.html>
            return _("%s - %s\n",
                upperNameFromLevel[rec.level] || "LVL" + rec.level, rec.msg);
        }

    default:
        throw new Error(_('unknown format: %j', format));
    }
}

/**
 * Format a single Bunyan record.
 *
 * @param rec {Bunyan record object}
 * @param options {Object} Formatting options. The same options as for
 *      `createFormatter`.
 * @returns {String}
 */
function format(rec, options) {
    return createFormatter(options)(rec);
}


//---- Exports

module.exports = {
    format: format,
    createFormatter: createFormatter,
};
