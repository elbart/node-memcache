node.js memcached client
========================

A pure-JavaScript Memcache library for node.


Tests
-----

To run the test suite, first insall <a href="http://github.com/visionmedia/expresso">expresso</a>, then run <code>make test</code>


Usage
-----

Create a Client object to start working.
Host and port can be passed to the constructor or set afterwards.
They have sensible defaults.

	var memcache = require('./memcache');

	var client = new memcache.Client(port, host);
	client.port = 11211;
	client.host = 'loalhost';

The Client object emits 4 important events - connect, close, timeout and error.

	client.on('connect', function(){
		// no arguments - we've connected
	});

	client.on('close', function(){
		// no arguments - connection has been closed
	});

	client.on('timeout', function(){
		// no arguments - socket timed out
	});

	client.on('error' function(e){
		// there was an error - exception is 1st argument
	});

After connecting, you can start to make requests.

	client.get('key', function(response){
		
	});

	client.set('key', 'value', function(response){

		// response will be 'STORED' if it worked,
		// else an error (huh?)

		// lifetime argument is optional

	}, lifetime);

	client.del('key', function(response){

		// delete a key from cache.
		// response?
	});

	client.version(function(response)){

		// response contains server version?
	});

	client.increment('key', value, function(response){
	});
	client.decrement('key', value, function(response){
	});

Once you're done, close the connection.

	client.close();

	
