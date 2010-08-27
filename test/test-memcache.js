/*
tests for expresso
*/

var sys      = require('sys');
var memcache = require('memcache');

mc = new memcache.Client();
mc.on('error', function(e){

	if (e.errno == 111){
		exports['startup test'] = function(assert){

			assert.ok(false, "You need to have a memcache server running on localhost:11211 for these tests to run");
		}
		return;
	}

	exports['startup test'] = function(assert){
		assert.ok(false, "Unexpected error during connection: "+sys.inspect(e));
	}
});
mc.connect();


mc.addHandler(function() {

	// test nonexistent key is null
	exports['test null value'] = function(assert, beforeExit) {
		var n = 0;
		mc.get('no such key', function(r) {
			assert.equal(null, r);
			n++;
		});
		
		beforeExit(function() {
			assert.equal(1, n);
		});
	};
	
	// test set, get and expires
	exports['test set, get, and expires'] = function(assert, beforeExit) {
		var n = 0;
		// set key
		mc.set('set1', 'asdf1', function() {
			n++;
			mc.get('set1', function(r) {
				// assert key is found
				assert.equal('asdf1', r);
				n++;
				// assert key expires after 1s
				setTimeout(function() {
					mc.get('set1', function(r) {
						mc.close();
						assert.equal(null, r);
						n++;
					});
				}, 1000);
			});
		}, 1);
		
		beforeExit(function() {
			assert.equal(3, n);
		});
	};

	// test set and delete
	exports['test set del'] = function(assert, beforeExit) {
		var n = 0;
		// set key
		mc.set('set2', 'asdf2', function() {
			n++;
			mc.get('set2', function(r) {
				// assert key is found
				assert.equal('asdf2', r);
				n++;
				// delete key
				mc.del('set2', function() {
					mc.get('set2', function(r) {
						// assert key is null
						assert.equal(null, r);
						n++;
					});
				});
			});
		}, 0);
		
		beforeExit(function() {
			assert.equal(3, n);
		});
	};


	// test connecting and disconnecting
	exports['con disco'] = function(assert, beforeExit) {

		var n = 0;

		var mc2 = new memcache.Client();
		mc2.on('connect', function(){
			n++;
			mc2.close();
		});
		mc2.on('close', function(){
			n++;
		});

		mc2.connect();

		beforeExit(function() {
			assert.equal(2, n);
		});
	};

	// increment / decrement
	exports['inc dec'] = function(assert, beforeExit){

		var n = 0;

		mc.set('inc_bad', 'HELLO', function(response){
			assert.equal(response, 'STORED');
			n++;
			mc.increment('inc_bad', 2, function(ok, err){
				n++;
				assert.equal(ok, null);
				assert.match(err, /^CLIENT_ERROR/);
			});
			mc.decrement('inc_bad', 3, function(ok, err){
				n++;
				assert.equal(ok, null);
				assert.match(err, /^CLIENT_ERROR/);
			});
			mc.increment('inc_bad', null, function(ok, err){
				n++;
				assert.equal(ok, null);
				assert.match(err, /^CLIENT_ERROR/);
			});
			mc.decrement('inc_bad', null, function(ok, err){
				n++;
				assert.equal(ok, null);
				assert.match(err, /^CLIENT_ERROR/);
			});
		});

		mc.set('inc_good', '5', function(response){
			assert.equal(response, 'STORED');
			n++;
			mc.increment('inc_good', 2, function(response){
				n++;
				assert.equal(response, 7);
				mc.increment('inc_good', function(response){
					n++;
					assert.equal(response, 8);
					mc.decrement('inc_good', function(response){
						n++;
						assert.equal(response, 7);
						mc.decrement('inc_good', 4, function(response){
							n++;
							assert.equal(response, 3);
						});
					});
				});
			});
		});

		beforeExit(function(){
			assert.equal(10, n);
		});

	};

	exports['version'] = function(assert, beforeExit){

		mc.version(function(success, error){

			assert.equal(error, null);
			assert.length(success, 5);
		});

	}

});
