var app = require('../app.js'),
    utils = require('../lib/utils'),
    sessions = require('../controllers/sessions_controller'),
    WebSocket = require('ws'),
    port = process.env.PORT;

describe('Chat app', function () {
    before(function () {
        app.restart(port);
    });

    it('should listen on localhost:process.env.PORT', function (done) {
        var sandbox = sinon.sandbox.create(),
            ws = new WebSocket('ws://localhost:' + port);

        sandbox.stub(app, 'handle').returns(Q.resolve({}));
        sandbox.stub(app.stack.sessions.request, 'post').returns(Q.resolve({}));

        ws.on('open', function () {
            expect(ws.readyState).to.equal(WebSocket.OPEN);
            ws.close();
            sandbox.restore();
            done();
        });
    });

    it('can set any property from app', function () {
        app.set('13', 'my_val');
        expect(app.settings['13']).to.equal('my_val');
    });

});