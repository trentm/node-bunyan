
all:

# Ensure jsontool.js and package.json have the same version.
versioncheck:
	[[ `cat package.json | json version` == `grep '^var VERSION' bin/bunyan | awk -F'"' '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' lib/bunyan.js | awk -F'"' '{print $$2}'` ]]
	@echo Version check ok.

cutarelease: versioncheck
	./tools/cutarelease.py -f package.json -f lib/bunyan.js -f bin/bunyan

