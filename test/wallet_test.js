var nock = require('nock'),
    Wallet = require('../lib/wallet');

describe('Wallet', function () {
    beforeEach(function () {
        this.wallet = new Wallet(137);
    });

    it('should query api for user balance', function (done) {
        nock('http://' + config.billing.hostname + ':' + config.billing.port)
            .get(config.billing.path + '/wallets/137')
            .reply(200, {ok: true, balance: '43.2'});

        this.wallet.balance()
            .then(function (balance) {
                expect(balance).to.equal(43.2);
            })
            .then(done, done);
    });

    it('should use successful callback if charging gone ok', function (done) {
        nock('http://' + config.billing.hostname + ':' + config.billing.port)
            .post(config.billing.path + '/transactions', {woman_id: 103, service: 'chat', amount: 0.16})
            .reply(200, {ok: true, new_balance: '43.2'});

        this.wallet.charge(0.16)
            .then(function (new_balance) {
                expect(new_balance).to.equal(43.2);
            })
            .fail(function (err) {
                throw new Error('Got fail response when should not');
            })
            .then(done, done);
    });

    it('should use fail callback if user has no money', function (done) {
        nock('http://' + config.billing.hostname + ':' + config.billing.port)
            .post(config.billing.path + '/transactions', {woman_id: 103, service: 'chat', amount: 0.16})
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
        nock('http://' + config.billing.hostname + ':' + config.billing.port)
            .post(config.billing.path + '/transactions', {woman_id: 103, service: 'chat', amount: 0.16})
            .reply(500);

        this.wallet.charge(0.16)
            .then(function () {
                throw new Error('Got success response when should not');
            })
            .fail(function (err) {
                expect(err.message).to.equal("Billing server error");
            })
            .then(done, done);
    });
});