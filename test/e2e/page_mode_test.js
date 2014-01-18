"use strict";

var WebSocket = require('ws'),
    nock = require('nock'),
    chat = require('../../lib/chat'),
    app = require('../../app'),
    women = require('../../lib/user').women,
    utils = require('../../lib/utils'),
    dialogs = require('../../lib/dialogs_collection'),
    Dialog = require('../../lib/dialog'),
    redis = require('../../lib/redis').create(),
    port = process.env.PORT,
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

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        this.first = 103;
        this.second = 137;
        this.wss = app.listen(port);
        this.message_from_man = {sender_id: this.second, recipient_id: this.first, text: 'Hello from me;)'};
        this.dialog_key = 'dialogs:' + this.second + '_' + this.first;

        redis.flushall();

        this.man = Man.get(137, 'chat');
        this.woman = Woman.get(103, 'page');
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
                expect(payload.avatar).to.eql(_test.man.profile.mp);
                expect(payload.age).to.eql(_test.man.profile.a);
                expect(payload.name).to.eql(_test.man.profile.n);
                done();
            });
        });

        it('should store received message in redis', function (done) {
            var _test = this;

            this.woman.on('messages_push', function (payload) {
                redis.lrange(_test.dialog_key, 0, -1, function (err, data) {
                    if (err) done(err);

                    var m = utils.getProps(data);

                    expect(data).to.have.length(1);
                    expect(m.sender_id).to.eql(_test.second);
                    expect(m.recipient_id).to.eql(_test.first);
                    expect(m.text).to.eql(_test.message_from_man.text);
                    done();
                });
            });
        });
    });
});
