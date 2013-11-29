"use strict";

var men = require('../lib/user').men,
    women = require('../lib/user').women,
    redis = require('redis').createClient(config.redis_port),
    Dialog = require('../lib/dialog'),
    dialogs = require('../lib/dialogs_collection');

describe('Dialog', function () {
    before(function () {
        this.first = 103;
        this.second = 137;
        this.message_from_woman = {sender_id: this.first, recipient_id: this.second};
        this.message_from_man = {sender_id: this.second, recipient_id: this.first};
        this.collection_key = this.second + '_' + this.first;
        this.redis_key = 'dialogs:' + this.collection_key;

        women.all[this.first] = [{}, {}];
        men.all[this.second] = [{}, {}];
    });

    beforeEach(function () {
        this.dialog = new Dialog(137, 103);
    });

    afterEach(function () {
        redis.del(this.redis_key);
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
            
            this.dialog.initialize_man()
                .then(function () {
                    walletMock.verify();
                })
                .then(done, done);
        });

        it('should reject with error if account balance is too low', function (done) {
            var deferred = Q.defer();

            sinon.stub(this.dialog.wallet, 'balance').returns(deferred.promise);
            deferred.resolve(0);

            this.dialog.initialize_man()
                .then(function () {
                    throw new Error('No promise was rejected when it should.');
                })
                .fail(function (err) {
                    expect(err.message).to.equal('Account balance is too low');
                })
                .then(done, done);
        });
    });

    describe('continuing', function () {

        describe('while OFF state', function () {
            describe("man's message", function () {
                beforeEach(function () {
                    var deferred = Q.defer();
                    sinon.stub(this.dialog.wallet, 'balance').returns(deferred.promise);
                    deferred.resolve(10);
                });

                it("should switch state to 'initialized'", function (done) {
                    var dialog = this.dialog;

                    expect(dialog.state).to.equal('off');

                    dialog.deliver(this.message_from_man)
                        .then(function () {
                            expect(dialog.state).to.equal('initialized');
                            expect(dialog.tracker.state).to.equal('off');
                        })
                        .fail(function () {
                            throw new Error('Promise was rejected when should not');
                        })
                        .then(done, done);
                });

                it("should set man_active property of dialog to true", function (done) {
                    var dialog = this.dialog;

                    dialog.deliver(this.message_from_man)
                        .then(function () {
                            expect(dialog.man_active).to.equal(true);
                            expect(dialog.woman_active).to.equal(false);
                        })
                        .fail(function () {
                            throw new Error('Promise was rejected when should not');
                        })
                        .then(done, done);
                });
            });

            describe("woman's message", function () {
                it("should keep 'off' state", function (done) {
                    var dialog = this.dialog,
                        startMock = sinon.mock(dialog);

                    startMock.expects('initialize_man').never();
                    expect(dialog.state).to.equal('off');

                    dialog.deliver(this.message_from_woman)
                        .then(function () {
                            expect(dialog.state).to.equal('off');
                            expect(dialog.tracker.state).to.equal('off');
                            startMock.verify();
                        })
                        .fail(bad_fail)
                        .then(done, done);
                });

                it("should set woman_active property to true", function (done) {
                    var dialog = this.dialog;

                    dialog.deliver(this.message_from_woman)
                        .then(function () {
                            expect(dialog.man_active).to.equal(false);
                            expect(dialog.woman_active).to.equal(true);
                        })
                        .fail(function (e) {
                            throw new Error('Promise was rejected when should not');
                        })
                        .then(done, done);
                });

                it('should call delete method on collection after delivery or store', function (done) {
                    var dialog = this.dialog,
                        deleteMock = sinon.mock(dialogs);

                    deleteMock.expects('del').withArgs(this.collection_key).once();

                    dialog.deliver(this.message_from_woman)
                        .then(function () {
                            deleteMock.verify();
                        })
                        .fail(function () {
                            throw new Error('Promise was rejected when should not');
                        })
                        .then(done, done);
                });
            });
        });

        describe("while INITIALIZED state", function () {
            it("should initialize dialog immediately after sending first message, when " +
                "last one is from woman and is sent at last 30 minutes", function (done) {
                var dialog = this.dialog,
                    deferred = Q.defer();

                redis.rpush(this.redis_key, JSON.stringify(this.message_from_woman));
                sinon.stub(dialog.wallet, 'balance').returns(deferred.promise);
                deferred.resolve(10);

                expect(dialog.state).to.equal('off');

                dialog.deliver(this.message_from_man)
                    .then(function () {
                        expect(dialog.state).to.equal('on');
                        expect(dialog.tracker.state).to.equal('on');
                    })
                    .fail(function () {
                        throw new Error('Promise was rejected when should not');
                    })
                    .then(done, done);
            });
        });
    });

    describe('closing', function () {
        it("can be initialized only by man or end money callback");
        describe('manually', function () {
            it("should switch dialog state to 'manual off' if last message role is woman", function () {
                var dialog = this.dialog;

                dialog.last_message_role = 'woman';
                dialog.state = 'on';
                dialog.manual_off();

                expect(dialog.state).to.equal('manual off');
            });

            it("should set callback that after 30 minutes destroys this dialog", function () {
                dialogs.clear();
                var dialog = dialogs.between(137, 103),
                    clock = sinon.useFakeTimers();

                expect(dialogs.collection.size).to.equal(1);
                dialog.last_message_role = 'woman';
                dialog.state = 'on';
                clock.tick(1799999);
                expect(dialogs.collection.size).to.equal(1);
                dialog.manual_off();
                clock.tick(1800010);
                expect(dialogs.collection.size).to.equal(0);
                clock.restore();
                dialogs.clear();
            });

            it("should use standard close method if last message is from him", function (done) {
                dialogs.clear();
                var dialog = dialogs.between(137, 103),
                    dialogsMock = sinon.mock(dialogs);

                dialogsMock.expects('del').withArgs('137_103').once();

                dialog.last_message_role = 'man';
                dialog.state = 'on';

                setTimeout(function () {
                    dialogsMock.verify();
                    dialogs.clear();
                    done();
                }, 0);

                dialog.manual_off();
            });
        });
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
        it('should woman callback if last message from woman', function (done) {
            redis.rpush(this.redis_key, JSON.stringify(this.message_from_woman));

            this.dialog.last_message_is_from(function () {
                throw new Error('Man callback was called when should not');
            }, function () {
                done();
            });
        });

        it('should use man callback if last message from man', function (done) {
            redis.rpush(this.redis_key, JSON.stringify(this.message_from_man));

            this.dialog.last_message_is_from(function () {
                done();
            }, function () {
                throw new Error('Woman callback was called when should not');
            });
        });

        it('should use man callback if there is no any messages before', function (done) {
            redis.del(this.redis_key);

            this.dialog.last_message_is_from(function () {
                done();
            }, function () {
                throw new Error('Woman callback was called when should not');
            });
        });

        it('should set last_message_role property of instance', function (done) {
            var dialog = this.dialog,
                _test = this;

            redis.rpush(this.redis_key, JSON.stringify(this.message_from_man));

            dialog.last_message_is_from(function () {
                expect(dialog.last_message_role).to.equal('man');
                redis.rpush(_test.redis_key, JSON.stringify(_test.message_from_woman));

                dialog.last_message_is_from(function () {
                    throw new Error('Man callback was called when should not');
                }, function () {
                    expect(dialog.last_message_role).to.equal('woman');
                    done();
                });
            }, function () {
                throw new Error('Woman callback was called when should not');
            });
        });
    });

});