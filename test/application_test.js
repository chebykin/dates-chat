"use strict";

var WebSocket = require('ws'),
    PublicError = require('../lib/errors').public,
    AuthorizationError = require('../lib/errors').auth,
    chat = require('../lib/chat'),
    port = 20300;

describe('Application', function () {
    beforeEach(function () {
        this.application = require('../lib/application');
        this.application.init({});
        this.application.listen(++port);
    });

    it("should call on method with right values", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'sessions', method: 'post'},
            application = this.application,
            appMock = sinon.mock(application);

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
            messages_handler = sinon.stub().returns(Q.resolve(5)),
            online_users_handler = sinon.stub().returns(Q.resolve(5));

        application.use('messages', messages_handler);
        application.use('online_users', online_users_handler);

        application.handle({}, 'messages', 'get', 'payload payload');

        messages_handler.should.have.been.calledOnce;
        online_users_handler.should.not.have.been.calledOnce;
    });

    describe('error handler', function () {
        beforeEach(function () {
            this.ws = new WebSocket('ws://localhost:' + port);
            this.request = {resource: 'thrower', method: 'get'};
            this.error_text = "TEST ERROR: should notify about PublicError via websocket\n";
            this.sessions = function () {
                return Q.resolve(5);
            };
        });

        it("should notify about PublicError via websocket", function (done) {
            var _test = this;

            function thrower () {
                return Q.reject(new PublicError(_test.error_text));
            }

            this.application.use('sessions', this.sessions);
            this.application.use('thrower', thrower);

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

            function thrower () {
                return Q.reject(new AuthorizationError(_test.error_text));
            }

            this.application.use('sessions', this.sessions);
            this.application.use('thrower', thrower);

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