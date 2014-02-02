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
            return currentCollection(ws)
                .then(function (collection) {
                    collection.deliver_message(payload, ws)
                        .then(function () {
                            collection.send(ws.user_id, 'recent_users_replace', recentUsers.all(ws.user_id));
                        })
                        .fail(function (reason) {
                            console.log(reason);
                        });
                });
        case 'delete':
            return currentCollection(ws).delete_messages(payload, ws.user_id);
        default:
            return Q.reject(new Error('messages action: ws is not WebSocket instance'));
    }
};