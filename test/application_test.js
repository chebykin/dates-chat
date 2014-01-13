"use strict";

var WebSocket = require('ws'),
    PublicError = require('../lib/errors').public,
    AuthorizationError = require('../lib/errors').auth,
    chat = require('../lib/chat'),
    port = process.env.PORT,
    sandbox;

describe('Application', function () {
    beforeEach(function () {
        this.application = require('../app');
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("should call on method with right values", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'sessions', method: 'post'},
            application = this.application,
            appMock = sandbox.mock(application);

        appMock
            .expects('handle')
            .withArgs(sinon.match.instanceOf(WebSocket), request.resource, request.method)
            .atLeast(1)
            .returns(Q.resolve(5));

        ws.on('open', function () {
            ws.send(JSON.stringify(request));
            setTimeout(function () {
                appMock.verify();
                done();
                // websocket timeout
            }, 100);
            ws.close();
        });
    });

    it("should apply all callbacks for resource", function () {
        var application = this.application,
            stackMock = sinon.mock(application.stack);

        stackMock.expects('messages').once();
        stackMock.expects('sessions').once();

        application.handle({}, 'messages', 'get', 'payload payload');
        application.handle({}, 'sessions', 'post', 'payload payload');

        stackMock.verify();
    });

    describe('error handler', function () {
        beforeEach(function () {
            this.ws = new WebSocket('ws://localhost:' + port);
            this.request = {resource: 'messages', method: 'get'};
            this.error_text = "TEST ERROR: should notify about PublicError via websocket\n";
            this.sessions = function () {
                return Q.resolve(5);
            };
        });

        it("should notify about PublicError via websocket", function (done) {
            var _test = this;

            sandbox.stub(this.application.stack, 'sessions').returns(Q.reject(new PublicError(_test.error_text)));
            sandbox.spy(this.application.stack, 'messages');

            this.ws.on('open', function () {
                _test.ws.send(JSON.stringify(_test.request));
            });

            this.ws.on('message', function (data) {
                JSON.parse(data).should.be.eql({reason: 'error', description: _test.error_text});
                done();
            });
        });

        it("should close connection for unauthorized user", function (done) {
            var _test = this;

            sandbox.stub(this.application.stack, 'sessions').returns(Q.reject(new AuthorizationError(_test.error_text)));
            sandbox.spy(this.application.stack, 'messages');

            this.ws.on('open', function () {
                _test.ws.send(JSON.stringify(_test.request));
            });

            this.ws.on('message', function (data) {
                JSON.parse(data).should.be.eql({reason: 'error', description: 'Authorization error.'});
                setTimeout(function () {
                    expect(_test.ws.readyState).to.be.within(2, 3);
                    done();
                }, 0);
            });
        });
    });
});