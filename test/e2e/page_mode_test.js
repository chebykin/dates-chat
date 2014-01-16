"use strict";

var WebSocket = require('ws'),
    EventEmitter = require('events').EventEmitter,
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    port = 20900,
    sandbox;

describe('Page mode', function () {
    before(function () {
        nock(config.billing.hostname + ':' + config.ports.billing)
            .get(config.billing.path + '/wallets/137')
            .reply(200, {ok: true, balance: '43'});

        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 14})
            .reply(200, {ok: true, new_balance: '43'});
    });

    beforeEach(function (done) {
        sandbox = sinon.sandbox.create();

        var cookieStub = sandbox.stub(utils, 'getCookie').returns('uglyValueMan'),
            _test = this;

        this.first = 103;
        this.second = 137;
        this.wss = app.listen(port);
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};
        this.dialog_key = 'dialogs:' + this.second + '_' + this.first;

        this.man = new WebSocket('ws://localhost:' + port);
        this.woman = undefined;

        this.man_profile = {n: 'Vasya', mp: 'uglyManAvatar', a: 16};
        this.woman_profile = {n: 'Olga', mp: 'uglyWomanAvatar', a: 15};

        redis.hset('chat:session:store', 'uglyValueMan', JSON.stringify({user_id: this.second, role: 'man'}));
        redis.hset('chat:session:store', 'uglyValueWoman', JSON.stringify({user_id: this.first, role: 'woman'}));

        redis.hset('chat_settings:103', 'sound', 'true');
        redis.hset('chat_settings:103', 'notifications', 'custom');

        redis.hset('user_profiles', '137', JSON.stringify(this.man_profile));
        redis.hset('user_profiles', '103', JSON.stringify(this.woman_profile));

        this.man.on('message', function (message) {
            var m = utils.getProps(message, ['reason', 'method', 'payload']);

            _test.man.emit(m.reason + '_' + m.method, m.payload);
        });

        this.man.on('authorize_success', function (method) {
            cookieStub.restore();
            cookieStub = sandbox.stub(utils, 'getCookie').returns('uglyValueWoman');

            _test.man.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
                field: 'mode',
                value: 'chat'
            }}));
        });

        this.man.on('sessions_push', function (method) {
            initWoman();
        });

        function initWoman() {
            _test.woman = new WebSocket('ws://localhost:' + port);

            _test.woman.on('message', function (message) {
                var m = utils.getProps(message, ['reason', 'method', 'payload']);

                _test.woman.emit(m.reason + '_' + m.method, m.payload);
            });

            _test.woman.on('authorize_success', function () {
                _test.woman.send(JSON.stringify({resource: 'sessions', method: 'patch', payload: {
                    field: 'mode',
                    value: 'page'
                }}));
                done();
            });
        }
    });

    afterEach(function (done) {
        sandbox.restore();
        app.wss.close();
        redis.flushall(function () {
            done();
        });
    });

    describe('after connection via ws', function () {
        it('should receive settings object', function (done) {
            this.woman.on('settings_replace', function (payload) {
                expect(payload.play_sound).to.be.true;
                expect(payload.notifications).to.equal('js');
                done();
            });
        });
    });

    describe('on new message', function () {
        beforeEach(function () {
            var _test = this;

            this.woman.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });
        });

        it('should receive it with sender profile data', function (done) {
            var _test = this;

            this.woman.on('messages_push', function (payload) {
                expect(payload.avatar).to.eql(_test.man_profile.mp);
                expect(payload.age).to.eql(_test.man_profile.a);
                expect(payload.name).to.eql(_test.man_profile.n);
                done();
            });
        });

        it('should store received message in redis', function (done) {
            this.timeout(10000);
            var _test = this;

            this.woman.on('messages_push', function (payload) {
                redis.lrange(_test.dialog_key, 0, -1, function (err, data) {
                    if (err) done(err);

                    var m = utils.getProps(data);

                    expect(data).to.have.length.of.at.least(1);
                    expect(m.sender_id).to.eql(_test.second);
                    expect(m.recipient_id).to.eql(_test.first);
                    expect(m.text).to.eql(_test.message_from_man.text);
                    done();
                });
            });
        });
    });
});
