"use strict";

var men = new UserCollection('men'),
    women = new UserCollection('women');

module.exports.men = men;
module.exports.women = women;

module.exports.oppositeCollection = oppositeCollection;
module.exports.currentCollection = currentCollection;

/**
 * Assume that there are two mode - chat and page.
 * Page are not notified about online users changes, video cam status changes.
 */

var redis = require('../lib/redis').create(),
    _ = require('underscore'),
    Q = require('q'),
    utils = require('./utils'),
    dialogs = require('./dialogs_collection'),
    WebSocket = require('ws'),
    Webcams = require('../models/webcams'),
    user_sex = {};

module.exports.user_sex = user_sex;

function UserCollection(current_role_name) {
    this.all = {};
    this.opposite = null;
    this.current_name = current_role_name;
    this.cache = {
        online_previous_tick: null
    };
}

UserCollection.prototype.add = function (uid, ws) {
    if (uid === 0 || typeof ws !== 'object') {
        return false;
    }

    uid = parseInt(uid, 10);
    ws.user_id = uid;
    ws.role = this.current_name;
    ws.collection = this;
    user_sex[ws.user_id] = ws.role;

    this.init_id(uid);
    this.all[uid].push(ws);

    ws.on('close', function () {
        var index = this.all[uid].indexOf(ws);
        if (index !== -1) {
            this.all[uid].splice(index, 1);
        }
        if (this.all[uid].length === 0) {
            Webcams.destroy(ws.collection.current_name, uid);
            delete this.all[uid];
            delete user_sex[uid];
        }
    }.bind(this));

    return true;
};

//===== Respond methods.
UserCollection.prototype.users_profiles = function (user_ids) {
    var deferred = Q.defer();

    if (!Array.isArray(user_ids)) {
        return Q.reject(new Error('#user_profiles(): user_ids argument should be an array'));
    }

    redis.hmget('user_profiles', user_ids, function (err, obj) {
        var i = 0;
        var profiles = {};


        for (var key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== null) {
                profiles[user_ids[i]] = obj[key];
            }
            i++;
        }

        deferred.resolve(profiles);
    });

    return deferred.promise;
};

/**
 * Returns online users of current role only if they are changed from previous request/tick.
 * Information is taken from opened websockets.
 * @returns {*}
 */
UserCollection.prototype.get_online_users = function () {
    var ids = this.ids();
    if (!_.isEqual(ids, this.cache.online_previous_tick)) {
        this.cache.online_previous_tick = ids;
        return ids;
    } else {
        return null;
    }
};

/**
 * Returns online users of current role.
 * Information is taken from opened websockets.
 * @returns {Array}
 */
UserCollection.prototype.ids = function () {
    var ids = [];
    for (var id in this.all) {
        if (this.all.hasOwnProperty(id) && this.all[id].length > 0) {
            ids.push(parseInt(id, 10));
        }
    }
    return ids;
};

//=====
UserCollection.prototype.is_woman = function () {
    return this.current_name === 'women';
};

UserCollection.prototype.is_man = function (id, cb) {
    id = parseInt(id, 10);

    if (id) {
        redis.smembers('man_role', id, function (err, obj) {
            cb(obj);
        });
        return false;
    } else {
        return this.current_name === 'men';
    }
};

//=====
/**
 * Initialize an empty array for current user id.
 *
 * @param uid
 */
UserCollection.prototype.init_id = function (uid) {
    if (!this.all.hasOwnProperty(uid)) {
        this.all[uid] = [];
    }
};

/**
 * Registers collection of opposite sex users.
 * Yes, it's dirty hack, but it's enough for chat app.
 *
 * @param opposite_collection
 */
UserCollection.prototype.register_opposite = function (opposite_collection) {
    this.opposite = opposite_collection;
};

/**
 * Returns collection of opposite sex users.
 * For ex. "men.opposite" should return women collection.
 *
 * @returns {Function}
 */
UserCollection.prototype.opposite = function () {
    return this.opposite;
};

/**
 * All websockets of all users
 *
 * @returns {Array}
 */
UserCollection.prototype.all_websockets = function (ids) {
    var websockets = [],
        _collection = this;

    ids = Array.isArray(ids) ? ids : null;

    for (var prop in this.all) {
        if (this.all.hasOwnProperty(prop)) {
            if (ids !== null && ids.indexOf(parseInt(prop, 10)) > -1) {
                pushSocket(prop);
            } else if (ids === null) {
                pushSocket(prop);
            }
        }
    }

    function pushSocket (prop) {
        _collection.all[prop].forEach(function (ws) {
            websockets.push(ws);
        });
    }

    return websockets;
};

UserCollection.prototype.keys = function () {
    return Object.keys(this.all).map(utils.parseDecimal);
};

// Simple methods:
function oppositeCollection(user) {
    if (user.role === 'men') {
        return Q.resolve(women);
    } else if (user.role === 'women') {
        return Q.resolve(men);
    } else {
        return Q.reject(new Error("Can't determine opposite role"));
    }
}

function currentCollection(user_id) {
    return module.exports[user_sex[user_id]];
}

men.register_opposite(women);
women.register_opposite(men);
