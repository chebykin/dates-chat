var Redis = require('redis'),
    redis = Redis.createClient(6390),
    hat = require('hat'),
    WebSocket = require('ws');

var ids = [];

redis.hgetall('user_profiles', function (err, obj) {
  ids = [];
  
  for (var u in obj) {
    if(obj.hasOwnProperty(u)){
      user = JSON.parse(obj[u]);
      if(user.cp != "/assets/avatar_man.jpg" && user.cp != "/assets/avatar_woman.jpg") {
        ids.push(u);
      }
    }
  }
  ids = ids.splice(30,30);
  ids.forEach(function (id) {
    var hash = hat(); 
    var value = JSON.stringify({user_id: id, role: 'woman'});
    redis.hset('chat:session:store', hash, value);
    console.log(hash);
    ws = new WebSocket('ws://chat.ub.local:10001', {
      headers: {
        cookie: "_v_token_key=" + hash
      }
    });
  });
});

function random() {return (0.5 - Math.random())}
