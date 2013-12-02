var WebSocket = require('ws'),
    PrivateError = require('../lib/errors').private,
    oppositeCollection = require('../lib/user').oppositeCollection,
    currentCollection = require('../lib/user').currentCollection;

module.exports = function (ws, method, payload) {
    if (!(ws instanceof WebSocket)) {
        throw new PrivateError('messages action: ws is not WebSocket instance');
    }

    switch (method) {
        case 'get':
            currentCollection(ws).get_messages(ws.user_id);
            break;
        case 'post':
            currentCollection(ws).deliver_message(payload, ws.user_id);
            break;
        case 'delete':
            currentCollection(ws).delete_messages(payload, ws.user_id);
            break;
        default:
            throw new PrivateError('messages action: ws is not WebSocket instance');
    }
};