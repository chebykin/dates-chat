/*
 * current - current role
 * opposite - opposite role
 *
 * We don't use listening for becoming online/going offline events, because if it will be a lot of users, than per one
 * second there can be a lot login/logout events. We are not so paranoiac of precision of events. 2-3 seconds is enough.
 */

var config = require('./config'),
    WebSocketServer = require('ws').Server,
    Redis = require('redis'),
    wss = new WebSocketServer({port: config.websocket_port}),
    redis = Redis.createClient(config.redis_port),
    util = require('util'),
    hat = require('hat'),
    _ = require('underscore'),
    UserCollection = require('./user'),
    men = new UserCollection(),
    women = new UserCollection(),
    users = {};

// yep it's hack, but this is enough.
men.register_opposite(women);
women.register_opposite(men);

wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        parseAction(ws, message);
    });

    actionAuthorize(ws);
});

// =================================================
//                     Loops
// =================================================
// 1. Online men/women changed. notify only in chat mode
setInterval(function () {
//    console.log('************************');
//    console.log(men.ids());
//    console.log(women.ids());
//    console.log('==================');
    men.tick_update_online_users();
    women.tick_update_online_users();
}, config.online_check_interval);
// 2. TODO: Cam online status.

// =================================================
//                   Actions
// =================================================
function parseAction(ws, raw_data) {
    var action = getProp(raw_data, 'action');

    switch (action) {
        case 'message':
            return actionMessage(ws, action);
            break;
        default:
            return actionDefault();
    }
}

function actionAuthorize(ws) {
    var key = getCookie('_v_token_key', ws.upgradeReq.headers.cookie);

    redis.hget('chat:session:store', key, function (err, obj) {
        var user_id = getProp(obj, 'user_id'),
            role = getProp(obj, 'role'),
            mode = 'chat';

        if (role === 'man') {
            men.add(user_id, ws, mode);
        } else if (role === 'woman') {
            women.add(user_id, ws, mode);
        }
    });
    return true;
}

function actionMessage(ws, args) {
    var contact_id = parseInt(args.contact_id).toString();
    if (contact_id > 0 && users.hasOwnProperty(contact_id)) {
        users[contact_id].forEach(function (contact) {
            var data = {action: 'message', args: {contact_id: ws.user_id, message: args.message}}
            contact.send(JSON.stringify(data));
        });
    }
}

function actionDefault() {
    return 'ok';
}

// =================================================
//                   Helpers
// =================================================
function getProp(raw_obj, property) {
    var value, obj;

    try {
        obj = JSON.parse(raw_obj);
    } catch (e) {
        return null;
    }

    if (obj !== null && obj.hasOwnProperty(property)) {
        value = obj[property];
    } else {
        value = null;
    }

    return value;
}

function getCookie(name, cookies) {
    if (cookies) {
        var matches = cookies.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    } else return null;
}

// =================================================
//                   Objects
// =================================================

var Responder = {
    success: function (action, data) {
        var obj = {status: 'success', action: action, data: data};
        return JSON.stringify(obj);
    },
    error: function (action, data) {
        var obj = {status: 'error', action: action, data: data};
        return JSON.stringify(obj);
    },
    update: function (action, data) {
        var obj = {action: action, data: data};
        return JSON.stringify(obj);
    }
};
