var Redis = require('redis'),
    redis = Redis.createClient(6390);

ids = [343, 91, 19, 348, 67, 399, 146, 339, 288, 18, 149, 398, 150, 396, 390, 391];
function random() {return !!(Math.random() < 0.5)}

function visit () {
    console.log('go');
    ids.forEach(function (id) {
        if (random()) {
            redis.set('User:' + id + ':last_request', true, function (err, obj) {});
            redis.expire('User:' + id + ':last_request', 7, function (err, obj) {});
        }
    });
}

setInterval(visit, 5000);
