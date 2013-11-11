var messages = require('../actions/messages'),
    WebSocket = require('ws');

describe('Messages', function () {

    it('should send messages to contact id', function () {
        var ws = new WebSocket('http://localhost');
        ws.role = 'man';
        ws.user_id = '137';
        messages(ws, 'get', undefined);
    });
});