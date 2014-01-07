"use strict";

var WebSocket = require('ws'),
    PublicError = require('../lib/errors').public,
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

    it("should notify about PublicError via websocket", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'thrower', method: 'get'},
            application = this.application,
            error_text = "TEST ERROR: should notify about PublicError via websocket\n";

        function sessions () {
            return Q.resolve(5);
        }

        function thrower () {
            var e = new PublicError(error_text);
            return Q.reject(e);
        }

        application.use('sessions', sessions);
        application.use('thrower', thrower);

        ws.on('open', function () {
            ws.send(JSON.stringify(request));
        });

        ws.on('message', function (data) {
            JSON.parse(data).should.be.eql({reason: 'error', description: error_text});
            done();
        });
    });
});