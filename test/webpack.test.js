'use strict';
/*
 * Test that bunyan works with webpack.
 */

// node-tap API
if (require.cache[__dirname + '/tap4nodeunit.js'])
    delete require.cache[__dirname + '/tap4nodeunit.js'];
var tap4nodeunit = require('./tap4nodeunit.js');
var test = tap4nodeunit.test;
var path = require('path');
var webpack = require('webpack');

test('webpack', function(t) {

    var compiler = webpack({
        entry: path.resolve(__dirname, '../lib/bunyan'),
        plugins: [
            new webpack.DefinePlugin({
                'process': '{}'
            })
        ]
    });
    compiler.run(function(err, stats) {
        t.equal(err, null);
        t.equal(stats.hasErrors(), false, 'stats.hasErrors() should return false');
        t.end();
    });
});
