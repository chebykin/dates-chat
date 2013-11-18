var utils = require('../lib/utils'),
    should = require('should');

describe('Utils', function () {
    describe('message2object', function () {
        it('should return correct object form string', function () {
            var msg = {object: 'users', method: 'post', payload: {sender_id: 13, recipient_id: 44, text: 'hello'}};
            var msg_string = JSON.stringify(msg);
            utils.message2object(msg_string).should.be.eql(msg);
        });
    });

    describe('parseDecimal', function () {
        beforeEach(function () {
            this.input = ['1', '2', '3', '4', '5', '6'];
            this.output = [1, 2, 3, 4, 5, 6];
        });

        it('should be equal to array with numbers', function () {
            utils.equalToArray.call(this.input.map(utils.parseDecimal), this.output).should.be.true;
        });

        it('should not be equal to array with string numbers', function () {
            utils.equalToArray.call(this.input.map(utils.parseDecimal), this.input).should.not.be.true;
        });
    });
});