
#---- Tools

TAP := ./node_modules/.bin/tap


#---- Files

JSSTYLE_FILES := $(shell find lib test tools examples -name "*.js") bin/bunyan



#---- Targets

all:

# Ensure all version-carrying files have the same version.
.PHONY: versioncheck
versioncheck:
	[[ `cat package.json | json version` == `grep '^## ' CHANGES.md | head -1 | awk '{print $$3}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' bin/bunyan | awk -F'"' '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' lib/bunyan.js | awk -F"'" '{print $$2}'` ]]
	@echo Version check ok.

.PHONY: cutarelease
cutarelease: versioncheck
	[[ `git status | tail -n1` == "nothing to commit (working directory clean)" ]]
	./tools/cutarelease.py -p bunyan -f package.json -f lib/bunyan.js -f bin/bunyan


#---- test

.PHONY: test
test: $(TAP)
	TAP=1 $(TAP) test/*.test.js

# Test will all node supported versions (presumes install locations I use on my machine).
.PHONY: testall
testall: test08 test06 test09

.PHONY: test09
test09:
	@echo "# Test node 0.9.x (with node `$(HOME)/opt/node-0.9/bin/node --version`)"
	PATH="$(HOME)/opt/node-0.9/bin:$(PATH)" TAP=1 $(TAP) test/*.test.js
.PHONY: test08
test08:
	@echo "# Test node 0.8.x (with node `$(HOME)/opt/node-0.8/bin/node --version`)"
	PATH="$(HOME)/opt/node-0.8/bin:$(PATH)" TAP=1 $(TAP) test/*.test.js
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
