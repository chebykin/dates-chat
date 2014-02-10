"use strict";

var SessionsRequest = module.exports.request = {};
var SessionsResponse = module.exports.response = {};

var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    AuthorizationError = require('../lib/errors').auth,
    redis = require('../lib/redis').current(),
    send = require('../lib/sender').send,
    respond = require('../lib/responder').respond,
    Q = require('q');

SessionsRequest.post = function (ws) {
    var deferred = Q.defer();

    var key = utils.getCookie('_v_token_key', ws.upgradeReq.headers.cookie);

    if (typeof key === 'undefined') {
        deferred.reject(new Error('Session action: unknown cookie key.'));
    }

    redis.hget('chat:session:store', key, function (err, obj) {
        var user_id = utils.getProp(obj, 'user_id'),
            role = utils.getProp(obj, 'role'),
            result;

        if (obj === null) {
            deferred.reject(new AuthorizationError('Session action: null object returned from redis.'));
        } else if (role === 'man') {
            result = men.add(user_id, ws);
        } else if (role === 'woman') {
            result = women.add(user_id, ws);
        }

        return result ?
            send().to_socket(ws).using('authorization#success') :
            send().to_socket(ws).using('authorization#error');
    });

    return deferred.promise;
};

SessionsRequest.patch = function (ws, payload) {
    var deferred = Q.defer();

    if (payload.field !== 'mode') {
        return deferred.reject(new Error('Wrong field'));
    }

    if (payload.value === 'chat') {
        ws.mode = 'chat';

        respond.to_socket(ws).using('online_users#replace');
        respond.to_socket(ws).using('settings#replace');
        respond.to_socket(ws).using('messages#replace');
        respond.to_socket(ws).using('dialogs#replace');

//        RecentUsers.all(ws.user_id)
//            .then(function (recent_users_ids) {
//                _user_collection.users_profiles(recent_users_ids)
//                    .then(function (profiles) {
//                        send({
//                            order: recent_users_ids,
//                            profiles: profiles
//                        }).to_socket(ws).using('recent_users#replace');
//                    });
//            });
    } else {
        ws.mode = 'page';
        respond.to_socket(ws).using('settings#replace');
        // TODO: check for new messages and send it if there are.
    }

    return deferred.promise;
};
