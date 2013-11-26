TESTS = test/*.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --harmony

.PHONY: test
