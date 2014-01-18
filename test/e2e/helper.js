var utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    WebSocket = require('ws'),
    port = 20900;

var man_profile = {n: 'Vasya', mp: 'uglyManAvatar', a: 16},
    woman_profile = {n: 'Olga', mp: 'uglyWomanAvatar', a: 15};

humanFactory = function (id, role, pageMode) {
    var sessionKey = id + role + pageMode,
        profile = (role === 'man' ? man_profile : woman_profile),
        human;

    redis.hset('chat:session:store', sessionKey, JSON.stringify({user_id: id, role: role}));
    redis.hset('user_profiles', id, JSON.stringify(profile));
    redis.hset('chat_settings:' + id, 'sound', 'true');
    redis.hset('chat_settings:' + id, 'notifications', 'custom');

    human = new WebSocket('ws://localhost:' + port, {
        headers: {cookie: '_v_token_key=' + sessionKey}
    });

    human.profile = profile;

    human.on('message', function (message) {
        var m = utils.getProps(message, ['reason', 'method', 'payload']);

        human.emit(m.reason + '_' + m.method, m.payload);
    });

    human.on('authorize_success', function () {
        human.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
            field: 'mode',
            value: pageMode
        }}));
    });

    return human;
};

function Man() {}
Man.get = function(id, mode) {
    return humanFactory(id, 'man', mode);
};

function Woman() {}
Woman.get = function(id, mode) {
    return humanFactory(id, 'woman', mode);
};

global.Man = Man;
global.Woman = Woman;