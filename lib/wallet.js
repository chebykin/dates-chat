var config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    request = require('request'),
    _ = require('underscore'),
    Q = require('q');

function Wallet(user_id) {
    this.user_id = parseInt(user_id, 10);
}

Wallet.prototype.balance = function () {
    var deferred = Q.defer(),
        url = 'http://' + config.billing.hostname + ':' + config.billing.port
            + config.billing.path + '/wallets/' + this.user_id.toString();

    request.get(url, function (err, res, body) {
        var result = JSON.parse(body);

        if (res.statusCode !== 200) {
            deferred.reject(new Error('Billing server error'));
        } else if (result.ok === true) {
            deferred.resolve(parseFloat(result.balance));
        } else {
            deferred.reject(new Error(result.description));
        }
    });

    return deferred.promise;
};

Wallet.prototype.charge = function (amount) {
    var deferred = Q.defer(),
        url = 'http://' + config.billing.hostname + ':' + config.billing.port + config.billing.path + '/transactions';

    request.post({
        url: url,
        timeout: config.billing.timeout,
        json: {
            woman_id: 103,
            service: 'chat',
            amount: amount
        }
    }, function (err, res, result) {
        if (res.statusCode !== 200) {
            deferred.reject(new Error('Billing server error'));
        } else if (result.ok === true) {
            deferred.resolve(parseFloat(result.new_balance));
        } else {
            deferred.reject(new Error(result.description));
        }
    });

    return deferred.promise;
};

module.exports = Wallet;