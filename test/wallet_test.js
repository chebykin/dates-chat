var nock = require('nock'),
    Wallet = require('../lib/wallet');

describe('Wallet', function () {
    beforeEach(function () {
        this.wallet = new Wallet(137, 103);
    });

    it('should query api for user balance', function (done) {
        nock(config.billing.hostname + ':' + config.ports.billing)
            .get(config.billing.path + '/wallets/137')
            .reply(200, {ok: true, balance: '43'});

        this.wallet.balance()
            .then(function (balance) {
                expect(balance).to.equal(43);
            })
            .then(done, done);
    });

    it('should use successful callback if charging gone ok', function (done) {
        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 0.16})
            .reply(200, {ok: true, new_balance: '43'});

        this.wallet.charge(0.16)
            .then(function (new_balance) {
                expect(new_balance).to.equal(43);
            })
            .fail(function (err) {
                throw new Error('Got fail response when should not');
            })
            .then(done, done);
    });

    it('should use fail callback if user has no money', function (done) {
        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 0.16})
            .reply(200, {ok: false, description: 'something failed'});

        this.wallet.charge(0.16)
            .then(function (new_balance) {
                throw new Error('Got success response when should not');
            })
            .fail(function (err) {
                expect(err.message).to.equal('something failed');
            })
            .then(done, done);

    });

    it("should use fail callback if server doesn't response with success", function (done) {
        nock(config.billing.hostname + ':' + config.ports.billing)
            .post(config.billing.path + '/transactions/', {man_id: 137, woman_id: 103, service: 'chat', amount: 0.16})
            .reply(500);

        this.wallet.charge(0.16)
            .then(function () {
                throw new Error('Got success response when should not');
            })
            .fail(function (err) {
                expect(err.message).to.equal("Billing server error. Please, contact support.");
            })
            .then(done, done);
    });
});