"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    port = 20900,
    sandbox;

describe('Page mode', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        this.wss = app.listen(port);
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};
        sandbox = sinon.sandbox.create();
    });

    after(function () {
        sandbox.restore();
        app.wss.close();
    });

    describe('after connection via ws', function () {
        it('should receive settings object', function (done) {
            var man = new WebSocket('ws://localhost:' + port),
                cookieStub = sandbox.stub(utils, 'getCookie').returns('uglyValueMan'),
                woman;

            redis.hset('chat:session:store', 'uglyValueMan', JSON.stringify({user_id: this.second, role: 'man'}));
            redis.hset('chat:session:store', 'uglyValueWoman', JSON.stringify({user_id: this.first, role: 'woman'}));

            redis.hset('chat_settings:103', 'sound', 'true');
            redis.hset('chat_settings:103', 'notifications', 'custom');

            redis.hset('user_profiles', '137', JSON.stringify({n: 'Vasya', cp: 'uglyAvatar'}));
            redis.hset('user_profiles', '103', JSON.stringify({n: 'Olga', cp: 'uglyAvatar'}));

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
                }
            });

            function initWoman() {
                woman = new WebSocket('ws://localhost:' + port);

                woman.on('message', function (message) {
                    var reason = utils.getProp(message, 'reason'),
                        method = utils.getProp(message, 'method'),
                        payload = utils.getProp(message, 'payload');

                    if(reason === 'authorize' && method === 'success') {
                        woman.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
                            field: 'mode',
                            value: 'page'
                        }}));
                    } else if (reason === 'settings' && method === 'replace') {
                        expect(payload.play_sound).to.be.true;
                        expect(payload.notifications).to.equal('js');
                        done();
                    }
                });
            }
        });
    });
});