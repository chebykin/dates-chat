"use strict";

var WebSocket = require('ws'),
    PublicError = require('../../lib/errors').public,
    AuthorizationError = require('../../lib/errors').auth,
    chat = require('../../lib/chat'),
    app = require('../../app'),
    port = process.env.PORT,
    sandbox;

describe('Errors handler', function () {
    before(function () {
        app.restart(port);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        this.request = {resource: 'messages', method: 'get'};
        this.error_text = "TEST ERROR: should notify about PublicError via websocket\n";
        this.sessions = function () {
            return Q.resolve(5);
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("should notify about PublicError via websocket", function (done) {
        var _test = this;

        sandbox.stub(app.stack.sessions.request, 'post').returns(Q.reject(new PublicError(_test.error_text)));
        var man = Man.get(137, 'chat');

        man.on('error_push', function (message) {
            expect(message).to.equal(_test.error_text);
            done();
        });
    });

    it("should close connection for unauthorized user", function (done) {
        var _test = this;

        sandbox.stub(app.stack.sessions.request, 'post').returns(Q.reject(new AuthorizationError(_test.error_text)));
        var man = Man.get(137, 'chat');

        man.on('error_push', function (data) {
            expect(data).to.equal('Authorization error');
            setTimeout(function () {
                expect(man.readyState).to.be.within(2, 3);
                done();
            }, 0);
        });
    });
});