"use strict";

var MessagesRequest = module.exports.request = {};
var MessagesResponse = module.exports.response = {};

var Q = require('q'),
    WebSocket = require('ws'),
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection,
    recentUsers = require('../lib/recent_users'),
    dialogs = require('../lib/dialogs_collection'),
    PublicError = require('../lib/errors').public,
    hat = require('hat'),
    Settings = require('../models/settings'),
    Messages = require('../models/messages'),
    respond = require('../lib/responder').respond,
    redis = require('../lib/redis').current(),
    utils = require('../lib/utils'),
    send = require('../lib/sender').send;

Q.longStackSupport = true;

MessagesRequest.get = function (ws) {
    // REVIEW: some strange behaviour
    return currentCollection(ws)
        .then(function (collection) {
            return collection.get_messages(ws.user_id);
        });
};

MessagesRequest.post = function (ws, message) {
    var collection = ws.collection,
        deferred = Q.defer();

    if (typeof message === 'object' && Object.keys(message).length === 0) {
        deferred.reject(new PublicError('Wrong format of message'));
    }

    message.sender_id = parseInt(ws.user_id, 10);
    message.recipient_id = parseInt(message.recipient_id, 10);
    message.key = hat();

    dialogs.between(message.sender_id, message.recipient_id).deliver(message)
        .then(function () {
            // response for chat mode
            send(message).to_user(message.recipient_id).using('messages#push');
            // continue for page mode
            return collection.users_profiles([message.sender_id]);
        })
        .then(function (profiles) {
            var profile = profiles[Object.keys(profiles)[0]];

            profile = JSON.parse(profile);
            message.name = profile.n;
            message.avatar = profile.mp;
            message.age = profile.a;

            return Settings.get(message.recipient_id, 'notifications');
        })
        .then(function (notifications) {
            switch (notifications) {
                case 'off':
                    return Q.resolve();
                case 'native':
                    return send(message).only_once().to_user(message.recipient_id)
                        .with_mode('page').using('messages#push');
                default:
                    return send(message).to_user(message.recipient_id)
                        .with_mode('page').using('messages#push');
            }
        })
        .then(function () {
            return recentUsers.all(ws.user_id);
        })
        .then(function (recent_users_ids) {
            return collection.users_profiles(recent_users_ids)
                .then(function (profiles) {
                    return send({
                        order: recent_users_ids,
                        profiles: profiles
                    }).to_user(ws.user_id).using('recent_users#replace');
                });
        })
        .fail(function (e) {
            console.log('POST REJECTED');
            deferred.reject(e);
            send({
                description: e.message,
                contact_id: message.recipient_id
            }).to_socket(ws).using('rollback#push');
        });

    return deferred.promise;
};

MessagesRequest.delete = function (ws, payload) {
    return currentCollection(ws).delete_messages(payload, ws.user_id);
};

MessagesResponse.replace = function (ws) {
    return Messages.get(ws.user_id, ws.collection.is_woman())
        .then(function (messages) {
            return send(messages).to_socket(ws).using('messages#replace');
        });
};
