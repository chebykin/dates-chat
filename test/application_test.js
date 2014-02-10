"use strict";

var WebSocket = require('ws'),
    chat = require('../lib/chat'),
    app = require('../app'),
    port = process.env.PORT,
    sandbox;

describe('Application', function () {
    before(function () {
        app.restart(port);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        sandbox.stub(app.stack.sessions.request, 'post').returns(Q.resolve());
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("should call on method with right values", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'sessions', method: 'post'},
            appMock = sandbox.mock(app);

        appMock
            .expects('handle')
            .withArgs(sinon.match.instanceOf(WebSocket), request.resource)
            .atLeast(1)
            .returns(Q.resolve(5));

        ws.on('open', function () {
            setTimeout(function () {
                appMock.verify();
                done();
                // websocket timeout
            }, 100);
            ws.close();
        });
    });

    it("should apply all callbacks for resource", function () {
        sandbox.restore();

        var stackMock = sinon.mock(app.stack.sessions.request);

        stackMock.expects('post').once();

        app.handle({}, 'sessions', 'post', 'payload payload');

        stackMock.verify();
    });
});