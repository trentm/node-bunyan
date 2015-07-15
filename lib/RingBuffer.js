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

/**
 * Will get the record from the list by index.
 * This index is calculated based on the current index.  This
 * should be equivalent to ringBuffer.records[idx] when push/shift
 * managed the array.
 *
 * If idx is larger than options.limit or the currently stored records then
 * undefined will be returned.
 *
 *
 * @param {Number} idx - The index to get.  0 would be the last stored
 * record, 1 the second to last, 2 ... You get the picture. Surprisingly
 * enough this adds functionality which is i can pass in -1 and get the
 * oldest record.
 */
RingBuffer.prototype.get = function (idx) {
    var index = this._idx - idx;

    if (index < 0) {
        return undefined;
    }

    return this.records[index % this.limit];
};

RingBuffer.prototype.destroySoon = function () {
    this.destroy();
};

