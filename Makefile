TESTS = test/*.js

test:
	redis-cli -p 6391 shutdown &
	redis-server --port 6391 &
	@NODE_ENV=test ./node_modules/.bin/mocha -t 500 --harmony --recursive --require test/common --require test/e2e/helper.js --reporter spec
	redis-cli -p 6391 flushall
	redis-cli -p 6391 shutdown

.PHONY: test
