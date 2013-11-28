"use strict";

var sinon = require('sinon'),
    expect = require('chai').expect,
    config = require('../config')[process.env.NODE_ENV],
    redis = require('redis').createClient(config.redis_port),
    men = require('../lib/user').men,
    women = require('../lib/user').women,
    Dialog = require('../lib/dialog');

describe('Dialog', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        women.all[this.first] = [{}, {}];
        men.all[this.second] = [{}, {}];
    });

    beforeEach(function () {
        this.dialog = new Dialog(137, 103);
    });

    describe('constructor', function () {
        it('should not allow non-numeric values for user id', function () {
            (function () {
                new Dialog('Vasya', '137');
            }).should.throw();
        });

        it('should set price pr minute from billing config', function () {
            expect(require('../billing').price_per_minute_for.chat)
                .to.equal((new Dialog(this.first, this.second)).price_per_minute);
        });
    });

    describe('beginning', function () {
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
                    expect(err.message).to.equal('Account balance is too low');
                })
                .then(done, done);
        });
        it('should check for previous message and if it from woman, start immediately');
    });

    describe('continuing', function () {
        describe('as man', function () {
            it.skip("should not start dialog after first message from man, when last one doesn't exists", function (done) {
                var dialog = this.dialog;

                expect(dialog.state).to.equal('initialized');

                dialog.deliver('man')
                    .then(function () {
                        expect(dialog.state).to.equal('started');
                    })
                    .fail(function () {
                        throw new Error('Promise was rejected when should not');
                    })
                    .then(done, done);
            });
        });

        describe('as woman', function () {

        });
    });

    describe('closing', function () {
        it("can be initialized only by man or end money callback");
    });

    describe('key generator ', function () {
        it('should return correct man and woman ids for dialog', function () {
            expect(this.dialog.man_id).to.equal(this.second);
            expect(this.dialog.woman_id).to.equal(this.first);
        });

        it('should return correct dialog key for dialog', function () {
            expect(this.dialog.key()).to.equal('dialogs:' + this.second + '_' + this.first);
        });
    });
});