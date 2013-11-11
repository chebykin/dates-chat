/* global require:false, module:true*/
/**
 * Assume that there are two mode - chat and page.
 * Page are not notified about online users changes, video cam status changes.
 */
var config = require('../config')[process.env.NODE_ENV],
    _ = require('underscore'),
    Redis = require('redis'),
    redis = Redis.createClient(config.redis_port),
    PrivateError = require('./errors').private,
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
    messages_replace: {reason: 'messages', method: 'replace'}
};

UserCollection.prototype.add = function (uid, ws, mode) {
    if (uid > 0 && typeof ws === 'object') {
        uid = parseInt(uid);
        ws.user_id = uid;
        ws.role = this.current_name;

        ws.mode = (['chat', 'page'].indexOf(mode) > -1) ? mode : 'page';
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
        this.for_user_profiles(this.opposite.ids(), function (profiles) {
            this.respond_with(ws, 'online_users_replace', profiles);
        }.bind(this));
    } else {
        this.respond_with(ws, 'authorization_error', null);
    }
};

//===== Respond methods.

/**
 * Response to single socket.
 * If you want to send data to whole user, you should use 'respond_to_ids_with' method.
 *
 * @param ws
 * @param response_name
 * @param data
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
 * @param data
 * @returns {*}
 * @param mode
 */
UserCollection.prototype.respond_to_ids_with = function (ids, response_name, mode, payload) {
    if (UserCollection.responses.hasOwnProperty(response_name)) {
        var response = UserCollection.responses[response_name],
            web_socks = this.all_websockets(ids);

        if (payload !== null) {
            response.payload = payload;
        }

        web_socks.forEach(function (ws) {
            if (mode === 'all' || mode === ws.mode) {
                ws.send(JSON.stringify(response));
            }
        });
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
    if (user_ids.length === 0) { return; }

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
            ids.push(parseInt(id));
        }
    }
    return ids;
};

//=====
UserCollection.prototype.is_woman = function () {
    return this.current_name === 'woman';
};

UserCollection.prototype.is_man = function () {
    return this.current_name === 'man';
};

// TODO: add caching worker. it should walk through all dialogs and reset recent users. once per 1 min for start period.
UserCollection.prototype.get_messages = function (user_id) {
    var is_woman = this.is_woman();

    redis.smembers('recent_users:' + user_id, function (err, contacts) {
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
};

//=====
UserCollection.prototype.deliver_message = function (message, sender_id) {
    if (Object.keys(message).length === 0) {
        throw new PublicError('Wrong format of message');
    }
    var recipient_id = parseInt(message.recipient_id, 10);
    message.sender_id = parseInt(sender_id, 10);

    // TODO: check billing
    // Send message to contact
    if (this.ids().indexOf(recipient_id) < 0 || (this.all[recipient_id] && this.all[recipient_id].length === 0)) {
        throw new PublicError("User doesn't exists or is offline.");
    }

    this.respond_to_ids_with([recipient_id], 'messages_push', 'all', message);

    // Save message to db
    // TODO: set expire 24 hours
    var key = "dialogs:" +
        (this.is_woman() ? sender_id : recipient_id) + '_' +
        (this.is_woman() ? recipient_id : sender_id);

    redis.rpush(key, JSON.stringify(message));

    // Add user to recent cache
    redis.sadd('recent_users:' + sender_id, recipient_id);
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
            if (ids !== null && ids.indexOf(parseInt(prop)) > -1) {
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

function oppositeCollection(ws) {
    if (ws.role === 'man') {
        return women;
    } else if (ws.role === 'woman') {
        return men;
    } else {
        throw new PrivateError("Can't determine opposite role");
    }
}

function currentCollection(ws) {
    if (ws.role === 'man') {
        return men;
    } else if (ws.role === 'woman') {
        return women;
    } else {
        throw new PrivateError("Can't determine current role");
    }
}

var men = new UserCollection('man'),
    women = new UserCollection('woman');

men.register_opposite(women);
women.register_opposite(men);

module.exports.men = men;
module.exports.women = women;

module.exports.oppositeCollection = oppositeCollection;
module.exports.currentCollection = currentCollection;
