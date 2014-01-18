"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    port = process.env.PORT,
    sandbox;

describe('Chat mode', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        this.message_from_woman = {sender_id: this.first, recipient_id: this.second, text: 'Hi man!'};
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};

        nock(config.billing.hostname + ':' + config.ports.billing)
            .get(config.billing.path + '/wallets/137')
            .reply(200, {ok: true, balance: '43'});

        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 14})
            .reply(200, {ok: true, new_balance: '43'});
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        redis.flushall();

        this.wss = app.restart(port);
        this.dialog_key = 'dialogs:' + this.second + '_' + this.first;

        this.man = Man.get(137, 'chat');
        this.woman = Woman.get(103, 'chat');
    });

    afterEach(function (done) {
        sandbox.restore();
        redis.flushall(function () {
            done();
        });
    });

    describe('about dialog closing', function () {
        it('should be sent after dialog timeout', function (done) {
            var _test = this;

            this.man.on('messages_push', function (payload) {
                expect(payload.text).to.equal(_test.message_from_woman.text);
                expect(payload.sender_id).to.equal(_test.message_from_woman.sender_id);
                expect(payload.recipient_id).to.equal(_test.message_from_woman.recipient_id);

                setTimeout(function () {
                    _test.man.send(JSON.stringify({
                        resource: 'dialogs',
                        method: 'destroy',
                        payload: {
                            contact_id: _test.first
                        }
                    }));
                }, 100);
            });

            this.woman.on('sessions_push', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });

            this.woman.on('messages_push', function (payload) {
                expect(payload.text).to.equal(_test.message_from_man.text);
                expect(payload.sender_id).to.equal(_test.message_from_man.sender_id);
                expect(payload.recipient_id).to.equal(_test.message_from_man.recipient_id);

                _test.woman.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_woman
                }));
            });

            this.woman.on('dialogs_create', function (payload) {
                expect(payload.contact).to.equal(_test.second);
                _test.woman.on('dialogs_destroy', function (payload) {
                    expect(payload.contact).to.equal(_test.second);
                    done();
                });

            });
        });
    });

    describe('on dialog init', function () {
        it('should send all messages from dialog', function (done) {
            nock(config.billing.hostname + ':' + config.ports.billing)
                .get(config.billing.path + '/wallets/137')
                .thrice()
                .reply(200, {ok: true, balance: '43'});

            var _test = this,
                messagesCounter = 0,
                message1,
                message2,
                womanChatMode;

            message1 = {
                resource: 'messages',
                method: 'post',
                payload: {"sender_id":137,"recipient_id":103,"text":"I'm stranger;)"}
            };

            message2 = {
                resource: 'messages',
                method: 'post',
                payload: {"sender_id":137,"recipient_id":103,"text":"There?"}
            };

            this.woman.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });

            this.man.on('settings_replace', function () {
                _test.man.send(JSON.stringify(message1));
                _test.man.send(JSON.stringify(message2));

                _test.woman.on('messages_push', function () {
                    if (++messagesCounter ===  1) {
                        womanChatMode = Woman.get(103, 'chat');

                        womanChatMode.on('messages_replace', function (payload) {
                            expect(payload).to.have.property('137')
                                .with.length(3);
                            done();
                        });
                    }
                });
            });
        });
    });
});