NODE = node
TEST = expresso
TESTS ?= test/*.js

test:
	@CONNECT_ENV=test $(TEST) \
	-I lib \
	$(TEST_FLAGS) $(TESTS)

test-cov:
	@$(MAKE) test TEST_FLAGS="--cov"

.PHONY: test test-cov
