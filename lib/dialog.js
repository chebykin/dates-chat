"use strict";

module.exports = Dialog;

var events = require('events'),
    Q = require('q'),
    eventEmitter = new events.EventEmitter(),
    Wallet = require('./wallet'),
    PublicError = require('./errors').public,
    utils = require('./utils'),
    billing = require('../billing');

function Dialog (one, another) {
    this.setup_man_and_woman(one, another);
    this.price_per_minute = parseFloat(billing.price_per_minute_for.chat);
    /**
     * Dialog statuses:
     *
     * initialized - man send message to woman, timer is off.
     * on - dialog is open and woman sent response to man,
     *      man sending new message while last one is from woman,
     *      timer is on
     * @type {string}
     */
    this.state = 'initialized';

    if (!this.man_id || !this.woman_id) {
        throw new Error("Dialog: wrong arguments for constructor");
    }

    this.wallet = new Wallet(this.man_id);
}

/**
 * Steps:
 * - check for men balance
 */
Dialog.prototype.start = function () {
    var deferred = Q.defer();

    eventEmitter.emit('beforeStart');

    if (this.wallet.balance() > this.price_per_minute) {
        deferred.resolve(3);
    } else {
        deferred.reject(new Error('Account balance is too low'));
    }

    eventEmitter.emit('afterStart');

    return deferred.promise;
};

/**
 * Can be closed only by man role
 */
Dialog.prototype.deliver = function () {
    var deferred = Q.defer();

    return deferred.promise;
};

Dialog.prototype.close = function () {

};

/**
 * Redis key man_woman
 */
Dialog.prototype.key = function () {
    return "dialogs:" + this.dialog_key;
};

/**
 * Checking ids in online websocket connections only.
 *
 * @param first
 * @param second
 */
Dialog.prototype.setup_man_and_woman = function (first, second) {
    this.dialog_key = utils.dialog_key(first, second);
    var ids = this.dialog_key.split('_');

    this.man_id = parseInt(ids[0], 10);
    this.woman_id = parseInt(ids[1], 10);
};
/*
Stuff TODO:
- interval
- free mode for account
 */
