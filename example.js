var util      = require('util');
var memcache = require('./lib/memcache');

function microtime(get_as_float) {  
    var now = new Date().getTime() / 1000;  
    var s = parseInt(now);
    return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;  
}

var onConnect = function() {
	mcClient.get('test', function(err, data) {
		util.debug(data);
		mcClient.close();
	});
};

var benchmark = function() {
	var count = 20000;
	start = microtime(true);
	var x = 0;
	
	for (var i=0; i<=count; i++) {
		mcClient.get('test', function(err, data) {
			x += 1;
			if (x == count) {
				end = microtime(true);
				util.debug('total time: ' + (end - start));
			}
		});
	}
	
	mcClient.close();
};

var setKey = function() {
	mcClient.set('test', 'hello \r\n node-memcache', function(err, response) {
		mcClient.get('test', function(err, data) {
			util.debug(data);
			mcClient.close();
		});
	});
};

var version = function() {
	mcClient.version(function(err, version) {
		util.debug(version);
		mcClient.close();
	});
};

var incr = function() {
	mcClient.increment('x', 2, function(err, new_value) {
		util.debug(new_value);
		mcClient.close();
	});
};

var decr = function() {
	mcClient.decrement('x', 1, function(err, new_value) {
		util.debug(new_value);
		mcClient.close();
	});
};

mcClient = new memcache.Client();
mcClient.connect();
mcClient.addHandler(onConnect);

