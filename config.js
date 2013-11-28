
var config = {
    development: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6390,
        billing: {
            hostname: 'http://dev.bestuabrides.com/chat_api',
            port: 80,
            timeout: 1000
        },
        timeouts: {
            manual_off_timeout: 1800000
        }
    },
    test: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6391,
        billing: {
            hostname: '127.0.0.1',
            path: '/fake_api',
            port: 12345,
            timeout: 1000
        },
        timeouts: {
            manual_off_timeout: 1800000
        }
    },
    production: {
        online_check_interval: 3500,
        websocket_port: 10013,
        redis_port: 6390
    }
};

module.exports = config;