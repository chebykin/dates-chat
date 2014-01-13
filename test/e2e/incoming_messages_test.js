"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    port = 20900,
    sandbox;

// looks like it will be very common integration test. we can use it later as basis for later development
describe('Notifications', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        this.wss = app.listen(port);
        this.message_from_woman = {sender_id: this.first, recipient_id: this.second, text: 'Hi man!'};
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};
        sandbox = sinon.sandbox.create();
    });

    after(function () {
        sandbox.restore();
    });

    describe('about dialog closing', function () {
        it('should be sent after dialog timeout', function (done) {
            var man = new WebSocket('ws://localhost:' + port),
                cookieStub = sandbox.stub(utils, 'getCookie').returns('uglyValueMan'),
                _test = this,
                woman;

            this.timeout(2000);

            redis.hset('chat:session:store', 'uglyValueMan', JSON.stringify({user_id: this.second, role: 'man'}));
            redis.hset('chat:session:store', 'uglyValueWoman', JSON.stringify({user_id: this.first, role: 'woman'}));
            redis.hset('user_profiles', '137', JSON.stringify({n: 'Vasya', cp: 'uglyAvatar'}));
            redis.hset('user_profiles', '103', JSON.stringify({n: 'Olga', cp: 'uglyAvatar'}));

            nock(config.billing.hostname + ':' + config.ports.billing)
                .get(config.billing.path + '/wallets/137')
                .reply(200, {ok: true, balance: '43'});

            nock(config.billing.hostname + ':' + config.ports.billing)
                .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 14})
                .reply(200, {ok: true, new_balance: '43'});

            man.on('message', function (message) {
                var reason = utils.getProp(message, 'reason'),
                    method = utils.getProp(message, 'method');

                if (reason === 'authorize' && method === 'success') {
                    cookieStub.restore();
                    cookieStub = sandbox.stub(utils, 'getCookie').returns('uglyValueWoman');

                    man.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
                        field: 'mode',
                        value: 'chat'
                    }}));
                } else if (reason === 'sessions' && method === 'push') {
                    initWoman();
                } else if(reason === 'messages' && method === 'push') {
                    message = JSON.parse(message);

                    expect(message.payload.text).to.equal(_test.message_from_woman.text);
                    expect(message.payload.sender_id).to.equal(_test.message_from_woman.sender_id);
                    expect(message.payload.recipient_id).to.equal(_test.message_from_woman.recipient_id);

                    setTimeout(function () {
                        man.send(JSON.encode({
                            resource: 'dialogs',
                            method: 'destroy',
                            contact: _test.first
                        }));
                    }, 100);
                }

            });

            function initWoman() {
                woman = new WebSocket('ws://localhost:' + port);

                woman.on('message', function (message) {
                    var reason = utils.getProp(message, 'reason'),
                        method = utils.getProp(message, 'method');

                    if(reason === 'authorize' && method === 'success') {
                        woman.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
                            field: 'mode',
                            value: 'chat'
                        }}));
                    } else if (reason === 'sessions' && method === 'push') {
                        man.send(JSON.stringify({
                            resource: 'messages',
                            method: 'post',
                            payload: _test.message_from_man
                        }));
                    } else if(reason === 'messages' && method === 'push') {
                        message = JSON.parse(message);

                        expect(message.payload.text).to.equal(_test.message_from_man.text);
                        expect(message.payload.sender_id).to.equal(_test.message_from_man.sender_id);
                        expect(message.payload.recipient_id).to.equal(_test.message_from_man.recipient_id);

                        woman.send(JSON.stringify({
                            resource: 'messages',
                            method: 'post',
                            payload: _test.message_from_woman
                        }));
                    } else if (reason === 'dialogs' && method === 'destroy') {
                        message = JSON.parse(message);

                        expect(message.payload.contact).to.equal(_test.second);

                        done();
                    }
                });
            }
        });
    });
});