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
    this.records = new Array(this.limit);
    this._idx = -1;
    EventEmitter.call(this);
};

util.inherits(RingBuffer, EventEmitter);

RingBuffer.prototype.write = function write(record) {
    if (!this.writable) {
        throw (new Error('RingBuffer has been ended already'));
    }

    var idx = (++this._idx) % this.limit;
    this.records[idx] = record;

    return true;
};

RingBuffer.prototype.end = function end() {
    if (arguments.length > 0)
        this.write.apply(this, Array.prototype.slice.call(arguments));
    this.writable = false;
};

RingBuffer.prototype.destroy = function destroy() {
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
 * @param {Number} idx - The index to get.  0 would be the oldest stored
 * record, 1 the second to oldest, 2 ... You get the picture.
 */
RingBuffer.prototype.get = function get(idx) {
    var _idx = this._idx;

    // Base case: If _idx is <= limit then we can just use
    // the idx passed in.
    if (_idx < this.limit) {
        return this.records[idx];
    }

    // Else we have to calculate it with the following formula.
    var index = (this._idx + 1) + idx;

    if (index < 0) {
        return undefined;
    }

    return this.records[index % this.limit];
};

/**
 * The opposite of get.  Instead of getting the oldest records, this will
 * get the newest records.
 *
 * @param {Number} idx - The index from the latest to get. 0 === latest.
 */
RingBuffer.prototype.getLatest = function getLatest(idx) {
    var index = this._idx - (idx || 0);

    if (index < 0) {
        return undefined;
    }

    return this.records[index % this.limit];
};

/**
 * The current size of the records array.
 */
RingBuffer.prototype.size = function size() {
    var size = this._idx + 1;
    if (size > this.limit) {
        return this.limit;
    }
    return size;
};

RingBuffer.prototype.destroySoon = function destroySoon() {
    this.destroy();
};
