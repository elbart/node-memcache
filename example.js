var sys      = require('sys');
var memcache = require('./memcache');

var onConnect = function() {
    mcClient.query('set test 0 60 5\r\ntimee');
    setTimeout(function () {
        mcClient.query('get test');
        mcClient.close();
    }, 1000);
};

mcClient = new memcache.Client();
mcClient.connect(onConnect);

