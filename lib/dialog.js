"use strict";

module.exports = Dialog;

var events = require('events'),
    Q = require('q'),
    config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    Wallet = require('./wallet'),
    Tracker = require('./tracker'),
    utils = require('./utils'),
    men = require('./user').men,
    women = require('./user').women,
    dialogs = require('./dialogs_collection'),
    billing = require('../billing');

function Dialog (one, another) {
    this.setup_man_and_woman(one, another);

    if (!this.man_id || !this.woman_id) {
        throw new Error("Dialog: wrong arguments for constructor");
    }

    this.price_per_minute = parseFloat(billing.price_per_minute_for.chat);
    this.state = 'off';
    this.last_message_role = null;
    this.man_active = false;
    this.woman_active = false;

    this.tracker = new Tracker();
    this.wallet = new Wallet(this.man_id);

    this.tracker.on('tick', this.tick_handler);
    this.tracker.on('manual_off_timeout', this.close.bind(this));
    this.tracker.on('inactive_timeout', this.close.bind(this));
}

Dialog.prototype.initialize_man = function () {
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

Dialog.prototype.deliver = function (message) {
    var deferred = Q.defer(),
        _dialog = this,
        sender_id = message.sender_id;

    if (this.state === 'off') {
        if (sender_id === this.man_id) {
            this.initialize_man()
                .then(function () {
                    _dialog.man_active = true;
                    _dialog.last_message_is_from(
                        // do not start tracker
                        function () {
                            deferred.resolve({});
                        },
                        // start tracker immediately
                        function () {
                            _dialog.start();
                            deferred.resolve({});
                        }
                    );

                })
                .fail(function (e) {
                    deferred.reject(e);
                    _dialog.close();
                });
        } else if (sender_id === this.woman_id) {
            this.woman_active = true;
            deferred.resolve({});
            this.close();
        } else {
            throw new Error('Dialog deliver got unknown sender id');
        }
    }
    else if (this.state === 'initialized')
    {
        if (sender_id === this.man_id) {
            deferred.resolve({});
        } else if (sender_id === this.woman_id) {
            this.start();
            deferred.resolve({});
        }
    }
    else if (this.state === 'on')
    {
        this.tracker.reset_inactive_timeout();
        deferred.resolve({});
    }

    return deferred.promise;
};

Dialog.prototype.manual_off = function () {
    if (this.last_message_role === 'woman') {
        this.state = 'manual off';
        this.tracker.start_manual_off_timeout();
    } else {
        this.close();
    }
};

Dialog.prototype.start = function () {
    this.state = 'on';
    this.tracker.start();
};
/**
 * Can be closed only by man role
 */
Dialog.prototype.close = function () {
    dialogs.del(this.dialog_key);
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
    var _dialog = this;

    redis.lrange(this.key(), -1, -1, function (err, res) {
        if (err !== null) {
            throw new Error(err);
        } else if (res.length > 0) {
            var message = JSON.parse(res[0]),
                sender = parseInt(message.sender_id, 10);

            if (men.keys().indexOf(sender) >= 0) {
                _dialog.last_message_role = 'man';
                man_cb();
            } else if (women.keys().indexOf(sender) >= 0) {
                _dialog.last_message_role = 'woman';
                woman_cb();
            }
        } else if (res.length === 0) {
            man_cb();
        }
    });
};
