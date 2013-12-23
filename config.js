var config = {
    billing: {
        hostname: process.env.UB_BILLING_HOSTNAME,
        path: process.env.UB_BILLING_PATH
    },
    ports: {
        billing: process.env.UB_BILLING_PORT,
        websocket: process.env.PORT
    },
    timeouts: {
        billing_server_response_timeout: process.env.UB_BILLING_TIMEOUT,
        manual_off_timeout: process.env.UB_TIMEOUTS_MANUAL_OFF_TIMEOUT,
        inactive_timeout: process.env.UB_TIMEOUTS_INACTIVE_TIMEOUT
    },
    intervals: {
        charge_interval: process.env.UB_TIMEOUTS_CHARGE_INTERVAL,
        online_check_interval: process.env.ONLINE_CHECK_INTERVAL
    },
    redis_url: process.env.REDISTOGO_URL
};

var integerGroups = ['ports', 'timeouts', 'intervals'];

for (var group in config) {
    if (config.hasOwnProperty(group) && integerGroups.indexOf(group) >= 0) {
        for (var field in config[group]) {
            if (config[group].hasOwnProperty(field)) {
                config[group][field] = parseInt(config[group][field], 10);
            }
        }
    }
}

module.exports = config;