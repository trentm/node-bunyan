// See how bunyan behaves with an un-stringify-able object.
var bunyan = require('../lib/bunyan');

var log = bunyan.createLogger({src: true, name: 'foo'});

// Make a circular object (cannot be JSON-ified).
var myobj = {
    foo: 'bar'
};
myobj.myobj = myobj;

log.info({obj: myobj}, 'hi there');   // <--- here
