"use strict";

module.exports = RecentUsers;

var redis = require('./../lib/redis').current(),
    Q = require ('q');

function RecentUsers() {}

RecentUsers.add = function (user_id, contact_id) {
    redis.zadd('recent_users:' + user_id, new Date().getTime(), contact_id);
};

RecentUsers.all = function (user_id) {
    var deferred = Q.defer();

    redis.zrevrange('recent_users:' + user_id, 0, -1, function (err, payload) {
        if (err) {deferred.reject(err);}
        payload = payload.map(function (val) {
            return parseInt(val, 10);
        });
        deferred.resolve(payload);
    });

    return deferred.promise;
};

RecentUsers.delete_all = function (user_id) {
    var deferred = Q.defer();

    redis.del('recent_users:' + user_id, function (err) {
        if (err) {deferred.reject(err);}
        deferred.resolve([]);
    });

    return deferred.promise;
};

RecentUsers.remove = function (user_id, items) {
    var deferred = Q.defer();

    items.unshift('recent_users:' + user_id);
    redis.zrem(items, function (err) {
        if (err) {deferred.reject(err);}
        deferred.resolve([]);
    });

    return deferred.promise;
};