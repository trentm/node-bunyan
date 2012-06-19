#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Copyright (c) 2009-2012 Trent Mick

"""cutarelease -- Cut a release of your project.

A script that will help cut a release for a git-based project that follows
a few conventions. It'll update your changelog (CHANGES.md), add a git
tag, push those changes, update your version to the next patch level release
and create a new changelog section for that new version.

Conventions:
- XXX
"""

__version_info__ = (1, 0, 7)
__version__ = '.'.join(map(str, __version_info__))

import sys
import os
from os.path import join, dirname, normpath, abspath, exists, basename, splitext
from glob import glob
from pprint import pprint
import re
import codecs
import logging
import optparse
import json



#---- globals and config

log = logging.getLogger("cutarelease")

class Error(Exception):
    pass



#---- main functionality

def cutarelease(project_name, version_files, dry_run=False):
    """Cut a release.

    @param project_name {str}
    @param version_files {list} List of paths to files holding the version
        info for this project.

        If none are given it attempts to guess the version file:
        package.json or VERSION.txt or VERSION or $project_name.py
        or lib/$project_name.py or $project_name.js or lib/$project_name.js.

        The version file can be in one of the following forms:

        - A .py file, in which case the file is expect to have a top-level
          global called "__version_info__" as follows. [1]

            __version_info__ = (0, 7, 6)

          Note that I typically follow that with the following to get a
          string version attribute on my modules:

            __version__ = '.'.join(map(str, __version_info__))

        - A .js file, in which case the file is expected to have a top-level
          global called "VERSION" as follows:

            ver VERSION = "1.2.3";

        - A "package.json" file, typical of a node.js npm-using project.
          The package.json file must have a "version" field.

        - TODO: A simple version file whose only content is a "1.2.3"-style version
          string.

    [1]: This is a convention I tend to follow in my projects.
        Granted it might not be your cup of tea. I should add support for
        just `__version__ = "1.2.3"`. I'm open to other suggestions too.
    """
    dry_run_str = dry_run and " (dry-run)" or ""

    if not version_files:
        log.info("guessing version file")
        candidates = [
            "package.json",
            "VERSION.txt",
            "VERSION",
            "%s.py" % project_name,
            "lib/%s.py" % project_name,
            "%s.js" % project_name,
            "lib/%s.js" % project_name,
        ]
        for candidate in candidates:
            if exists(candidate):
                version_files = [candidate]
                break
        else:
            raise Error("could not find a version file: specify its path or "
                "add one of the following to your project: '%s'"
                % "', '".join(candidates))
        log.info("using '%s' as version file", version_files[0])

    parsed_version_files = [_parse_version_file(f) for f in version_files]
    version_file_type, version_info = parsed_version_files[0]
    version = _version_from_version_info(version_info)

    # Confirm
    if not dry_run:
        answer = query_yes_no("* * *\n"
            "Are you sure you want cut a %s release?\n"
            "This will involved commits and a push." % version,
            default="no")
        print "* * *"
        if answer != "yes":
            log.info("user abort")
            return
    log.info("cutting a %s release%s", version, dry_run_str)

    # Checks: Ensure there is a section in changes for this version.



    changes_path = "CHANGES.md"
    changes_txt, changes, nyr = parse_changelog(changes_path)
    #pprint(changes)
    top_ver = changes[0]["version"]
    if top_ver != version:
        raise Error("changelog '%s' top section says "
            "version %r, expected version %r: aborting"
            % (changes_path, top_ver, version))
    top_verline = changes[0]["verline"]
    if not top_verline.endswith(nyr):
        answer = query_yes_no("\n* * *\n"
            "The changelog '%s' top section doesn't have the expected\n"
            "'%s' marker. Has this been released already?"
            % (changes_path, nyr), default="yes")
        print "* * *"
        if answer != "no":
            log.info("abort")
            return
    top_body = changes[0]["body"]
    if top_body.strip() == "(nothing yet)":
        raise Error("top section body is `(nothing yet)': it looks like "
            "nothing has been added to this release")

    # Commits to prepare release.
    changes_txt_before = changes_txt
    changes_txt = changes_txt.replace(" (not yet released)", "", 1)
    if not dry_run and changes_txt != changes_txt_before:
        log.info("prepare `%s' for release", changes_path)
        f = codecs.open(changes_path, 'w', 'utf-8')
        f.write(changes_txt)
        f.close()
        run('git commit %s -m "prepare for %s release"'
            % (changes_path, version))

    # Tag version and push.
    curr_tags = set(t for t in _capture_stdout(["git", "tag", "-l"]).split('\n') if t)
    if not dry_run and version not in curr_tags:
        log.info("tag the release")
        run('git tag -a "%s" -m "version %s"' % (version, version))
        run('git push --tags')

    # Optionally release.
    if exists("package.json"):
        answer = query_yes_no("\n* * *\nPublish to npm?", default="yes")
        print "* * *"
        if answer == "yes":
            if dry_run:
                log.info("skipping npm publish (dry-run)")
            else:
                run('npm publish')
    elif exists("setup.py"):
        answer = query_yes_no("\n* * *\nPublish to pypi?", default="yes")
        print "* * *"
        if answer == "yes":
            if dry_run:
                log.info("skipping pypi publish (dry-run)")
            else:
                run("%spython setup.py sdist --formats zip upload"
                    % _setup_command_prefix())

    # Commits to prepare for future dev and push.
    # - update changelog file
    next_version_info = _get_next_version_info(version_info)
    next_version = _version_from_version_info(next_version_info)
    log.info("prepare for future dev (version %s)", next_version)
    marker = "## " + changes[0]["verline"]
    if marker.endswith(nyr):
        marker = marker[0:-len(nyr)]
    if marker not in changes_txt:
        raise Error("couldn't find `%s' marker in `%s' "
            "content: can't prep for subsequent dev" % (marker, changes_path))
    next_verline = "%s %s%s" % (marker.rsplit(None, 1)[0], next_version, nyr)
    changes_txt = changes_txt.replace(marker + '\n',
        "%s\n\n(nothing yet)\n\n\n%s\n" % (next_verline, marker))
    if not dry_run:
        f = codecs.open(changes_path, 'w', 'utf-8')
        f.write(changes_txt)
        f.close()

    # - update version file
    next_version_tuple = _tuple_from_version(next_version)
    for i, ver_file in enumerate(version_files):
        ver_content = codecs.open(ver_file, 'r', 'utf-8').read()
        ver_file_type, ver_info = parsed_version_files[i]
        if ver_file_type == "json":
            marker = '"version": "%s"' % version
            if marker not in ver_content:
                raise Error("couldn't find `%s' version marker in `%s' "
                    "content: can't prep for subsequent dev" % (marker, ver_file))
            ver_content = ver_content.replace(marker,
                '"version": "%s"' % next_version)
        elif ver_file_type == "javascript":
            candidates = [
                ("single", "var VERSION = '%s';" % version),
                ("double", 'var VERSION = "%s";' % version),
            ]
            for quote_type, marker in candidates:
                if marker in ver_content:
                    break
            else:
                raise Error("couldn't find any candidate version marker in "
                    "`%s' content: can't prep for subsequent dev: %r"
                    % (ver_file, candidates))
            if quote_type == "single":
                ver_content = ver_content.replace(marker,
                    "var VERSION = '%s';" % next_version)
            else:
                ver_content = ver_content.replace(marker,
                    'var VERSION = "%s";' % next_version)
        elif ver_file_type == "python":
            marker = "__version_info__ = %r" % (version_info,)
            if marker not in ver_content:
                raise Error("couldn't find `%s' version marker in `%s' "
                    "content: can't prep for subsequent dev" % (marker, ver_file))
            ver_content = ver_content.replace(marker,
                "__version_info__ = %r" % (next_version_tuple,))
        elif ver_file_type == "version":
            ver_content = next_version
        else:
            raise Error("unknown ver_file_type: %r" % ver_file_type)
        if not dry_run:
            log.info("update version to '%s' in '%s'", next_version, ver_file)
            f = codecs.open(ver_file, 'w', 'utf-8')
            f.write(ver_content)
            f.close()

    if not dry_run:
        run('git commit %s %s -m "prep for future dev"' % (
            changes_path, ' '.join(version_files)))
        run('git push')



