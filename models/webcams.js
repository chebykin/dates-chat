"use strict";
/*
Once in some interval it should send webcams replace if users are replaced

Redis db type: set

States:
 active = false
 on = true
 */
module.exports = Webcams;

var redis = require('./../lib/redis').current(),
    Q = require ('q'),
    _ = require('underscore'),
    previous_webcams = {men: null, women: null},
    states = ['on', 'active'];

function Webcams() {}

Webcams.add = function (cname, user_id, state) {
    if (states.indexOf(state) !== -1) {
        redis.hset('webcams:' + cname, user_id, state);
    }
};

Webcams.destroy = function (cname, user_id) {
    redis.hdel('webcams:' + cname, user_id);
};

Webcams.all = function (cname) {
    var deferred = Q.defer();

    redis.hgetall('webcams:' + cname, function (err, result) {
        if (err) {deferred.reject(err);}
        deferred.resolve(result);
    });

    return deferred.promise;
};

/**
 * Returns cams only if they differs from the last time. Otherwise returns null.
 *
 * @param cname
 */
Webcams.all_new = function (cname) {
    var deferred = Q.defer();

    Webcams.all(cname)
        .then(function (cams) {
            if (!_.isEqual(cams, previous_webcams[cname])) {
                previous_webcams[cname] = cams;
                deferred.resolve(cams || {});
            } else {
                deferred.resolve(null);
            }
        });

    return deferred.promise;
};

Webcams.destroy_all = function () {
    redis.del('webcams:women');
    redis.del('webcams:men');
    previous_webcams = {men: null, women: null};
};