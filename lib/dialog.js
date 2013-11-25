var events = require('events'),
    Q = require('q'),
    eventEmitter = new events.EventEmitter(),
    Wallet = require('./wallet'),
    billing = require('../billing');

function Dialog (man_id, woman_id) {
    this.man_id = parseInt(man_id, 10);
    this.woman_id = parseInt(woman_id, 10);
    this.price_per_minute = parseFloat(billing.price_per_minute_for.chat);

    if (!this.man_id || !this.woman_id) {
        throw new Error("Dialog: wrong arguments for constructor");
    }

    this.wallet = new Wallet(man_id);
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

/*
Stuff TODO:
- interval
- free mode for account
 */

module.exports = Dialog;