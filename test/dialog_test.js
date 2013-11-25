var sinon = require('sinon'),
    expect = require('chai').expect,
    config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    Dialog = require('../lib/dialog');

describe('Dialog', function () {
    describe('constructor', function () {
        it('should assign numeric man and woman ids in constructor', function () {
            var dialog = new Dialog('137', '103');

            expect(dialog.man_id).to.equal(137);
            expect(dialog.woman_id).to.equal(103);
        });

        it('should not allow non-numeric values for user id', function () {
            (function () {
                new Dialog('Vasya', '137');
            }).should.throw();
        });

        it('should set price pr minute from billing config', function () {
            expect(require('../billing').price_per_minute_for.chat).to.equal((new Dialog(137, 103)).price_per_minute);
        });
    });

    describe('beginning', function () {
        beforeEach(function () {
            this.dialog = new Dialog(137, 103);
        });

        it('should check wallet balance for required amount of money', function (done) {
            var walletMock = sinon.mock(this.dialog.wallet);

            walletMock.expects('balance').once().returns(1);
            
            this.dialog.start()
                .then(function () {
                    walletMock.verify();
                })
                .then(done, done);
        });

        it('should reject with error if account balance is too low', function (done) {
            sinon.stub(this.dialog.wallet, 'balance').returns(0);

            this.dialog.start()
                .then(function () {
                    throw new Error('No promise was rejected when it should.');
                })
                .fail(function (err) {
                    expect(err.message).to.equal('Account balance is too low')
                })
                .then(done, done);
        });

    });
});