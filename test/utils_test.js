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
});