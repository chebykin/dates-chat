"use strict";

var Q = require('q'),
    WebSocket = require('ws'),
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection;

module.exports = function (ws, method, payload) {

    switch (method) {
        case 'get':
            return currentCollection(ws).get_messages(ws.user_id);
        case 'post':
            return currentCollection(ws).deliver_message(payload, ws);
        case 'delete':
            return currentCollection(ws).delete_messages(payload, ws.user_id);
        default:
            return Q.reject(new Error('messages action: ws is not WebSocket instance'));
    }
};