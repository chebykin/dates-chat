"use strict";

module.exports = Tracker;

var config = require('../config')[process.env.NODE_ENV],
    events = require('events'),
    util =require('util');

function Tracker() {
    this.state = 'off';
    this.interval = config.timeouts.charge_interval;
    this.manual_off_timeout = null;
    this.inactive_timeout = null;
}

util.inherits(Tracker, events.EventEmitter);

Tracker.prototype.start = function () {
    var _tracker = this;

    this.emit('start');

    if (this.state === 'off') {
        this.reset_inactive_timeout();
        this.state = 'on';
        setInterval(function () {
            _tracker.emit('tick');
        }, this.interval);
    }
};

Tracker.prototype.reset_inactive_timeout = function () {
    var _tracker = this;

    if (this.inactive_timeout) {
        clearTimeout(this.inactive_timeout);
        this.inactive_timeout = null;
    }

    this.inactive_timeout = setTimeout(function () {
        _tracker.emit('inactive_timeout');
    }, config.timeouts.inactive_timeout);
};

Tracker.prototype.start_manual_off_timeout = function () {
    var _tracker = this;

    this.manual_off_timeout = setTimeout(function () {
        _tracker.emit('manual_off_timeout');
    }, config.timeouts.manual_off_timeout);

};

Tracker.prototype.remove_manual_off_timeout = function () {
    clearInterval(this.manual_off_timeout);
};