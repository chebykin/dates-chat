"use strict";

var men = new UserCollection('man'),
    women = new UserCollection('woman');

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
    hat = require('hat'),
    utils = require('./utils'),
    dialogs = require('./dialogs_collection'),
    responder = require('./responder'),
    PublicError = require('./errors').public,
    multi_queue;

function UserCollection(current_role_name) {
    this.all = {};
    this.opposite = null;
    this.current_name = current_role_name;
    this.cache = {
        online_previous_tick: null
    };
}

UserCollection.responses = {
    authorization_success: {reason: 'authorize', method: 'success'},
    authorization_error: {reason: 'authorize', method: 'error'},

    online_users_replace: {reason: 'online_users', method: 'replace'},

    messages_push: {reason: 'messages', method: 'push'},
    messages_delivered: {reason: 'message', status: 'delivered'},
    messages_replace: {reason: 'messages', method: 'replace'},

    settings_replace: {reason: 'settings', method: 'replace'},

    dialogs_replace: {reason: 'dialogs', method: 'replace'},
    dialogs_create: {reason: 'dialogs', method: 'create'},
    dialogs_destroy: {reason: 'dialogs', method: 'destroy'},

    sessions_push: {reason: 'sessions', method: 'push'}
};

UserCollection.prototype.add = function (uid, ws) {
    if (uid > 0 && typeof ws === 'object') {
        uid = parseInt(uid, 10);
        ws.user_id = uid;
        ws.role = this.current_name;

        this.init_id(uid);
        this.all[uid].push(ws);

        ws.on('close', function () {
            var index = this.all[uid].indexOf(ws);
            if (index !== -1) {
                this.all[uid].splice(index, 1);
            }
            if (this.all[uid].length === 0) {
              delete this.all[uid];
            }
        }.bind(this));

        this.respond_with(ws, 'authorization_success', null);
    } else {
        this.respond_with(ws, 'authorization_error', null);
    }
};

/**
 * Set mode of connection. There can be only 2 states:
 * - page. other pages than chat
 * - chat. chat page
 * @param ws
 * @param mode
 */
UserCollection.prototype.set_mode = function (ws, mode) {
    var _user_collection = this;

    if (mode === 'chat') {
        ws.mode = 'chat';
        this.for_user_profiles(this.opposite.ids(), function (profiles) {
            _user_collection.respond_with(ws, 'online_users_replace', profiles);
        });
        // TODO: front-end should be resolved only after sessions_push mode:set
        this.respond_with(ws, 'sessions_push', {mode: 'set'});
        this.get_messages(ws.user_id);
        this.get_settings(ws);
        this.get_dialogs(ws);
    } else {
        ws.mode = 'page';
        this.get_settings(ws);
        // TODO: check for new messages and send it if there are.
    }
};

//===== Respond methods.

/**
 * Response to single socket.
 * If you want to send data to whole user, you should use 'respond_to_ids_with' method.
 *
 * @param ws
 * @param response_name
 * @param payload
 * @returns {*}
 */
UserCollection.prototype.respond_with = function (ws, response_name, payload) {
    if (UserCollection.responses.hasOwnProperty(response_name)) {
        var response = UserCollection.responses[response_name];
        if (payload !== null) {
            response.payload = payload;
        }

        ws.send(JSON.stringify(response));
    } else {
        return null;
    }
};

/**
 * Response to ids array. Should be used even if you want to send data to single user.
 *
 * @param ids of user|users
 * @param response_name
 * @param payload
 * @returns {*}
 * @param mode
 * @param {bool} [only_first]
 */
UserCollection.prototype.respond_to_ids_with = function (ids, response_name, mode, payload, only_first) {
    only_first = only_first || false;

    if (UserCollection.responses.hasOwnProperty(response_name)) {
        var response = UserCollection.responses[response_name],
            web_socks = this.all_websockets(ids);

        if (payload !== null) {
            response.payload = payload;
        }

        for (var sock in web_socks) {
            if (web_socks.hasOwnProperty(sock)) {
                if (mode === 'all' || mode === web_socks[sock].mode) {
                    web_socks[sock].send(JSON.stringify(response));
                }
                if (only_first) { return; }
            }
        }
    } else {
        return null;
    }
};

/**
 * Gets user profiles and returns it in callback
 *
 * @param user_ids that you want to fetch from db
 * @param cb
 */
UserCollection.prototype.for_user_profiles = function (user_ids, cb) {
    redis.hmget('user_profiles', user_ids, function (err, obj) {
        var i = 0;
        var profiles = {};

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                profiles[user_ids[i]] = obj[key];
                i++;
            }
        }

        cb(profiles);
    }.bind(this));
};

//===== Online methods
/**
 * This tick is triggered every n seconds for each role. See config file for n value.
 */
UserCollection.prototype.tick_update_online_users = function () {
    var new_ids = this.get_online_users();
    var opposite_ids = this.opposite.ids();
    if (Array.isArray(new_ids) && Array.isArray(opposite_ids) && opposite_ids.length) {
        this.for_user_profiles(new_ids, function (profiles) {
            this.opposite.respond_to_ids_with(opposite_ids, 'online_users_replace', 'chat', profiles);
        }.bind(this));
    }
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
    return this.current_name === 'woman';
};

UserCollection.prototype.is_man = function (id, cb) {
    id = parseInt(id, 10);

    if (id) {
        redis.smembers('man_role', id, function (err, obj) {
            cb(obj);
        });
        return false;
    } else {
        return this.current_name === 'man';
    }
};

