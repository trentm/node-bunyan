
SHELL := bash

#---- Tools

TAP_EXEC := ./node_modules/.bin/tap
SUDO := sudo
ifeq ($(shell uname -s),SunOS)
	# On SunOS (e.g. SmartOS) we expect to run the test suite as the
	# root user -- necessary to run dtrace. Therefore `pfexec` isn't
	# necessary.
	SUDO :=
endif
DTRACE_UP_IN_HERE=
ifeq ($(shell uname -s),SunOS)
    DTRACE_UP_IN_HERE=1
endif
ifeq ($(shell uname -s),Darwin)
    DTRACE_UP_IN_HERE=1
endif


#---- Files

JSSTYLE_FILES := $(shell find lib test tools examples -name "*.js") bin/bunyan


#---- Targets

all $(TAP_EXEC):
	npm install $(NPM_INSTALL_FLAGS)

# Ensure all version-carrying files have the same version.
.PHONY: versioncheck
versioncheck:
	@echo version is: $(shell node -e 'console.log(require("./package.json").version)')
	[[ `node -e 'console.log(require("./package.json").version)'` == `grep '^## ' CHANGES.md | head -2 | tail -1 | awk '{print $$2}'` ]]
	@echo Version check ok.

.PHONY: cutarelease
cutarelease: check
	[[ -z `git status --short` ]]  # If this fails, the working dir is dirty.
	@which json 2>/dev/null 1>/dev/null && \
	    ver=$(shell json -f package.json version) && \
	    name=$(shell json -f package.json name) && \
	    publishedVer=$(shell npm view -j $(shell json -f package.json name)@$(shell json -f package.json version) version 2>/dev/null) && \
	    if [[ -n "$$publishedVer" ]]; then \
		echo "error: $$name@$$ver is already published to npm"; \
		exit 1; \
	    fi && \
	    echo "** Are you sure you want to tag and publish $$name@$$ver to npm?" && \
	    echo "** Enter to continue, Ctrl+C to abort." && \
	    read
	ver=$(shell cat package.json | json version) && \
	    date=$(shell date -u "+%Y-%m-%d") && \
	    git tag -a "$$ver" -m "version $$ver ($$date) beta" && \
	    git push --tags origin && \
	    npm publish --tag beta

.PHONY: docs
docs: toc
	@[[ `which ronn` ]] || (echo "No 'ronn' on your PATH. Install with 'gem install ronn'" && exit 2)
	mkdir -p man/man1
	ronn --style=toc --manual="bunyan manual" --date=$(shell git log -1 --pretty=format:%cd --date=short) --roff --html docs/bunyan.1.ronn
	python -c 'import sys; h = open("docs/bunyan.1.html").read(); h = h.replace(".mp dt.flush {float:left;width:8ex}", ""); open("docs/bunyan.1.html", "w").write(h)'
	python -c 'import sys; h = open("docs/bunyan.1.html").read(); h = h.replace("</body>", """<a href="https://github.com/trentm/node-bunyan"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png" alt="Fork me on GitHub"></a></body>"""); open("docs/bunyan.1.html", "w").write(h)'
	@echo "# test with 'man ./docs/bunyan.1' and 'open ./docs/bunyan.1.html'"

# Re-generate the README.md table of contents.
toc:
	./node_modules/.bin/markdown-toc -i README.md


.PHONY: publish
publish:
	mkdir -p tmp
	[[ -d tmp/bunyan-gh-pages ]] || git clone git@github.com:trentm/node-bunyan.git tmp/bunyan-gh-pages
	cd tmp/bunyan-gh-pages && git checkout gh-pages && git pull --rebase origin gh-pages
	cp docs/index.html tmp/bunyan-gh-pages/index.html
	cp docs/bunyan.1.html tmp/bunyan-gh-pages/bunyan.1.html
	(cd tmp/bunyan-gh-pages \
		&& git commit -a -m "publish latest docs" \
		&& git push origin gh-pages || true)

.PHONY: distclean
distclean:
	rm -rf node_modules


#---- test

.PHONY: test
test: $(TAP_EXEC)
	test -z "$(DTRACE_UP_IN_HERE)" || test -n "$(SKIP_DTRACE)" || \
		(node -e 'require("dtrace-provider").createDTraceProvider("isthisthingon")' && \
		echo "\nNote: Use 'SKIP_DTRACE=1 make test' to skip parts of the test suite that require root." && \
		$(SUDO) $(TAP_EXEC) test/dtrace/*.test.js)
	$(TAP_EXEC) test/*.test.js


#---- check

.PHONY: check-jsstyle
check-jsstyle: $(JSSTYLE_FILES)
	./tools/jsstyle -o indent=4,doxygen,unparenthesized-return=0,blank-after-start-comment=0,leading-right-paren-ok=1 $(JSSTYLE_FILES)

.PHONY: check
check: check-jsstyle versioncheck
	@echo "Check ok."

.PHONY: prepush
prepush: check testall
	@echo "Okay to push."
