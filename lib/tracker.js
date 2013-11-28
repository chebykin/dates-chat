"use strict";

module.exports = Tracker;

var config = require('../config')[process.env.NODE_ENV],
    events = require('events'),
    util =require('util');

function Tracker() {
    this.state = 'off';
    this.interval = config.timeouts.inactive_timeout;
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