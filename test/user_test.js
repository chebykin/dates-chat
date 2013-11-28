"user strict";

var men = require('../lib/user').men;

describe('User', function () {
    it('should return all keys (integer) for online users', function () {
        men.all['137'] = [{}, {}];
        men.all['129'] = [{}, {}];
        men.all['113'] = [{}, {}];

        expect(men.keys()).to.be.an.instanceOf(Array);
        expect(men.keys()).to.have.members([137, 129, 113]);
    });
});