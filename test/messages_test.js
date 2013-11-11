var messages = require('../actions/messages'),
    config = config = require('../config')[process.env.NODE_ENV],
    WebSocket = require('ws'),
    sinon = require('sinon'),
    women = require('../lib/user').women,
    men = require('../lib/user').men;

describe('Messages', function () {

    it('should send messages to contact id', function () {
        var ws = new WebSocket('http://localhost');
        ws.role = 'man';
        ws.user_id = '137';
        messages(ws, 'get', undefined);
        // todo...
    });

    it('should deliver message to recipient_id', function () {
        var manWS = new WebSocket('http://localhost'),
            message = {recipient_id: 345, sender_id: 137},
            expect_message = JSON.stringify({reason: 'messages', method: 'push', payload: {recipient_id: 345, sender_id: 137}}),
            womanWS = new WebSocket('http://localhost'),
            anotherWomanWS = new WebSocket('http://localhost'),
            anotherManWS = new WebSocket('http://localhost'),
            womenMock = sinon.mock(women),
            menMock = sinon.mock(men);

        sinon.stub(womanWS, 'send');
        sinon.stub(anotherWomanWS, 'send');
        sinon.stub(anotherManWS, 'send');

        manWS.role = 'man';
        manWS.user_id = '137';

        women.all[345] = [womanWS];
        women.all[346] = [anotherWomanWS];
        men.all[345] = [anotherManWS];

        womenMock.expects('ids').once().returns([345, 346]);

        messages(manWS, 'post', message);

        sinon.assert.calledWith(womanWS.send, expect_message);
        sinon.assert.notCalled(anotherWomanWS.send);
        sinon.assert.notCalled(anotherManWS.send);
    });
});