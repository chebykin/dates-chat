"use strict";

var OnlineUsersRequest = module.exports.request = {};
var OnlineUsersResponse = module.exports.response = {};

var user = require('../lib/user'),
    config = require('../config'),
    send = require('../lib/user').send;

//SettingsRequest.get = function (ws) {
//    return SettingsResponse.replace(ws);
//};

//SettingsRequest.post = function (ws, payload) {
//    return Q.resolve(ws.collection.update_settings(ws.user_id, payload));
//};

// New users from opposite collection are sent to current
OnlineUsersResponse.tick = function (collection) {
    var opposite_new_ids = collection.opposite.get_online_users();
    var current_ids = collection.ids();

    if (Array.isArray(opposite_new_ids) && Array.isArray(current_ids) && current_ids.length) {

        return [{'online_users#replace': collection.opposite.users_profiles(opposite_new_ids)}];
    } else {
        return null;
    }
};

OnlineUsersResponse.replace = function (ws) {
    var ids = ws.collection.opposite.ids();
    return [{'online_users#replace': ws.collection.opposite.users_profiles(ids)}];
};
