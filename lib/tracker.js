"use strict";

module.exports = Tracker;

var events = require('events'),
    util =require('util');

function Tracker() {
    this.state = 'off';
    this.interval = 60000;
}

util.inherits(Tracker, events.EventEmitter);

Tracker.prototype.start = function () {
    var _tracker = this;

    this.emit('start');

    if (this.state === 'off') {
        this.state = 'on';
        setInterval(function () {
            _tracker.emit('tick');
        }, this.interval);
    }
};