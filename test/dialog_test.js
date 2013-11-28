"use strict";

var men = require('../lib/user').men,
    women = require('../lib/user').women,
    redis = require('redis').createClient(config.redis_port),
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
            var walletMock = sinon.mock(this.dialog.wallet),
                deferred = Q.defer();

            walletMock.expects('balance').once().returns(deferred.promise);
            deferred.resolve(1);
            
            this.dialog.start()
                .then(function () {
                    walletMock.verify();
                })
                .then(done, done);
        });

        it('should reject with error if account balance is too low', function (done) {
            var deferred = Q.defer();

            sinon.stub(this.dialog.wallet, 'balance').returns(deferred.promise);
            deferred.resolve(0);

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
        beforeEach(function () {
            this.message = {recipient_id: this.first, text: 'blahblah'};
        });

        describe('as man', function () {
            it("should not start dialog after first message from man, when last one doesn't exists", function (done) {
                var dialog = this.dialog,
                    deferred = Q.defer();

                sinon.stub(dialog.wallet, 'balance').returns(deferred.promise);
                deferred.resolve(10);

                expect(dialog.state).to.equal('off');

                dialog.deliver(this.message)
                    .then(function () {
                        expect(dialog.state).to.equal('initialized');
                    })
                    .fail(function () {
                        throw new Error('Promise was rejected when should not');
                    })
                    .then(done, done);
            });

            it.skip("should start dialog immediately after first message from man, when last one is from woman", function (done) {
                var dialog = this.dialog,
                    deferred = Q.defer();

                sinon.stub(dialog.wallet, 'balance').returns(deferred.promise);
                deferred.resolve(10);

                expect(dialog.state).to.equal('off');

                dialog.deliver(this.message)
                    .then(function () {
                        expect(dialog.state).to.equal('initialized');
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

    describe('status', function () {

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

    describe('after check for last message', function () {
        before(function () {
            this.key = 'dialogs:' + this.second + '_' + this.first;
        });

        it('should woman callback if last message from woman', function (done) {
            var message_from_woman = {sender_id: this.first, recipient_id: this.second};

            redis.rpush(this.key, JSON.stringify(message_from_woman));

            this.dialog.last_message_is_from(function () {
                throw new Error('Success callback was called when should not');
            }, function () {
                done();
            });
        });

        it('should use man callback if last message from man', function (done) {
            var message_from_man = {sender_id: this.second, recipient_id: this.first};

            redis.rpush(this.key, JSON.stringify(message_from_man));

            this.dialog.last_message_is_from(function () {
                done();
            }, function () {
                throw new Error('Success callback was called when should not');
            });
        });

        it('should use man callback if there is no any messages before', function (done) {
            redis.del(this.key);

            this.dialog.last_message_is_from(function () {
                done();
            }, function () {
                throw new Error('Success callback was called when should not');
            });
        });
    });

});