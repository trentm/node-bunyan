
#---- Tools

TAP := ./node_modules/.bin/tap


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
	./tools/cutarelease.py -p bunyan -f package.json -f lib/bunyan.js -f bin/bunyan

.PHONY: test
test: $(TAP)
	TAP=1 $(TAP) test/*.test.js

