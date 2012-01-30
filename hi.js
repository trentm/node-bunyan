var Logger = require('./lib/bunyan');

var log = new Logger({facility: "myapp", level: "info"});
console.log("log.info() is:", log.info())
log.info("hi");
log.info("hi", "trent");
log.info("hi %s there", true);
log.info({foo:"bar"}, "hi %d", 1, "two", 3);


console.log("\n--\n")

function Wuzzle(options) {
  this.log = options.log;
  this.log.info("creating a wuzzle")
}

Wuzzle.prototype.woos = function () {
  this.log.warn("This wuzzle is woosey.")
}

var wuzzle = new Wuzzle({log: log.clone({component: "wuzzle"})});
wuzzle.woos();
log.info("done with the wuzzle")

