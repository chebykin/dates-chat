TESTS = test/*.js

test:
	redis-server --port 6391 &
	@NODE_ENV=test ./node_modules/.bin/mocha --harmony --require test/common
	redis-cli -p 6391 flushall
	redis-cli -p 6391 shutdown

.PHONY: test
