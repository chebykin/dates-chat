"use strict";

module.exports = Tracker;

var events = require('events'),
    util =require('util');

function Tracker() {
    this.status = 'off';
    this.timeout = 60000;
    this.interval = null;
}

util.inherits(Tracker, events.EventEmitter);

Tracker.prototype.start = function () {
    var _tracker = this;

    this.emit('start');

    if (this.status === 'off') {
        this.status = 'on';
        this.interval = setInterval(function () {
            _tracker.emit('tick');
        }, this.timeout);
    }
};