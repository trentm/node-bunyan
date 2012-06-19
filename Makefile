
#---- Tools

TAP := ./node_modules/.bin/tap


#---- Files

JSSTYLE_FILES := $(shell find lib test tools examples -name "*.js")



#---- Targets

all:

# Ensure all version-carrying files have the same version.
.PHONY: versioncheck
versioncheck:
	[[ `cat package.json | json version` == `grep '^var VERSION' bin/bunyan | awk -F'"' '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' lib/bunyan.js | awk -F"'" '{print $$2}'` ]]
	@echo Version check ok.

.PHONY: cutarelease
cutarelease: versioncheck
	[[ ! -d tmp ]]   # No 'tmp/' allowed: https://github.com/isaacs/npm/issues/2144 (fixed in npm 1.1.12 / node 0.6.14 I think)
	./tools/cutarelease.py -p bunyan -f package.json -f lib/bunyan.js -f bin/bunyan


#---- test

.PHONY: test
test: $(TAP)
	TAP=1 $(TAP) test/*.test.js

# Test will all node supported versions (presumes install locations I use on my machine).
.PHONY: testall
testall: test06 test07 testmaster

.PHONY: testmaster
testmaster:
	@echo "# Test node master (with node `$(HOME)/opt/node-master/bin/node --version`)"
	PATH="$(HOME)/opt/node-master/bin:$(PATH)" TAP=1 $(TAP) test/*.test.js

.PHONY: test07
test07:
	@echo "# Test node 0.7.x (with node `$(HOME)/opt/node-0.7/bin/node --version`)"
	PATH="$(HOME)/opt/node-0.7/bin:$(PATH)" TAP=1 $(TAP) test/*.test.js

.PHONY: test06
test06:
	@echo "# Test node 0.6.x (with node `$(HOME)/opt/node-0.6/bin/node --version`)"
	PATH="$(HOME)/opt/node-0.6/bin:$(PATH)" TAP=1 $(TAP) test/*.test.js


#---- check

.PHONY: check-jsstyle
check-jsstyle: $(JSSTYLE_FILES)
	./tools/jsstyle -o indent=2,doxygen,unparenthesized-return=0,blank-after-start-comment=0,leading-right-paren-ok $(JSSTYLE_FILES)

.PHONY: check
check: check-jsstyle
	@echo "Check ok."

.PHONY: prepush
prepush: check testall
	@echo "Okay to push."
