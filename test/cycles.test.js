/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 *
 * Make sure cycles are safe.
 */

var test = require('tap').test;
var Logger = require('../lib/bunyan.js');

var Stream = require('stream').Stream;
var outstr = new Stream;
outstr.writable = true;
var output = [];
outstr.write = function (c) {
  output.push(JSON.parse(c + ''));
};
outstr.end = function (c) {
  if (c) this.write(c);
  this.emit('end');
};

// these are lacking a few fields that will probably never match
var expect =
    [
      {
        "name": "blammo",
        "level": 30,
        "msg": "bango { bang: 'boom', KABOOM: [Circular] }",
        "v": 0
      },
      {
        "name": "blammo",
        "level": 30,
        "msg": "kaboom { bang: 'boom', KABOOM: [Circular] }",
        "v": 0
      },
      {
        "name": "blammo",
        "level": 30,
        "bang": "boom",
        "KABOOM": {
          "bang": "boom",
          "KABOOM": "[Circular]"
        },
        "msg": "",
        "v": 0
      }
    ];

var log = new Logger({
  name: 'blammo',
  streams: [
    {
      type: 'stream',
      level: 'info',
      stream: outstr
    }
  ]
});

test('cycles', function (t) {
  outstr.on('end', function () {
    output.forEach(function (o, i) {
      t.has(o, expect[i], 'log item ' + i + ' matches');
    });
    t.end();
  });

  var obj = { bang: 'boom' };
  obj.KABOOM = obj;
  log.info('bango', obj);
  log.info('kaboom', obj.KABOOM);
  log.info(obj);
  outstr.end();
  t.pass('did not throw');
});