#---- internal support routines

def _indent(s, indent='    '):
    return indent + indent.join(s.splitlines(True))

def _tuple_from_version(version):
    def _intify(s):
        try:
            return int(s)
        except ValueError:
            return s
    return tuple(_intify(b) for b in version.split('.'))

def _get_next_version_info(version_info):
    next = list(version_info[:])
    next[-1] += 1
    return tuple(next)

def _version_from_version_info(version_info):
    v = str(version_info[0])
    state_dot_join = True
    for i in version_info[1:]:
        if state_dot_join:
            try:
                int(i)
            except ValueError:
                state_dot_join = False
            else:
                pass
        if state_dot_join:
            v += "." + str(i)
        else:
            v += str(i)
    return v

_version_re = re.compile(r"^(\d+)\.(\d+)(?:\.(\d+)([abc](\d+)?)?)?$")
def _version_info_from_version(version):
    m = _version_re.match(version)
    if not m:
        raise Error("could not convert '%s' version to version info" % version)
    version_info = []
    for g in m.groups():
        if g is None:
            break
        try:
            version_info.append(int(g))
        except ValueError:
            version_info.append(g)
    return tuple(version_info)

def _parse_version_file(version_file):
    """Get version info from the given file. It can be any of:

    Supported version file types (i.e. types of files from which we know
    how to parse the version string/number -- often by some convention):
    - json: use the "version" key
    - javascript: look for a `var VERSION = "1.2.3";` or
      `var VERSION = '1.2.3';`
    - python: Python script/module with `__version_info__ = (1, 2, 3)`
    - version: a VERSION.txt or VERSION file where the whole contents are
      the version string

    @param version_file {str} Can be a path or "type:path", where "type"
        is one of the supported types.
    """
    # Get version file *type*.
    version_file_type = None
    match = re.compile("^([a-z]+):(.*)$").search(version_file)
    if match:
        version_file = match.group(2)
        version_file_type = match.group(1)
        aliases = {
            "js": "javascript"
        }
        if version_file_type in aliases:
            version_file_type = aliases[version_file_type]

    f = codecs.open(version_file, 'r', 'utf-8')
    content = f.read()
    f.close()

    if not version_file_type:
        # Guess the type.
        base = basename(version_file)
        ext = splitext(base)[1]
        if ext == ".json":
            version_file_type = "json"
        elif ext == ".py":
            version_file_type = "python"
        elif ext == ".js":
            version_file_type = "javascript"
        elif content.startswith("#!"):
            shebang = content.splitlines(False)[0]
            shebang_bits = re.split(r'[/ \t]', shebang)
            for name, typ in {"python": "python", "node": "javascript"}.items():
                if name in shebang_bits:
                    version_file_type = typ
                    break
        elif base in ("VERSION", "VERSION.txt"):
            version_file_type = "version"
    if not version_file_type:
        raise RuntimeError("can't extract version from '%s': no idea "
            "what type of file it it" % version_file)

    if version_file_type == "json":
        obj = json.loads(content)
        version_info = _version_info_from_version(obj["version"])
    elif version_file_type == "python":
        m = re.search(r'^__version_info__ = (.*?)$', content, re.M)
        version_info = eval(m.group(1))
    elif version_file_type == "javascript":
        m = re.search(r'^var VERSION = (\'|")(.*?)\1;$', content, re.M)
        version_info = _version_info_from_version(m.group(2))
    elif version_file_type == "version":
        version_info = _version_info_from_version(content.strip())
    else:
        raise RuntimeError("unexpected version_file_type: %r"
            % version_file_type)
    return version_file_type, version_info


