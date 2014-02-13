"use strict";

var RecentUsersRequest = module.exports.request = {};
var RecentUsersResponse = module.exports.response = {};

var Q = require('q'),
    RecentUsers = require('../models/recent_users'),
    send = require('../lib/sender').send;

RecentUsersRequest.destroy = function (ws) {

    return RecentUsers.delete_all(ws.user_id)
            .then(function (recent_users_ids) {
                ws.collection.users_profiles(recent_users_ids)
                    .then(function (profiles) {
                        send({
                            order: recent_users_ids,
                            profiles: profiles
                        }).to_user(ws.user_id).using('recent_users#replace');
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