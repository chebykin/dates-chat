var Settings = module.exports = {};

var send = require('../lib/sender').send,
    redis = require('../lib/redis').current();

Settings.get = function (user_id, fields) {
    var deferred = Q.defer(),
        result = {},
        i,
        l;

    fields = fields || ['play_sound', 'notifications'];
    l = fields.l;

    redis.hmget('chat_settings:' + user_id, fields, function (err, obj) {
        if (err) {
            deferred.reject(err);
        }

        if (typeof fields === 'string') {
            result[fields] = obj[0];
        } else {
            for (i = 0; i < l; i++) {
                result[fields[i]] = obj[i];
            }
        }

        result.play_sound = result.play_sound === 'true';

        if (['off', 'js', 'native'].indexOf(result.notifications) < 0) {
            redis.hset('chat_settings:' + user_id, 'notifications', 'js');
            result.notifications = 'js';
        }

        if (typeof fields === 'string') {
            deferred.resolve(result[Object.keys(result)[0]]);
        } else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
};

Settings.update_settings = function (user_id, payload) {
    var key = 'chat_settings:' + user_id,
        payload_filtered = {
            sound: payload.play_sound,
            notifications: payload.notifications
        };

    if (Object.keys(payload).length > 0) {
        redis.del(key);
        redis.hmset(key, payload_filtered);
    }
};