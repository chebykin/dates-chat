/*
 Test TODO:


 */
describe("User", function() {
    var men,
        women,
        online_men;

    beforeEach(function() {
        men = new UserCollection('men');
        women = new UserCollection('women');
        online_men = [13, 34, 53, 252, 332];
    });

    it("all{} on init should be an empty array", function() {
        expect(men.all).toEqual({});
    });

    xit("should return users in ids() only if they have at least one socket", function () {
    });

    describe("opposite method for users collection", function () {
        it("should return the same instance of opposite, not copy", function () {
            men.register_opposite(women);
            expect(men.opposite).toBe(women);
        });
    });

    describe("Online women", function () {

        beforeEach(function () {
            redis = {
                del: function () {},
                hset: function () {}
            };

            spyOn(redis, 'del');
            spyOn(redis, 'hset');
        });

        xit("notifier should be triggered only when online_men are different than on previous check tick", function () {

        });

        xit("should be notified when online_men_changed event emits", function () {
            redis.del('online_men');
            redis.hset('online_men', online_men);
        });
    });
});
