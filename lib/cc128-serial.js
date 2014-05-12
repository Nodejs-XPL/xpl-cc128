var Util = require('util');
var Events = require('events');

var fhtTempCommands = {
  "manualTemp" : 0x45,
  "comfortTemp" : 0x82,
  "economicTemp" : 0x84,
  "windowOpenTemp" : 0x8a
};

var CC128 = function(serialWriter, xplWriter, configuration, callback) {

  var self = this;
  this._xplWriter = xplWriter;
  this._serialWriter = serialWriter;
  this._configuration = configuration || {};
  this._buffer = "";

  if (callback) {
    callback(null, self);
  }
};

Util.inherits(CC128, Events.EventEmitter);
module.exports = CC128;

CC128.prototype.processSerialData = function(data) {
  this._buffer += data;

  var idx = this._buffer.indexOf("<msg>");
  if (idx < 0) {
    return;
  }
  idx += 1 + 3 + 1;

  var idx2 = this._buffer.indexOf("</msg>", idx);
  if (idx2 < 0) {
    return;
  }

  var msg = this._buffer.substring(idx, idx2);
  this._buffer = this._buffer.substring(idx2 + 6);

  // console.log("xml=" + msg);

  var id = this.getNode(msg, "id");
  if (!id) {
    console.error("No id in XML '" + msg + "'");
    return;
  }

  var tmpr = this.getNode(msg, "tmpr");
  if (tmpr) {
    // console.log("Temperature=" + tmpr);
    this._xplWriter({
      device : "CC128-" + id,
      type : "temp",
      current : parseFloat(tmpr),
      units : "c"
    });
  }

  for (var i = 1; i <= 3; i++) {
    var ch = this.getNode(msg, "ch" + i);
    if (ch) {
      var watts = this.getNode(ch, "watts");
      // console.log("watts=" + watts);
      if (watts) {
        this._xplWriter({
          device : "CC128-" + id + "-" + i,
          type : "power",
          current : parseInt(watts, 10),
          units : "W"
        });
      }
    }
  }
};

CC128.prototype.getNode = function(xml, name) {

  var idx = xml.indexOf("<" + name + ">");
  if (idx < 0) {
    return null;
  }
  idx += 2 + name.length;

  var idx2 = xml.indexOf("</" + name + ">", idx);
  if (idx2 < 0) {
    return null;
  }

  var content = xml.substring(idx, idx2);
  return content;
};

CC128.prototype.processXplMessage = function() {

};
