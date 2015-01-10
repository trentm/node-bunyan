'use strict';

var Transform = require('stream').Transform,
    util = require('util');
    
function Formatter() {
    Transform.call(this);
    this._writableState.objectMode = true;
};
util.inherits(Formatter, Transform);

Formatter.prototype._transform = function (rec, encoding, cb) {
    this.push('bork\n');
    cb();
};

module.exports = Formatter;
