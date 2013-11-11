
var config = {
    development: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6390
    },
    test: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6390
    },
    production: {
        online_check_interval: 3500,
        websocket_port: 10013,
        redis_port: 6390
    }
};

module.exports = config;