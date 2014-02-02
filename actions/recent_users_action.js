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
        case 'get':
            return send(ws, 'recent_users_replace', recentUsers.all(ws.user_id));
        case 'delete_all':
            return current.then(function (collection) {
                collection.send(ws.user_id, 'recent_users_replace', recentUsers.delete_all(ws.user_id));
            });
        default:
            return Q.reject(new Error('messages action: ws is not WebSocket instance'));
    }
};