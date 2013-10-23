/**
 * Assume that there are two mode - chat and page.
 * Page are not notified about online users changes, video cam status changes.
 */
var _ = require('underscore');

function UserCollection(current_role_name) {
    this.all = {};
    this.opposite = null;
    this.current_name = current_role_name;
    this.cache = {
        online_previous_tick: null
    };
}

UserCollection.responses = {
    authorization_success: {action: 'authorize', status: 'success'},
    authorization_error: {action: 'authorize', status: 'error'},

    online_update: {action: 'online', status: 'update'}
};

UserCollection.prototype.add = function (uid, ws, mode) {
    if (uid > 0 && typeof ws === 'object') {
        ws['user_id'] = uid;
        ws['mode'] = (['chat', 'page'].indexOf(mode) > -1) ? mode : 'page';
        this.init_id(uid);
        this.all[uid].push(ws);

        var closeCallback = function () {
            var index = this.all[uid].indexOf(ws);
            if (index != -1) {
                this.all[uid].splice(index, 1);
            }
        };
        console.log('added ' + uid);
        ws.on('close', closeCallback.bind(this));
        this.respond_with(ws, 'authorization_success', null);
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
UserCollection.prototype.respond_with = function (ws, response_name, data) {
    if (UserCollection.responses.hasOwnProperty(response_name)) {
        var response = UserCollection.responses[response_name];
        if (data !== null) {
            response['data'] = data;
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
UserCollection.prototype.respond_to_ids_with = function (ids, response_name, mode, data) {
    console.log(response_name);
    if (UserCollection.responses.hasOwnProperty(response_name)) {
        var response = UserCollection.responses[response_name],
            web_socks = this.all_websockets(ids);

        if (data !== null) {
            response['data'] = data;
        }

        web_socks.forEach(function (ws) {
            console.log(ws.user_id);
            if (mode === 'all' || mode === ws['mode']) {
                ws.send(JSON.stringify(response));
            }
        });
    } else {
        return null;
    }
};

//===== Online methods
/**
 * This tick is triggered every n seconds for each role. See config file for n value.
 */
UserCollection.prototype.tick_update_online_users = function () {
    var new_ids = this.get_online_users();
    var opposite_ids = this.opposite.ids();
    if (Array.isArray(new_ids)
        && Array.isArray(opposite_ids)
        && new_ids.length
        && opposite_ids.length
        ) {
        this.opposite.respond_to_ids_with(opposite_ids, 'online_update', 'chat', new_ids);
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
            ids.push(id);
        }
    }
    return ids;
};

//=====
UserCollection.prototype.is_women = function (uid) {
    return this.current_name === 'women';
};

UserCollection.prototype.is_men = function (uid) {
    return this.current_name === 'men';
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
            if (ids !== null && ids.indexOf(prop) > -1) {
                this.all[prop].forEach(function (ws) {
                    websockets.push(ws);
                });
            } else {
                this.all[prop].forEach(function (ws) {
                    websockets.push(ws);
                });
            }
        }
    }

    return websockets;
};

module.exports = UserCollection;