var Logger = require('./lib/bunyan');
var log = new Logger({facility: "myapp", level: "info"});
console.log("log.info() is:", log.info())
log.info("hi");
log.info("hi", "trent");
log.info("hi %s there", true);
log.info({foo:"bar"}, "hi %d", 1, "two", 3);


console.log("\n--\n")


//console.log("\n--\n")
//xxx = console.log;
//var INFO = 2;
//
//function foo() {
//  console.log("function foo arguments:", arguments)
//}
//
//function Bar() {
//  this.level = 1;
//}
//Bar.prototype.info = function (fields, msg) {
//  console.log("function info arguments:", arguments)
//  var msgArgs;
//  if (arguments.length === 0) {             // `log.info()`
//    return (this.level <= INFO);
//  } else if (this.level > INFO) {
//    return;
//  } else if (typeof fields === 'string') {  // `log.info(msg, ...)`
//    fields = null;
//    msgArgs = Array.prototype.slice.call(arguments);
//    xxx("msgArgs: ", msgArgs, arguments)
//  } else {                                  // `log.info(fields, msg, ...)`
//    msgArgs = Array.prototype.slice.call(arguments, 1);
//  }
//  xxx("info start: arguments:", arguments.length, arguments, msgArgs)
//  //var rec = this._mkRecord(fields, INFO, msgArgs);
//  //this._emit(rec);
//}
//
//
//foo()
//foo("one")
//foo("one", "two")
//
//bar = new Bar();
//bar.info()
//bar.info("one")
//bar.info("one", "two")