def parse_changelog(changes_path):
    """Parse the given changelog path and return `(content, parsed, nyr)`
    where `nyr` is the ' (not yet released)' marker and `parsed` looks like:

        [{'body': u'\n(nothing yet)\n\n',
          'verline': u'restify 1.0.1 (not yet released)',
          'version': u'1.0.1'},    # version is parsed out for top section only
         {'body': u'...',
          'verline': u'1.0.0'},
         {'body': u'...',
          'verline': u'1.0.0-rc2'},
         {'body': u'...',
          'verline': u'1.0.0-rc1'}]

    A changelog (CHANGES.md) is expected to look like this:

        # $project Changelog

        ## $next_version (not yet released)

        ...

        ## $version1

        ...

        ## $version2

        ... and so on

    The version lines are enforced as follows:

    - The top entry should have a " (not yet released)" suffix. "Should"
      because recovery from half-cutarelease failures is supported.
    - A version string must be extractable from there, but it tries to
      be loose (though strict "X.Y.Z" versioning is preferred). Allowed

            ## 1.0.0
            ## my project 1.0.1
            ## foo 1.2.3-rc2

      Basically, (a) the " (not yet released)" is stripped, (b) the
      last token is the version, and (c) that version must start with
      a digit (sanity check).
    """
    if not exists(changes_path):
        raise Error("changelog file '%s' not found" % changes_path)
    content = codecs.open(changes_path, 'r', 'utf-8').read()

    parser = re.compile(
        r'^##\s*(?P<verline>[^\n]*?)\s*$(?P<body>.*?)(?=^##|\Z)',
        re.M | re.S)
    sections = parser.findall(content)

    # Sanity checks on changelog format.
    if not sections:
        template = "## 1.0.0 (not yet released)\n\n(nothing yet)\n"
        raise Error("changelog '%s' must have at least one section, "
            "suggestion:\n\n%s" % (changes_path, _indent(template)))
    first_section_verline = sections[0][0]
    nyr = ' (not yet released)'
    #if not first_section_verline.endswith(nyr):
    #    eg = "## %s%s" % (first_section_verline, nyr)
    #    raise Error("changelog '%s' top section must end with %r, "
    #        "naive e.g.: '%s'" % (changes_path, nyr, eg))

    items = []
    for i, section in enumerate(sections):
        item = {
            "verline": section[0],
            "body": section[1]
        }
        if i == 0:
            # We only bother to pull out 'version' for the top section.
            verline = section[0]
            if verline.endswith(nyr):
                verline = verline[0:-len(nyr)]
            version = verline.split()[-1]
            try:
                int(version[0])
            except ValueError:
                msg = ''
                if version.endswith(')'):
                    msg = " (cutarelease is picky about the trailing %r " \
                        "on the top version line. Perhaps you misspelled " \
                        "that?)" % nyr
                raise Error("changelog '%s' top section version '%s' is "
                    "invalid: first char isn't a number%s"
                    % (changes_path, version, msg))
            item["version"] = version
        items.append(item)

    return content, items, nyr

