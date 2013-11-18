var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    responder = require('../lib/responder'),
    PrivateError = require('../lib/errors').private,
    PublicError = require('../lib/errors').public,
    config = config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port);

module.exports = function (ws, method) {
    try {
        var key = utils.getCookie('_v_token_key', ws.upgradeReq.headers.cookie);
        if (method !== 'post') throw new PrivateError('Creating new session: unknown method.');
        if (typeof key === 'undefined') throw new PrivateError('Creating new session: unknown cookie key.')

        redis.hget('chat:session:store', key, function (err, obj) {
            var user_id = utils.getProp(obj, 'user_id'),
                role = utils.getProp(obj, 'role'),
                mode = 'chat';

            if (obj === null) {
                throw new PrivateError('Session action: null object returned from redis.');
            } else if (role === 'man') {
                men.add(user_id, ws, mode);
            } else if (role === 'woman') {
                women.add(user_id, ws, mode);
            }
        });
    } catch (ex) {
        if (typeof ex === PublicError) {
            ws.send(responder.error(ex.message));
        } else {
            ws.send(responder.error('Authorization error.'));
            if (['development', 'test'].indexOf(process.env.NODE_ENV) >= 0) {
                throw ex;
            }
        }
        ws.close(4401, 'Authorization required.');
    }
};
