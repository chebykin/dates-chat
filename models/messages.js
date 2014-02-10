var Messages = module.exports = {};

var send = require('../lib/sender').send,
    redis = require('../lib/redis').current(),
    multi_queue;

Messages.get = function (user_id, is_woman) {
    var deferred = Q.defer();

    redis.smembers('chat_dialogs:' + user_id, function (err, contacts) {
        if (err) {
            deferred.reject(err);
        }

        var response = {};

        multi_queue= redis.multi();

        contacts.forEach(function (id) {
            var key = "dialogs:" +
                (is_woman ? id : user_id) + '_' +
                (is_woman ? user_id : id);

            multi_queue = multi_queue.lrange(key, 0, -1);
        });

        multi_queue.exec(function (err, replies) {
            replies.forEach(function(reply, index) {
                // TODO: log messages with undefined id
                if (contacts.indexOf(contacts[index]) >= 0) {
                    response[contacts[index]] = reply;
                }
            });

            deferred.resolve(response);
        });
    });

    return deferred.promise;
};

