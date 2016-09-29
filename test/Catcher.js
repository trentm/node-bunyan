var Catcher = module.exports = exports = function Catcher() {
    this.records = [];
}

Catcher.prototype.write = function (record) {
    this.records.push(record);
}

Catcher.prototype.clear = function () {
    this.records = [];
}
