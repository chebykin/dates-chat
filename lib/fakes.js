"use strict";

var Fakes = module.exports = {};

var hat = require('hat'),
    Q = require('q'),
    _ = require('underscore'),
    redis = require('../lib/redis').current(),
    config = require('../config'),
    user = require('./user'),
    websocks = {men: [], women: []},
    url = config.self_address,
    previous_ids = {men: null, women: null},
    restartInterval = {men: null, women: null};

function Fake() {
}

Fake.prototype.send = function (data) {
};
Fake.prototype.close = function () {
};

function ids(sex) {
    var deferred = Q.defer();

    redis.smembers('chat:fakes:' + sex, function (err, result) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
}

function check(sex) {
    ids(sex).then(function (fakes) {
        if (!_.isEqual(fakes, previous_ids[sex])) {
            previous_ids[sex] = fakes;
            clearInterval(restartInterval[sex]);
            restart(sex);
            restartInterval[sex] = setInterval(restart.bind(undefined, sex), config.intervals.fake_restart_interval);
        }
    });
}

function restart(sex) {
    websocks[sex].forEach(function (ws) {
        ws.close();
        delete user[sex].all[ws.user_id];
        ws = null;
    });

    websocks[sex] = [];
    setTimeout(start.bind(undefined, sex), 3000);
}

function start(sex) {
    ids(sex).then(function (fakes) {
        console.log('start for', sex, 'and', fakes);
        fakes.forEach(function (id) {
            var ws = new Fake();

            ws.collection = user[sex];
            ws.user_id = id;
            ws.role = sex;
            user.user_sex[id] = sex;
            user[sex].all[id] = [ws];
            websocks[sex].push(ws);
        });
    });
}

Fakes.init = function () {
    setInterval(check.bind(undefined, 'men'), config.intervals.fake_check_interval);
    setInterval(check.bind(undefined, 'women'), config.intervals.fake_check_interval);
    restartInterval.men = setInterval(restart.bind(undefined, 'men'), config.intervals.fake_restart_interval);
    restartInterval.women = setInterval(restart.bind(undefined, 'women'), config.intervals.fake_restart_interval);
};