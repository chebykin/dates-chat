var app = require('../app.js'),
    should = require('should'),
    sinon = require('sinon'),
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
        var ws = new WebSocket('ws://localhost:' + port);
        ws.on('open', function () {
            ws.readyState.should.be.eql(WebSocket.OPEN);
            ws.close();
            done();
        });
    });

    it('can set any property from app', function () {
        app.set('13', 'my_val');
        app.settings['13'].should.be.eql('my_val');
    });

});