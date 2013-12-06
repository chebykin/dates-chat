
var config = {
    development: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6390,
        billing: {
            hostname: 'http://dev.bestuabrides.com',
            path: '/chat_api',
            port: 80,
            timeout: 10000
        },
        timeouts: {
            manual_off_timeout: 1800000, // 30 minutes
            inactive_timeout: 300000, // 5 minutes
            charge_interval: 60000 // 1 minute
        }
    },
    test: {
        online_check_interval: 1500,
        websocket_port: 10013,
        redis_port: 6391,
        billing: {
            hostname: 'http://127.0.0.1',
            path: '/fake_api',
            port: 12345,
            timeout: 1000
        },
        timeouts: {
            manual_off_timeout: 1800000,
            inactive_timeout: 300000,
            charge_interval: 60000
        }
    },
    production: {
        online_check_interval: 3500,
        websocket_port: 10013,
        redis_port: 6390
    }
};

module.exports = config;