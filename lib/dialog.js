"use strict";

module.exports = Dialog;

var events = require('events'),
    Q = require('q'),
    redis = require('../lib/redis').current(),
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
    this._state = 'off';
    this.last_message_role = null;
    this.man_active = false;
    this.woman_active = false;

    this.tracker = new Tracker();
    this.wallet = new Wallet(this.man_id, this.woman_id);

    this.tracker.on('tick', this.tick_handler.bind(this));
    this.tracker.on('manual_off_timeout', this.close.bind(this));
    this.tracker.on('inactive_timeout', this.close.bind(this));

    Object.defineProperty(this, 'state', {
        get: function () {
            return this._state;
        }.bind(this),
        set: function (newValue) {
            var state = (newValue === 'on') ? 'on' : 'off';

            this._state = newValue;

            men.update_dialog_state(state, this.man_id, this.woman_id);
            women.update_dialog_state(state, this.woman_id, this.man_id);

            console.debug('Dialog ' + this.man_id + '/' + this.woman_id + ' changed state to ' + newValue.toUpperCase());
        }.bind(this)
    });
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
    var _dialog = this;

    this.wallet.charge(billing.price_per_minute_for.chat)
        .fail(function (e) {
            _dialog.close(e.message);
        });
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
                    _dialog.save_message(message);
                    deferred.resolve({});
                })
                .fail(function (e) {
                    deferred.reject(e);
                    _dialog.close();
                });
        } else if (sender_id === this.woman_id) {
            this.woman_active = true;
            _dialog.save_message(message);
            deferred.resolve({});
            this.close();
        } else {
            throw new Error('Dialog deliver got unknown sender id');
        }
    }
    else if (this.state === 'initialized')
    {
        if (sender_id === this.man_id) {
            _dialog.save_message(message);
            deferred.resolve({});
        } else if (sender_id === this.woman_id) {
            this.start()
                .then(function () {
                    _dialog.save_message(message);
                    deferred.resolve({});
                })
                .fail(function (e) {
                    // REVIEW: may be dialog should be closed
                    _dialog.save_message(message);
                    deferred.reject(e);
                });
        }
    }
    else if (this.state === 'on')
    {
        this.tracker.reset_inactive_timeout();
        _dialog.save_message(message);
        deferred.resolve({});
    }
    else if (this.state === 'manual off')
    {
        if (sender_id === this.man_id) {
            this.start()
                .then(function () {
                    _dialog.tracker.remove_manual_off_timeout();
                    _dialog.save_message(message);
                    deferred.resolve({});
                })
                .fail(function (e) {
                    deferred.reject(e);
                });
        } else if (sender_id === this.woman_id) {
            deferred.resolve({});
            _dialog.save_message(message);
        }
    }
    else
    {
        throw new Error('Wrong dialog state');
    }

    return deferred.promise;
};

// TODO: add test
Dialog.prototype.manual_on = function () {
    var deferred = Q.defer(),
        _dialog = this;

    this.start()
        .then(function () {
            _dialog.tracker.remove_manual_off_timeout();
            deferred.resolve({});
        })
        .fail(function (e) {
            deferred.reject(e);
        });

    return deferred.promise;
};

Dialog.prototype.manual_off = function () {
    if (this.last_message_role === 'woman') {
        this.state = 'manual off';
        this.tracker.start_manual_off_timeout();
    } else {
        this.state = 'manual off';
        this.close();
    }
};

Dialog.prototype.start = function () {
    var _dialog = this,
        deferred = Q.defer();

    this.wallet.charge(billing.price_per_minute_for.chat)
        .then(function () {
            _dialog.state = 'on';
            _dialog.tracker.start();
            deferred.resolve({});
        })
        .fail(function (e) {
            deferred.reject(e);
        });

    return deferred.promise;
};
/**
 * Can be closed only by man role
 */
Dialog.prototype.close = function (message) {
    message = message || 'Billing error';
    this.tracker.destruct();
    this.tracker = null;
    dialogs.del(this.dialog_key, message);
    console.debug('Dialog ' + this.man_id + '/' + this.woman_id + ' CLOSED');
};

/**
 * Redis key man_woman
 */
Dialog.prototype.key = function () {
    return "dialogs:" + this.dialog_key;
};

Dialog.prototype.save_message = function (message) {
    redis.rpush(this.key(), JSON.stringify(message));
    redis.sadd('chat_contacts:' + message.sender_id, message.recipient_id);
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
