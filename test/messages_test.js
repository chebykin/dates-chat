var messages = require('../actions/messages'),
    WebSocket = require('ws'),
    redis = require('../lib/redis').create(),
    women = require('../lib/user').women,
    men = require('../lib/user').men,
    user = require('../lib/user');

describe('Messages', function () {
    // TODO: add check for redis persistence
    it.skip('should deliver message to recipient_id', function () {
        var manWS = new WebSocket('http://localhost'),
            message = {recipient_id: 345, sender_id: 137},
            expect_message = JSON.stringify({reason: 'messages', method: 'push', payload: {recipient_id: 345, sender_id: 137}}),
            womanWS = new WebSocket('http://localhost'),
            anotherWomanWS = new WebSocket('http://localhost'),
            anotherManWS = new WebSocket('http://localhost'),
            womenMock = sinon.mock(women);

        var womanWSMock = sinon.mock(womanWS).expects('send').once().withArgs(expect_message);
        var anotherWomanWSMock = sinon.mock(anotherWomanWS).expects('send').never();
        var anotherManWSMock = sinon.mock(anotherManWS).expects('send').never();

        manWS.role = 'man';
        manWS.user_id = '137';

        women.all[345] = [womanWS];
        women.all[346] = [anotherWomanWS];
        men.all[137] = [manWS];
        men.all[100] = [anotherManWS];

        womenMock.expects('ids').once().returns([345, 346]);

        messages(manWS, 'post', message);

        anotherManWSMock.verify();
        anotherWomanWSMock.verify();
        womanWSMock.verify();
        womenMock.verify();

        womenMock.restore();
        men.all=[];
        women.all=[];
    });

    it.skip('should handle delete action', function () {
        var manWS = new WebSocket('http://localhost'),
            delete_request = {contact_id: 400},
            expect_message = {};

        manWS.role = 'man';
        manWS.user_id = '300';

        men.all[300] = [manWS];
        women.all[400] = [];

        messages(manWS, 'delete', delete_request);
    });

    describe.skip('delete action', function () {
        // id 100 - man
        // id 200 - woman

        it("should call user's delete_messages method", function () {
            var manWS = new WebSocket('http://localhost'),
                delete_request = {id: 200},
                expect_message = {};
                redisMock = sinon.mock(men).expects('delete_messages').twice().withExactArgs('blah');

            sinon.stub(user, 'oppositeCollection').returns(men);

            manWS.role = 'man';
            manWS.user_id = '100';

            messages(manWS, 'delete', delete_request);
        });

        it('should be available only for men');
        it('should notify both men and women about deleted messages');

        it.skip('should ask redis for data deletion', function () {
            var manWS = new WebSocket('http://localhost'),
                delete_request = {id: 200},
                expect_message = {};
                redisMock = sinon.mock(redis).expects('del').twice().withExactArgs('blah');

            manWS.role = 'man';
            manWS.user_id = '100';

            messages(manWS, 'delete', delete_request);
        });

    });
});