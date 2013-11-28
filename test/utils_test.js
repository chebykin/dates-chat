"use strict";

var utils = require('../lib/utils'),
    men = require('../lib/user').men,
    women = require('../lib/user').women;

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

    describe('man_and_woman', function () {
        it('should give correct redis key for dialog', function () {
            var first = 103,
                second = 137;

            women.all[first] = [{}, {}];
            men.all[second] = [{}, {}];

            utils.dialog_key(first, second).should.eql('137_103');
            utils.dialog_key(second, first).should.eql('137_103');

            (function () {utils.dialog_key(first, 123);})
                .should.throw("Error while calculating dialog key: can't determine man key.");

            (function () {utils.dialog_key(second, 123);})
                .should.throw("Error while calculating dialog key: can't determine woman key.");

            (function () {utils.dialog_key(second, undefined);})
                .should.throw("Error while generating key for dialog.");
        });
    });
});