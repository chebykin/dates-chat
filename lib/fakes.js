"use strict";

var Fakes = module.exports = {};

var hat = require('hat'),
    Q = require('q'),
    _ = require('underscore'),
    redis = require('../lib/redis').current(),
    config = require('../config'),
    user = require('./user'),
    websocks = [],
    url = config.self_address,
    previous_ids,
    restartInterval,
    sock,
    fakes;

function Fake() {
}

Fake.prototype.send = function (data) {
};
Fake.prototype.close = function () {
};

function ids() {
    var deferred = Q.defer();

    redis.smembers('chat:fakes', function (err, result) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
}

function check() {
    ids().then(function (fakes) {
        if (!_.isEqual(fakes, previous_ids)) {
            previous_ids = fakes;
            clearInterval(restartInterval);
            restart();
            restartInterval = setInterval(restart, config.intervals.fake_restart_interval);
        }
    });
}

function restart() {
    websocks.forEach(function (ws) {
        ws.close();
        delete user.women.all[ws.user_id];
        ws = null;
    });

    websocks = [];

    setTimeout(start, 3000);
}

function start() {
    ids().then(function (fakes) {
        fakes.forEach(function (id) {
            var ws = new Fake();

            ws.collection = user.women;
            ws.user_id = id;
            ws.role = 'women';
            user.user_sex[id] = 'women';
            user.women.all[id] = [ws];
            websocks.push(ws);
        });
    });
}

Fakes.init = function () {
    setInterval(check, config.intervals.fake_check_interval);
    restartInterval = setInterval(restart, config.intervals.fake_restart_interval);
};