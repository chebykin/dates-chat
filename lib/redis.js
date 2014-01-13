"use strict";

var config = require('../config'),
    url = require('url'),
    redis = require('redis'),
    current;

module.exports = {
    create: function () {
        var cfg = url.parse(config.redis_url),
            client = redis.createClient(cfg.port, cfg.hostname);

        client.auth(cfg.auth.split(":")[1]);

        return client;
    },
    current: function () {
        return current || (current = module.exports.create());
    }
};