## {{{ http://code.activestate.com/recipes/577058/ (r2)
def query_yes_no(question, default="yes"):
    """Ask a yes/no question via raw_input() and return their answer.

    "question" is a string that is presented to the user.
    "default" is the presumed answer if the user just hits <Enter>.
        It must be "yes" (the default), "no" or None (meaning
        an answer is required of the user).

    The "answer" return value is one of "yes" or "no".
    """
    valid = {"yes":"yes",   "y":"yes",  "ye":"yes",
             "no":"no",     "n":"no"}
    if default == None:
        prompt = " [y/n] "
    elif default == "yes":
        prompt = " [Y/n] "
    elif default == "no":
        prompt = " [y/N] "
    else:
        raise ValueError("invalid default answer: '%s'" % default)

    while 1:
        sys.stdout.write(question + prompt)
        choice = raw_input().lower()
        if default is not None and choice == '':
            return default
        elif choice in valid.keys():
            return valid[choice]
        else:
            sys.stdout.write("Please respond with 'yes' or 'no' "\
                             "(or 'y' or 'n').\n")
## end of http://code.activestate.com/recipes/577058/ }}}

def _capture_stdout(argv):
    import subprocess
    p = subprocess.Popen(argv, stdout=subprocess.PIPE)
    return p.communicate()[0]

