"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    config = require('../../config'),
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
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        redis.flushall();

        this.wss = app.restart(port);
        this.dialog_key = 'dialogs:' + this.second + '_' + this.first;

        this.man = Man.get(137, 'chat');
        this.woman = Woman.get(103, 'chat');

        nock(config.billing.hostname + ':' + config.ports.billing)
            .get(config.billing.path + '/wallets/137')
            .reply(200, {ok: true, balance: '43'});

        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 14})
            .reply(200, {ok: true, new_balance: '43'});
    });

    afterEach(function (done) {
        sandbox.restore();
        redis.flushall(function () {
            done();
        });
    });

    describe('about dialog closing', function () {
        it('should be sent after manual closing', function (done) {
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

            this.woman.on('settings_replace', function () {
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

        it('should be sent after dialog timeout', function (done) {
            var _test = this,
                clock = sinon.useFakeTimers();

            nock(config.billing.hostname + ':' + config.ports.billing)
                .get(config.billing.path + '/wallets/137')
                .reply(200, {ok: true, balance: '43'});

            nock(config.billing.hostname + ':' + config.ports.billing)
                .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 14})
                .times(4)
                .reply(200, {ok: true, new_balance: '43'});

            this.man.on('messages_push', function (payload) {
                expect(payload.text).to.equal(_test.message_from_woman.text);
                expect(payload.sender_id).to.equal(_test.message_from_woman.sender_id);
                expect(payload.recipient_id).to.equal(_test.message_from_woman.recipient_id);
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
                    clock.restore();
                    done();
                });
                clock.tick(310000);
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

    describe('on dialog on', function () {
        it('should keep dialog on status on front-end after page reload on chat mode', function (done) {
            var _test = this;

            this.woman.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });

            this.woman.on('messages_push', function () {
                _test.woman.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_woman
                }));
            });

            this.man.on('dialogs_create', function (payload) {
                var woman;

                expect(payload.contact).to.equal(103);
                _test.woman.close();

                woman = Woman.get(103, 'chat');

                woman.on('dialogs_replace', function (payload) {
                    expect(payload).to.have.property('contacts')
                        .include(137);
                    done();
                });
            });
        });
    });

    describe('sessions push', function () {
        it('should be send after successful session mode set', function (done) {
            this.woman.on('sessions_push', function (response) {
                expect(response.mode).to.equal('set');
                done();
            });
        });
    });

    describe('settings_replace', function () {
        it('should be send back after successful setting new settings', function (done) {
            var _test = this,
                cfg;

            cfg = {
                play_sound: true,
                notifications: 'native'
            };

            function womanListener (settings) {
                _test.woman.removeAllListeners('settings_replace');

                expect(settings).to.deep.equal({
                    play_sound: false,
                    notifications: 'js'
                });

                _test.woman.on('settings_replace', function (settings) {
                    expect(settings).to.deep.eql(cfg);
                    done();
                });

                _test.woman.send(JSON.stringify({
                    resource: 'settings',
                    method: 'post',
                    payload: cfg
                }));
            }

            this.woman.on('settings_replace', womanListener);
        });
    });

    describe('online users update', function () {
        it('should send update only if online user ids are changed', function (done) {
            var _test = this,
                manListener;

            this.timeout(3000);

            manListener = function (users) {
                expect(users).to.have.property('103')
                    .that.is.a('string');
                _test.man.removeListener('online_users_replace', manListener);

                _test.man.on('online_users_replace', function (users) {
                    expect(users).to.have.keys(['103', '225', '614']);
                    done();
                });

                setTimeout(function () {
                    var woman1 = Woman.get(225, 'chat');
                    var woman2 = Woman.get(614, 'chat');
                }, 1100);
            };

            this.man.on('online_users_replace', manListener);
        });
    });

    describe('webcams update', function () {
        beforeEach(function (done) {
            // wait for ws.close() callback will delete webcams status of generated users
            setTimeout(function () {
                done();
            }, 150);
        });

        it('should send update if webcam users changed', function (done) {
            var _test = this,
                state = {225: 'on', 614: 'on', '755': 'active'},
                camListener;

            this.timeout(3000);

            Woman.get(225, 'chat');
            Woman.get(614, 'chat');
            Woman.get(755, 'chat');
            Woman.get(318, 'chat');

            var woman5;
            var woman6;

            redis.hmset('webcams:women', state);

            camListener = function (cams) {
                expect(cams).to.deep.equal(state);
                _test.man.removeListener('webcams_replace', camListener);

                woman5 = Woman.get(114, 'chat');
                woman6 = Woman.get(979, 'chat');

                woman5.on('sessions_push', function () {
                    setTimeout(function () {
                        woman5.send(JSON.stringify({
                            resource: 'webcams',
                            method: 'post',
                            payload: 'on'
                        }));
                    }, (config.intervals.online_check_interval + 100));
                });

                woman6.on('sessions_push', function () {
                    setTimeout(function () {
                        woman6.send(JSON.stringify({
                            resource: 'webcams',
                            method: 'post',
                            payload: 'active'
                        }));
                    }, (config.intervals.online_check_interval + 100));
                });

                _test.man.on('webcams_replace', function (cams) {
                    state[114] = 'on';
                    state[979] = 'active';

                    expect(cams).to.deep.equal(state);
                    done();
                });
            };

            this.man.on('webcams_replace', camListener);
        });

        it('should send update if webcam states changed, but not users', function (done) {
            var _test = this,
                state = {225: 'on', 614: 'on', '755': 'active'},
                camListener;

            redis.hmset('webcams:women', state);
            this.timeout(3000);

            var woman = Woman.get(225, 'chat');
            Woman.get(614, 'chat');
            Woman.get(755, 'chat');
            Woman.get(318, 'chat');

            woman.on('sessions_push', function () {
                setTimeout(function () {
                    woman.send(JSON.stringify({
                        resource: 'webcams',
                        method: 'post',
                        payload: 'active'
                    }));
                }, (config.intervals.online_check_interval + 100));
            });

            camListener = function (cams) {
                expect(cams).to.deep.equal(state);
                _test.man.removeListener('webcams_replace', camListener);

                _test.man.on('webcams_replace', function (cams) {
                    state[225] = 'active';

                    expect(cams).to.deep.equal(state);
                    done();
                });
            };

            _test.man.on('webcams_replace', camListener);
        });

        it("should remove user form redis an notify listening clients if all user's websockets are close", function (done) {
            var _test = this,
                state = {225: 'on', '664': 'active'},
                camListener;

            this.timeout(2000);

            var woman = Woman.get(225, 'chat');
            Woman.get(664, 'chat');

            redis.hmset('webcams:women', state);

            camListener = function (cams) {
                expect(cams).to.deep.equal(state);
                _test.man.removeListener('webcams_replace', camListener);

                _test.man.on('webcams_replace', function (cams) {
                    delete state['225'];
                    expect(cams).to.deep.equal(state);
                    done();
                });

                woman.close();
            };

            this.man.on('webcams_replace', camListener);
        });
    });
});