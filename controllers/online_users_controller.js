"use strict";

var OnlineUsersRequest = module.exports.request = {};
var OnlineUsersResponse = module.exports.response = {};

var Users = require('../lib/user'),
    send = require('../lib/user').send;

//SettingsRequest.get = function (ws) {
//    return SettingsResponse.replace(ws);
//};

//SettingsRequest.post = function (ws, payload) {
//    return Q.resolve(ws.collection.update_settings(ws.user_id, payload));
//};

// Send new users from current collection to others
OnlineUsersResponse.tick = function (users) {
    var collection = Users.currentCollection(users[0]);
    var new_ids = collection.get_online_users();
    var opposite_ids = collection.opposite.ids();
//
    if (Array.isArray(new_ids) && Array.isArray(opposite_ids) && opposite_ids.length) {
        return [{'online_users#replace': collection.users_profiles(new_ids)}];
    } else {
        return null;
    }
};

OnlineUsersResponse.replace = function (ws) {
    var ids = ws.collection.opposite.ids();
    return [{'online_users#replace': ws.collection.opposite.users_profiles(ids)}];
};
