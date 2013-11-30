"use strict";

var Tracker = require('../lib/tracker');

describe('Tracker', function () {
    beforeEach(function () {
        this.tracker = new Tracker();
    });

    it('should emmit "start" when starting', function (done) {
        this.tracker.on('start', function () {
            done();
        });
        this.tracker.start();
    });

    describe('timers', function () {
        beforeEach(function () {
            this.clock = sinon.useFakeTimers();
        });

        afterEach(function () {
            this.clock.restore();
        });

        it('should emmit tick every minute since start', function () {
            var spy = sinon.spy();

            this.tracker.on('tick', spy);
            this.tracker.start();
            this.clock.tick(config.timeouts.charge_interval * 3 + 100);

            spy.should.have.been.calledThrice;
        });

        it('should be able remove remove manual off callback', function () {
            var spy = sinon.spy();

            this.tracker.start();
            this.tracker.on('manual_off_timeout', spy);
            this.tracker.start_manual_off_timeout();
            this.tracker.remove_manual_off_timeout();
            this.clock.tick(config.timeouts.manual_off_timeout + 100);

            spy.should.not.have.been.called;
        });

        it('should be able to remove inactive timeout', function (done) {
            var spy = sinon.spy(),
                test = this;

            this.tracker.on('inactive_timeout', spy);
            this.tracker.start();
            expect(this.tracker.inactive_timeout).to.not.equal(null);
            this.tracker.remove_inactive_timeout();

            setTimeout(function () {
                expect(test.tracker.inactive_timeout).to.equal(null);
                spy.should.not.have.been.called;
                done();
            }, 1);

            this.clock.tick(config.timeouts.inactive_timeout + 1000);
        });
    });
});