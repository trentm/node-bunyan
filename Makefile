
#---- Tools

TAP := ./node_modules/.bin/tap


#---- Files

JSSTYLE_FILES := $(shell find lib test tools -name *.js)



#---- Targets

all:

# Ensure all version-carrying files have the same version.
.PHONY: versioncheck
versioncheck:
	[[ `cat package.json | json version` == `grep '^var VERSION' bin/bunyan | awk -F'"' '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' lib/bunyan.js | awk -F'"' '{print $$2}'` ]]
	@echo Version check ok.

.PHONY: cutarelease
cutarelease: versioncheck
	[[ ! -d tmp ]]   # No 'tmp/' allowed: https://github.com/isaacs/npm/issues/2144
	./tools/cutarelease.py -p bunyan -f package.json -f lib/bunyan.js -f bin/bunyan

.PHONY: test
test: $(TAP)
	TAP=1 $(TAP) test/*.test.js

.PHONY: check-jsstyle
check-jsstyle: $(JSSTYLE_FILES)
	./tools/jsstyle -o indent=2,doxygen,unparenthesized-return=0,blank-after-start-comment=0 $(JSSTYLE_FILES)

.PHONY: check
check: check-jsstyle
	@echo "Check ok."

.PHONY: prepush
prepush: check test
	@echo "Okay to push."
