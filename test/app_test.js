var app = require('../app.js'),
    should = require('should'),
    sinon = require('sinon'),
    utils = require('../lib/utils'),
    sessions = require('../actions/sessions'),
    WebSocket = require('ws'),
    port = 20400;

describe('Chat app', function () {
    before(function () {
        this.server = app.listen(++port);
    });

    after(function () {
        this.server.close();
    });

    it('should listen on localhost:process.env.PORT', function (done) {
        var hanleStub = sinon.stub(app, 'handle').returns(true);
        var ws = new WebSocket('ws://localhost:' + port);
        ws.on('open', function () {
            ws.readyState.should.be.eql(WebSocket.OPEN);
            ws.close();
            hanleStub.restore();
            done();
        });
    });

    it('can set any property from app', function () {
        app.set('13', 'my_val');
        app.settings['13'].should.be.eql('my_val');
    });

});