var sys      = require('sys');
var memcache = require('./memcache');

function microtime(get_as_float) {  
    var now = new Date().getTime() / 1000;  
    var s = parseInt(now);
    return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;  
}

var onConnect = function() {
	mcClient.get('test').addCallback(function(data) {
		sys.debug(data);
		mcClient.close();
	});
};

var benchmark = function() {
	var count = 20000;
	start = microtime(true);
	var x = 0;
	
	for (var i=0; i<=count; i++) {
		mcClient.get('test').addCallback(function(data) {
			x += 1;		
			if (x == count) {
				end = microtime(true);
				sys.debug('total time: ' + (end - start));
			}
		});
	}
	
	mcClient.close();
};

mcClient = new memcache.Client();
mcClient.connect(onConnect);