// TODO: add caching worker. it should walk through all dialogs and reset recent users. once per 1 min for start period.
UserCollection.prototype.get_messages = function (user_id) {
    var is_woman = this.is_woman(),
        deferred = Q.defer();

    redis.smembers('chat_contacts:' + user_id, function (err, contacts) {
        if (err) {
            deferred.reject(err);
        }

        var response = {};

        multi_queue= redis.multi();

        contacts.forEach(function (id) {
            var key = "dialogs:" +
                (is_woman ? id : user_id) + '_' +
                (is_woman ? user_id : id);

            multi_queue = multi_queue.lrange(key, 0, -1);
        });

        multi_queue.exec(function (err, replies) {
            replies.forEach(function(reply, index) {
                // TODO: log messages with undefined id
                if (contacts.indexOf(contacts[index]) >= 0) {
                    response[contacts[index]] = reply;
                }
            });

            this.respond_to_ids_with([user_id], 'messages_replace', 'chat', response);
        }.bind(this));
    }.bind(this));

    return deferred.promise;
};

//=====
UserCollection.prototype.deliver_message = function (message, ws) {
    var _user_collection = this,
        deferred = Q.defer();

    if (typeof message === 'object' && Object.keys(message).length === 0) {
        deferred.reject(new PublicError('Wrong format of message'));
    }

    message.sender_id = parseInt(ws.user_id, 10);
    message.recipient_id = parseInt(message.recipient_id, 10);

    dialogs.between(message.sender_id, message.recipient_id).deliver(message)
        .then(function () {
            _user_collection.for_user_profiles([message.sender_id], function (profiles) {
                utils.jsonParse(profiles[Object.keys(profiles)[0]], function(err, profile) {
                    if (err) {
                        deferred.reject(err);
                    }

                    // REVIEW: extra load for chat mode
                    message.name = profile.n;
                    message.avatar = profile.mp;
                    message.age = profile.a;
                    message.key = hat();

                    _user_collection.opposite.respond_to_ids_with([message.recipient_id], 'messages_push', 'page', message, true);
                    _user_collection.opposite.respond_to_ids_with([message.recipient_id], 'messages_push', 'chat', message);
                });
            });
        })
        .fail(function (e) {
            deferred.reject(e);
            ws.send(responder.rollback(message.recipient_id, e.message));
        });

    return deferred.promise;
};

/**
 * Delete all messages for contact
 * Currently unused.
 *
 * @param payload object with contact id
 * @param sender_id
 */
UserCollection.prototype.delete_messages = function (payload, sender_id) {
    sender_id = parseInt(sender_id, 10);
    var contact_id = parseInt(payload.contact_id, 10),
        key = 'dialogs:' + sender_id + '_' + contact_id,
        deferred = Q.defer();

    redis.del(key, function (err) {
        if (err) {
            deferred.reject(new Error('Messages: error while deleting'));
        }

        // notify about successful deleting
        this.get_messages(sender_id);
        this.opposite.get_messages(payload.contact_id);

    }.bind(this));

    return deferred.promise;
};

UserCollection.prototype.get_dialogs = function (ws) {
    var ids;

    if (this.is_woman()) {
        ids = dialogs.pairs_of_woman(ws.user_id);
    } else {
        ids = dialogs.pairs_of_man(ws.user_id);
    }

    this.respond_to_ids_with([ws.user_id], 'dialogs_replace', 'chat', {contacts: ids});
};

UserCollection.prototype.update_dialog_state = function (state, user_id, contact_id) {

    if (state === 'on') {
        this.respond_to_ids_with([user_id], 'dialogs_create', 'chat', {contact: contact_id});
    } else {
        this.respond_to_ids_with([user_id], 'dialogs_destroy', 'chat', {contact: contact_id});
    }

};

UserCollection.prototype.get_settings = function (ws) {
    var _user_collection = this,
        deferred = Q.defer();

    redis.hmget('chat_settings:' + ws.user_id, 'sound', 'notifications', function (err, obj) {
        if (err) {
            deferred.reject(err);
        }
        _user_collection.respond_with(ws, 'settings_replace', {
            play_sound: obj[0] === 'true',
            notifications: obj[1]
        });
    });

    return deferred.promise;
};

UserCollection.prototype.update_settings = function (user_id, payload) {
    var key = 'chat_settings:' + user_id,
        payload_filtered = {
            sound: payload.play_sound,
            notifications: payload.notifications
        };

    if (Object.keys(payload).length > 0) {
        redis.del(key);
        redis.hmset(key, payload_filtered);
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
    var websockets = [];

    ids = Array.isArray(ids) ? ids : null;

    for (var prop in this.all) {
        if (this.all.hasOwnProperty(prop)) {
            if (ids !== null && ids.indexOf(parseInt(prop, 10)) > -1) {
                this.all[prop].forEach(function (ws) {
                    websockets.push(ws);
                });
            } else if (ids === null) {
                this.all[prop].forEach(function (ws) {
                    websockets.push(ws);
                });
            }
        }
    }

    return websockets;
};

UserCollection.prototype.keys = function () {
    return Object.keys(this.all).map(utils.parseDecimal);
};

function oppositeCollection(ws) {
    if (ws.role === 'man') {
        return Q.resolve(women);
    } else if (ws.role === 'woman') {
        return Q.resolve(men);
    } else {
        return Q.reject(new Error("Can't determine opposite role"));
    }
}

function currentCollection(ws) {
    if (ws.role === 'man') {
        return Q.resolve(men);
    } else if (ws.role === 'woman') {
        return Q.resolve(women);
    } else {
        return Q.reject(new Error("Can't determine current role"));
    }
}

men.register_opposite(women);
women.register_opposite(men);
