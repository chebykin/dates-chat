"use strict";

module.exports = Dialog;

var events = require('events'),
    Q = require('q'),
    eventEmitter = new events.EventEmitter(),
    config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    Wallet = require('./wallet'),
    Tracker = require('./tracker'),
    PublicError = require('./errors').public,
    utils = require('./utils'),
    men = require('./user').men,
    women = require('./user').women,
    billing = require('../billing');

function Dialog (one, another) {
    this.setup_man_and_woman(one, another);
    this.price_per_minute = parseFloat(billing.price_per_minute_for.chat);
    /**
     * Dialog statuses:
     *
     * off - just created, nothing happened
     * initialized - man sent message to woman,
     *              woman sent message to man,
     *              timer is off
     *
     * on - dialog is open and woman sent response to man,
     *      man sending new message while last one is from woman,
     *      timer is on
     * @type {string}
     */
    this.state = 'off';


    if (!this.man_id || !this.woman_id) {
        throw new Error("Dialog: wrong arguments for constructor");
    }

    this.tracker = new Tracker();
    this.wallet = new Wallet(this.man_id);

    this.tracker.on('tick', this.tick_handler);
}

/**
 * Steps:
 * - check for men balance
 */
Dialog.prototype.start = function () {
    var deferred = Q.defer(),
        _dialog = this;

    this.wallet.balance()
        .then(function (balance) {
            if (balance > _dialog.price_per_minute) {
                deferred.resolve({});
                _dialog.state = 'initialized';
            } else {
                deferred.reject(new Error('Account balance is too low'));
            }
        })
        .fail(function (e) {
            deferred.reject(e);
        });

    return deferred.promise;
};

Dialog.prototype.tick_handler = function () {
    // charge balance
    // if balance too low closing dialog
};

Dialog.prototype.start_tracker = function () {
    this.tracker.start();
};

Dialog.prototype.deliver = function (message) {
    var deferred = Q.defer(),
        _dialog = this;

    if (this.state === 'off') {
        this.start()
            .then(function () {
                _dialog.last_message_is_from(
                    // do not start tracker
                    function () {
                        deferred.resolve({});
                    },
                    // start tracker immediately
                    function () {
                        _dialog.state = 'on';
                        _dialog.start_tracker();
                        deferred.resolve({});
                    }
                );

            })
            .fail(function (e) {
                deferred.reject(e);
            });
    }

    return deferred.promise;
};

/**
 * Can be closed only by man role
 */
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

/**
 * Call specified callback. If there is no any message, man callback will be called.
 * @param man_cb
 * @param woman_cb
 */
Dialog.prototype.last_message_is_from = function (man_cb, woman_cb) {
    redis.lrange(this.key(), -1, -1, function (err, res) {
        if (err !== null) {
            throw new Error(err);
        } else if (res.length > 0) {
            var message = JSON.parse(res[0]),
                sender = parseInt(message.sender_id, 10);

            if (men.keys().indexOf(sender) >= 0) {
                man_cb();
            } else if (women.keys().indexOf(sender) >= 0) {
                woman_cb();
            }
        } else if (res.length === 0) {
            man_cb();
        }
    });
};
/*
Stuff TODO:
- interval
- free mode for account
 */
