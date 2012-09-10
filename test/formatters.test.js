/*
 * Copyright (c) 2012 Trent Mick. All rights reserved.
 * Copyright (c) 2012 Joyent Inc. All rights reserved.
 *
 * Test Bunyan formatters.
 */

var util = require('util'),
  inspect = util.inspect,
  _ = util._;
var bunyan = require('../lib/bunyan');
var formatters = require('../lib/formatters');


// node-tap API
//var test = require('tap').test;
if (require.cache[__dirname + '/helper.js'])
    delete require.cache[__dirname + '/helper.js'];
var helper = require('./helper.js');
var after = helper.after;
var before = helper.before;
var test = helper.test;



//---- internal support stuff

function Catcher() {
  this.records = [];
}
Catcher.prototype.write = function (record) {
  this.records.push(record);
}

var catcher = new Catcher();
var log = new bunyan.createLogger({
  name: 'buffer.test',
  streams: [
    {
      type: 'raw',
      stream: catcher,
      level: 'trace'
    }
  ]
});



//---- tests

test('format', function (t) {
  var line = '{"name":"amon-relay","hostname":"headnode","pid":2909,"level":30,"msg":"Getting master URL from MAPI.","time":"2012-02-23T03:12:15.498Z","v":0}';
  var rec = JSON.parse(line);
  var s;

  s = formatters.format(rec, {mode: 'json'});
  t.equal(s, line + '\n', 'json');
  s = formatters.format(rec, {mode: 'json', jsonIndent: 2});
  t.equal(s, JSON.stringify(rec, null, 2) + '\n', 'json, indent 2');

  s = formatters.format(rec, {mode: 'simple'});
  t.equal(s, 'INFO - Getting master URL from MAPI.\n', 'simple');

  s = formatters.format(rec, {mode: 'inspect'});
  t.equal(s,
    "{ name: \u001b[32m'amon-relay'\u001b[39m,\n  hostname: \u001b[32m'headnode'\u001b[39m,\n  pid: \u001b[33m2909\u001b[39m,\n  level: \u001b[33m30\u001b[39m,\n  msg: \u001b[32m'Getting master URL from MAPI.'\u001b[39m,\n  time: \u001b[32m'2012-02-23T03:12:15.498Z'\u001b[39m,\n  v: \u001b[33m0\u001b[39m }\n",
    'inspect');

  s = formatters.format(rec, {mode: 'wide'});
  t.equal(s,
    '[2012-02-23T03:12:15.498Z]  INFO: amon-relay/2909 on headnode: Getting master URL from MAPI.\n',
    'wide');
  s = formatters.format(rec, {mode: 'wide', markup: 'ansi'});
  t.equal(s,
    '[2012-02-23T03:12:15.498Z] \u001b[36m INFO\u001b[39m: amon-relay/2909 on headnode: \u001b[36mGetting master URL from MAPI.\u001b[39m\n',
    'wide, ansi');

  s = formatters.format(rec, {mode: 'short'});
  t.equal(s,
    '03:12:15.498Z  INFO amon-relay: Getting master URL from MAPI.\n',
    'short');
  s = formatters.format(rec, {mode: 'short', markup: 'ansi'});
  t.equal(s,
    '03:12:15.498Z \u001b[36m INFO\u001b[39m amon-relay: \u001b[36mGetting master URL from MAPI.\u001b[39m\n',
    'short');

  t.end();
});


//XXX More...
