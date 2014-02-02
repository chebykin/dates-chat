"use strict";

var Q = require('q'),
    WebSocket = require('ws'),
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection,
    recentUsers = require('../lib/recent_users'),
    send = require('../lib/user').send;

module.exports = function (ws, method, payload) {

    switch (method) {
        case 'get':
            return currentCollection(ws)
                .then(function (collection) {
                    return collection.get_messages(ws.user_id);
                });
        case 'post':
            // collection->deliver_message->recent_users_ids->users_profiles
            return currentCollection(ws)
                .then(function (collection) {
                    collection.deliver_message(payload, ws)
                        .then(function () {
                            recentUsers.all(ws.user_id)
                                .then(function (recent_users_ids) {
                                    collection.users_profiles(recent_users_ids)
                                        .then(function(profiles) {
                                            collection.send(ws, 'recent_users_replace', Q.resolve({
                                                order: recent_users_ids,
                                                profiles: profiles
                                            }));
                                        });
                                });
                        });
                });
        case 'delete':
            return currentCollection(ws).delete_messages(payload, ws.user_id);
        default:
            return Q.reject(new Error('messages action: ws is not WebSocket instance'));
    }
};