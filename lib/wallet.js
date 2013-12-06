"use strict";

var config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    request = require('request'),
    PublicError = require('./errors').public,
    Q = require('q'),
    _ = require('underscore');

function Wallet(man_id, woman_id) {
    this.man_id = parseInt(man_id, 10);
    this.woman_id = parseInt(woman_id, 10);
}

Wallet.prototype.balance = function () {
    var deferred = Q.defer(),
        url = config.billing.hostname + ':' + config.billing.port +
            config.billing.path + '/wallets/' + this.man_id.toString();

    request.get(url, function (err, res, body) {
        if (err) {
            deferred.reject(new PublicError(err.message, 'billing_error'));
            return;
        }

        try {
            var result = JSON.parse(body);

            if (res.statusCode !== 200) {
                deferred.reject(new PublicError(err.message, 'billing_error'));
            } else if (result.ok === true) {
                deferred.resolve(parseInt(result.balance, 10));
            } else {
                deferred.reject(new Error(result.description));
            }
        } catch (e) {
            deferred.reject(new PublicError(e.message, 'billing_error'));
        }
    });

    return deferred.promise;
};

Wallet.prototype.charge = function (amount) {
    var deferred = Q.defer(),
        url = config.billing.hostname + ':' + config.billing.port + config.billing.path + '/transactions/';

    request.post({
        url: url,
        timeout: config.billing.timeout,
        json: {
            man_id: this.man_id,
            woman_id: this.woman_id,
            service: 'chat',
            amount: amount
        }
    }, function (err, res, result) {
        if (res.statusCode !== 200) {
            deferred.reject(new PublicError('Server error', 'billing_error'));
        } else if (result.ok === true) {
            deferred.resolve(parseInt(result.new_balance, 10));
        } else {
            deferred.reject(new Error(result.description));
        }
    });

    return deferred.promise;
};

module.exports = Wallet;