class _NoReflowFormatter(optparse.IndentedHelpFormatter):
    """An optparse formatter that does NOT reflow the description."""
    def format_description(self, description):
        return description or ""

def run(cmd):
    """Run the given command.

    Raises OSError is the command returns a non-zero exit status.
    """
    log.debug("running '%s'", cmd)
    fixed_cmd = cmd
    if sys.platform == "win32" and cmd.count('"') > 2:
        fixed_cmd = '"' + cmd + '"'
    retval = os.system(fixed_cmd)
    if hasattr(os, "WEXITSTATUS"):
        status = os.WEXITSTATUS(retval)
    else:
        status = retval
    if status:
        raise OSError(status, "error running '%s'" % cmd)

def _setup_command_prefix():
    prefix = ""
    if sys.platform == "darwin":
        # http://forums.macosxhints.com/archive/index.php/t-43243.html
        # This is an Apple customization to `tar` to avoid creating
        # '._foo' files for extended-attributes for archived files.
        prefix = "COPY_EXTENDED_ATTRIBUTES_DISABLE=1 "
    return prefix


#---- mainline

def main(argv):
    logging.basicConfig(format="%(name)s: %(levelname)s: %(message)s")
    log.setLevel(logging.INFO)

    # Parse options.
    parser = optparse.OptionParser(prog="cutarelease", usage='',
        version="%prog " + __version__, description=__doc__,
        formatter=_NoReflowFormatter())
    parser.add_option("-v", "--verbose", dest="log_level",
        action="store_const", const=logging.DEBUG,
        help="more verbose output")
    parser.add_option("-q", "--quiet", dest="log_level",
        action="store_const", const=logging.WARNING,
        help="quieter output (just warnings and errors)")
    parser.set_default("log_level", logging.INFO)
    parser.add_option("--test", action="store_true",
        help="run self-test and exit (use 'eol.py -v --test' for verbose test output)")
    parser.add_option("-p", "--project-name", metavar="NAME",
        help='the name of this project (default is the base dir name)',
        default=basename(os.getcwd()))
    parser.add_option("-f", "--version-file", metavar="[TYPE:]PATH",
        action='append', dest="version_files",
        help='The path to the project file holding the version info. Can be '
             'specified multiple times if more than one file should be updated '
             'with new version info. If excluded, it will be guessed.')
    parser.add_option("-n", "--dry-run", action="store_true",
        help='Do a dry-run', default=False)
    opts, args = parser.parse_args()
    log.setLevel(opts.log_level)

    cutarelease(opts.project_name, opts.version_files, dry_run=opts.dry_run)


## {{{ http://code.activestate.com/recipes/577258/ (r5+)
if __name__ == "__main__":
    try:
        retval = main(sys.argv)
    except KeyboardInterrupt:
        sys.exit(1)
    except SystemExit:
        raise
    except:
        import traceback, logging
        if not log.handlers and not logging.root.handlers:
            logging.basicConfig()
        skip_it = False
        exc_info = sys.exc_info()
        if hasattr(exc_info[0], "__name__"):
            exc_class, exc, tb = exc_info
            if isinstance(exc, IOError) and exc.args[0] == 32:
                # Skip 'IOError: [Errno 32] Broken pipe': often a cancelling of `less`.
                skip_it = True
            if not skip_it:
                tb_path, tb_lineno, tb_func = traceback.extract_tb(tb)[-1][:3]
                log.error("%s (%s:%s in %s)", exc_info[1], tb_path,
                    tb_lineno, tb_func)
        else:  # string exception
            log.error(exc_info[0])
        if not skip_it:
            if log.isEnabledFor(logging.DEBUG):
                traceback.print_exception(*exc_info)
            sys.exit(1)
    else:
        sys.exit(retval)
## end of http://code.activestate.com/recipes/577258/ }}}
