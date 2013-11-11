var should = require('should'),
    sinon = require('sinon'),
    WebSocket = require('ws'),
    PublicError = require('../lib/errors').public,
    PrivateError = require('../lib/errors').private,
    port = 20300;

describe('Application', function () {
    beforeEach(function () {
        this.application = require('../lib/application');
        this.application.init({});
        this.application.listen(++port);
    });

    it("should call on method with right values", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'message', method: 'get'},
            application = this.application;

        var stub = sinon.stub(application, 'handle');

        ws.on('open', function () {
            ws.send(JSON.stringify(request));
            setTimeout(function () {
                stub.calledWithExactly(application.handle, sinon.match.any, request.resource, request.method);
                stub.restore();
                done();
                // websocket timeout
            }, 100);
            ws.close();
        });
    });

    it("should apply all callbacks for resource", function () {
        var application = this.application,
            messages_handler = sinon.spy(),
            online_users_handler = sinon.spy();

        application.use('messages', messages_handler);
        application.use('online_users', online_users_handler);

        application.handle({}, 'messages', 'get', 'payload payload');

        messages_handler.called.should.be.ok;
        online_users_handler.called.should.not.be.ok;
    });

    it("should notify about PublicError via websocket", function (done) {
        var ws = new WebSocket('ws://localhost:' + port),
            request = {resource: 'thrower', method: 'get'},
            application = this.application;

        function sessions () {}

        function thrower () {
            throw new PublicError('some message');
        }

        application.use('sessions', sessions);
        application.use('thrower', thrower);

        ws.on('open', function () {
            ws.send(JSON.stringify(request));
        });

        ws.on('message', function (data) {
            JSON.parse(data).should.be.eql({reason: 'error', description: 'some message'});
            done();
        })

    });
});