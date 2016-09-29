/*
 * Copyright (c) 2016 Trent Mick. All rights reserved.
 *
 * Test that log filters are applied
 */

var sinon = require('sinon');
var util = require('util'),
    format = util.format,
    inspect = util.inspect;
var p = console.log;

var bunyan = require('../lib/bunyan');
var Catcher = require('./Catcher');

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
        delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var after = tap4nodeunit.after;
var before = tap4nodeunit.before;
var test = tap4nodeunit.test;


var log;
var catcher;

before(function (cb) {
    catcher = new Catcher();
    log = bunyan.createLogger({
        name: 'log1',
        streams: [
            {
                type: 'raw',
                stream: catcher,
                level: 'info'
            }
        ]
    });

    cb();
})


test('log level filtering must be done first', function (t) {
    var filter = sinon.stub().returns(true);
    log.addFilter(filter);
    log.debug('debug...');
    t.equal(catcher.records.length, 0);
    t.equal(filter.callCount, 0);
    t.end();
});


test('filters must be applied with called arguments', function (t) {
    var filter = function (level, msgArgs) {
        return msgArgs[0] === 'a';
    };
    log.addFilter(filter);
    log.info('a');
    log.info('b');
    log.info('a');

    t.equal(catcher.records.length, 2);
    t.equal(catcher.records[0].msg, 'a');
    t.equal(catcher.records[1].msg, 'a');
    t.end();
});


test('filters must be inherited from parent loggers', function (t) {
    var parentFilter = function (level, msgArgs) {
        return msgArgs[1] === 'a';
    };
    log.addFilter(parentFilter);

    var childLog = log.child({
        filters: [
            function (level, msgArgs) {
                return msgArgs[2] === 'b';
            }
        ]
    });

    childLog.info('1: %s %s', 'a', 'c');
    childLog.info('2: %s %s', 'a', 'b');
    childLog.info('3: %s %s', 'b', 'a');
    childLog.info('4: %s %s', 'c', 'b');

    t.equal(catcher.records.length, 1);
    t.equal(catcher.records[0].msg, '2: a b');
    t.end();
});
