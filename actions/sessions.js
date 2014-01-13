var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    AuthorizationError = require('../lib/errors').auth,
    redis = require('../lib/redis').create(),
    Q = require('q');

module.exports = function (ws, method, payload) {
    var deferred = Q.defer();

    if (method === 'post') {
        var key = utils.getCookie('_v_token_key', ws.upgradeReq.headers.cookie);

        if (typeof key === 'undefined') {
            deferred.reject(new Error('Session action: unknown cookie key.'));
        }

        redis.hget('chat:session:store', key, function (err, obj) {
            var user_id = utils.getProp(obj, 'user_id'),
                role = utils.getProp(obj, 'role'),
                mode = 'chat';

            if (obj === null) {
                deferred.reject(new AuthorizationError('Session action: null object returned from redis.'));
            } else if (role === 'man') {
                deferred.resolve(men.add(user_id, ws, mode));
            } else if (role === 'woman') {
                deferred.resolve(women.add(user_id, ws, mode));
            }
        });
    } else if (method === 'patch') {
        if (payload.field === 'mode') {
            if (ws.role === 'man') {
                men.set_mode(ws, payload.value);
            } else if (ws.role === 'woman') {
                women.set_mode(ws, payload.value);
            }
        }
    } else if (method === 'ping') {

    } else {
        deferred.reject(new Error('Creating new session: unknown method.'));
    }

    return deferred.promise;
};
