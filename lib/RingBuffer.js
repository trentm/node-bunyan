var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * RingBuffer is a Writable Stream that just stores the last N records in
 * memory.
 *
 * @param {Object} [options] - with the following fields:
 * @param {Object.limit} [options.limit] - number of records to keep in memory
 */
var RingBuffer = module.exports = function RingBuffer(options) {
    this.limit = options && options.limit ? options.limit : 100;
    this.writable = true;
    this.records = [];
    this._idx = -1;
    EventEmitter.call(this);
};

util.inherits(RingBuffer, EventEmitter);

RingBuffer.prototype.write = function (record) {
    if (!this.writable) {
        throw (new Error('RingBuffer has been ended already'));
    }

    var idx = (++this._idx) % this.limit;
    this.records[idx] = record;

    return true;
};

RingBuffer.prototype.end = function () {
    if (arguments.length > 0)
        this.write.apply(this, Array.prototype.slice.call(arguments));
    this.writable = false;
};

RingBuffer.prototype.destroy = function () {
    this.writable = false;
    this.emit('close');
};

RingBuffer.prototype.destroySoon = function () {
    this.destroy();
};

