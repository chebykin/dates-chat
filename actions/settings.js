"use strict";

var WebSocket = require('ws'),
    Q = require('q'),
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection;

module.exports = function (ws, method, payload) {
    switch (method) {
        case 'get':
            return currentCollection(ws).
                then(function (collection) {
                    collection.get_settings(ws);
                });
        case 'post':
            return Q.resolve(currentCollection(ws)
                .then(function (collection) {
                    collection.update_settings(ws.user_id, payload);
                }));
        default:
            return Q.reject(new Error('Settings action: wrong method'));
    }
};