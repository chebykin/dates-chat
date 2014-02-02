"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    utils = require('../../lib/utils'),
    redis = require('../../lib/redis').create(),
    RecentUsers = require('../../lib/recent_users'),
    port = process.env.PORT,
    sandbox;

describe('Recent Users', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        this.message_from_woman = {sender_id: this.first, recipient_id: this.second, text: 'Hi man!'};
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};
    });

    beforeEach(function () {
        var time = new Date().getTime();

        sandbox = sinon.sandbox.create();

        redis.flushall();

        redis.zadd('recent_users:137', (time - 20), 15); // middle
        redis.zadd('recent_users:137', (time - 35), 27); // bottom
        redis.zadd('recent_users:137', (time - 5), 67); // top

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

    describe('on new connection', function() {
        it('should be fully replaced', function (done) {
            this.man.on('recent_users_replace', function (payload) {
                expect(payload).to.have.members([67, 27, 15]);
                done();
            });
        });
    });

    describe('on message to new contact', function () {
        it('should be stored in redis db', function (done) {
            var _test = this;

            this.timeout(1000);

            this.man.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });

            this.woman.on('messages_push', function () {
                RecentUsers.all(137).then(function (result) {
                    expect(result).to.have.members([103, 67, 27, 15]);
                    done();
                });
            });
        });

        it('should be fully replaced', function (done) {
            var _test = this,
                manListener;

            this.timeout(1000);

            this.man.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'messages',
                    method: 'post',
                    payload: _test.message_from_man
                }));
            });

            manListener = function (result) {
                expect(result).to.have.members([67, 27, 15]);

                _test.man.removeListener('recent_users_replace', manListener);
                _test.man.on('recent_users_replace', function (result) {
                    expect(result).to.have.members([103, 67, 27, 15]);
                    done();
                });
            };

            this.man.on('recent_users_replace', manListener);
        });
    });

    describe('on clear recent users button click', function () {
        it('should be removed from redis db and be fully replaced on client', function (done) {
            var _test = this,
                manListener;

            this.timeout(1000);

            this.man.on('settings_replace', function () {
                _test.man.send(JSON.stringify({
                    resource: 'recent_users',
                    method: 'delete_all'
                }));
            });

            manListener = function (result) {
                expect(result).to.have.members([67, 27, 15]);

                _test.man.removeListener('recent_users_replace', manListener);
                _test.man.on('recent_users_replace', function (result) {
                    expect(result).to.have.members([]);
                    RecentUsers.all(137).then(function (result) {
                        expect(result).to.have.members([]);
                        done();
                    });
                });
            };

            this.man.on('recent_users_replace', manListener);
        });
    });
});