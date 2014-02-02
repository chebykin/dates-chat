"use strict";

var Q = require('q'),
    WebSocket = require('ws'),
    recentUsers = require('../lib/recent_users'),
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection,
    send = require('../lib/user').send;

module.exports = function (ws, method) {
    var current = currentCollection(ws);

    switch (method) {
        case 'delete_all':
            // collection->recent_users_ids->users_profiles
            return current
                .then(function (collection) {
                    recentUsers.delete_all(ws.user_id)
                        .then(function (recent_users_ids) {
                            collection.users_profiles(recent_users_ids)
                                .then(function (profiles) {
                                    collection.send(ws.user_id, 'recent_users_replace', Q.resolve({
                                        order: recent_users_ids,
                                        profiles: profiles
                                    }));
                                });
                        });
            });
        default:
            return Q.reject(new Error('messages action: ws is not WebSocket instance'));
    }
};