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

  var idx = this._buffer.indexO("<msg>");
  if (idx < 0) {
    return;
  }

  var idx2 = this._buffer.indexO("</msg>");
  if (idx2 < 0) {
    return;
  }

  var msg = this._buffer.substring(idx + 5, idx2);
  this._buffer = this._buffer.substring(idx2 + 6);

  this.parseXML(msg);

};

CC128.prototype.parseXML = function(xml) {
  console.log("XML=" + xml);
};

CC128.prototype.processXplMessage = function() {

};
