"use strict";

var RecentUsersRequest = module.exports.request = {};
var RecentUsersResponse = module.exports.response = {};

var Q = require('q'),
    RecentUsers = require('../models/recent_users'),
    user = require('../lib/user'),
    dialogs = require('../lib/dialogs_collection'),
    send = require('../lib/sender').send;

RecentUsersRequest.destroy = function (ws) {
    var dialogs_action = (ws.role === 'men') ? 'pairs_of_man' : 'pairs_of_woman',
        on_ids = dialogs[dialogs_action](ws.user_id),
        deferred;

    deferred = on_ids.length ?
        RecentUsers.all(ws.user_id).then(function (all_ids) {
            var ids_to_remove = all_ids.filter(function (id) {
                return on_ids.indexOf(id) < 0;
            });

            return RecentUsers.remove(ws.user_id, ids_to_remove);
        }) :
        RecentUsers.delete_all(ws.user_id);

    return deferred.then(function () {
        RecentUsers.all(ws.user_id)
            .then(function (recent_users_ids) {
                ws.collection.users_profiles(recent_users_ids)
                    .then(function (profiles) {
                        send({
                            order: recent_users_ids,
                            profiles: profiles
                        }).to_user(ws.user_id).using('recent_users#replace');
                    });
            });
    });
};

RecentUsersResponse.replace = function (ws) {
    RecentUsers.all(ws.user_id)
        .then(function (recent_users_ids) {
            ws.collection.users_profiles(recent_users_ids)
                .then(function (profiles) {
                    send({
                        order: recent_users_ids,
                        profiles: profiles
                    }).to_socket(ws).using('recent_users#replace');
                });
        });
};