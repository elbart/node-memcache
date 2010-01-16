var sys      = require('sys');
var memcache = require('./memcache');

mcClient = new memcache.Client();
// mcClient.query('stats', function(data) {sys.puts(data)});

mcClient.query('set test 0 60 4\r\ntoni', function(data) {sys.puts('setter... ' + data)});
mcClient.query('get test', function(data) {sys.puts('getter... ' + data)});
mcClient.close();