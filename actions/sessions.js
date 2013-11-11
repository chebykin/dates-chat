var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    responder = require('../lib/responder'),
    config = require('../lib/config'),
    redis = require('redis').createClient(config.redis_port);

module.exports = function (ws, method) {
    var key = utils.getCookie('_v_token_key', ws.upgradeReq.headers.cookie);
    if (method !== 'post') {return false}

    redis.hget('chat:session:store', key, function (err, obj) {
        var user_id = utils.getProp(obj, 'user_id'),
            role = utils.getProp(obj, 'role'),
            mode = 'chat';

        if (obj === null) {
            ws.send(responder.error('authorize'));
            ws.close(4401, 'Authorization required.');
        } else if (role === 'man') {
            men.add(user_id, ws, mode);
        } else if (role === 'woman') {
            women.add(user_id, ws, mode);
        }
    });
    return true;
};
