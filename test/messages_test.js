var messages = require('../actions/messages'),
    config = config = require('../config')[process.env.NODE_ENV],
    WebSocket = require('ws'),
    sinon = require('sinon'),
    Redis = require('redis'),
    redis = Redis.createClient(config.redis_port),
    women = require('../lib/user').women,
    men = require('../lib/user').men,
    user = require('../lib/user');

describe('Messages', function () {
    // TODO: add check for redis persistence
    it('should deliver message to recipient_id', function () {
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

    it('should handle delete action', function () {
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

    it('should return key for dialogs', function () {
        var first = 100,
            second = 200;

        men.all[first] = [{}, {}];
        women.all[second] = [{}, {}];

        men.dialog_key_for_online_users(first, second).should.eql('dialogs:100_200');
        men.dialog_key_for_online_users(second, first).should.eql('dialogs:100_200');
        women.dialog_key_for_online_users(second, first).should.eql('dialogs:100_200');
        women.dialog_key_for_online_users(second, first).should.eql('dialogs:100_200');
        women.dialog_key_for_online_users(second, undefined).should.throw('Messages: one of arguments is not integer.');
        women.dialog_key_for_online_users(undefined, second).should.throw('Messages: one of arguments is not integer.');
    });
});