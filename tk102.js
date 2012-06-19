/*
TK102 GPS server for Node.js

Author:  Franklin van de Meent
Website: http://frankl.in/
Twitter: @unknownt

Source:  http://fvdm.github.com/nodejs-tk102
Version: 1.0.2
Date:    2012-04-19

License: CC BY-SA 3.0
This work is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License.
To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/3.0/
*/

// INIT
var net = require('net');
var EventEmitter = require('events').EventEmitter;

var tk102 = new EventEmitter();

// defaults
tk102.settings = {
	ip:				'0.0.0.0',	// default listen on all IPs
	port:			0,			// 0 = random, 'listening' event reports port
	connections:	10,			// 10 simultaneous connections
	timeout:		10			// 10 seconds idle timeout
}

// Create server
tk102.createServer = function( vars ) {
	
	// override settings
	if( typeof vars == 'object' && Object.keys(vars).length >= 1 ) {
		for( var key in vars ) {
			tk102.settings[ key ] = vars[ key ]
		}
	}
	
	tk102.server = net.createServer( function( socket ) {
		if( settings.timeout > 0 ) {
			socket.setTimeout( settings.timeout * 1000, function() {
				tk102.emit( 'timeout', socket );
				socket.end();
			});
		}
	}).listen( settings.port, settings.ip, function() {
		tk102.emit( 'listening', tk102.server.address() );
	});
	
	tk102.server.maxConnections = settings.connections;
	
	tk102.server.on( 'connection', function( socket ) {
		tk102.emit( 'connection', socket );
		socket.setEncoding( 'utf8' );
		
		var data = ''
		
		// receiving data
		socket.on( 'data', function( chunk ) {
			tk102.emit( 'data', chunk )
			data += chunk
		})
		
			
			if( gps = tk102.parse( raw ) ) {
				tk102.emit( 'track', gps );
			}
		});
	});
}

// Parse GPRMC string
tk102.parse = function( raw ) {
	// 1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
	var raw = raw.replace( /(^[\s\t\r\n]+|[\s\t\r\n]+$)/, '' );
	var str = raw.split(',');
	var data = false;
	
	// only continue with correct input, else the server may quit...
	if( str.length == 18 && str[2] == 'GPRMC' ) {
		
		// parse
		var datetime = str[0].replace( /([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, year, month, day, hour, minute ) {
			return '20'+ year +'-'+ month +'-'+ day +' '+ hour +':'+ minute
		});
		var gpsdate = str[11].replace( /([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, day, month, year ) {
			return '20'+ year +'-'+ month +'-'+ day;
		});
		var gpstime = str[3].replace( /([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function( match, hour, minute, second, ms ) {
			return hour +':'+ minute +':'+ second +'.'+ ms;
		});
		
		data = {
			'raw':		raw,
			'datetime':	datetime,
			'phone':	str[1],
			'gps': {
				'date':		gpsdate,
				'time':		gpstime,
				'signal':	str[15] == 'F' ? 'full' : 'low',
				'fix':		str[4] == 'A' ? 'active' : 'invalid'
			},
			'geo': {
				'latitude':	tk102.fixGeo( str[5], str[6] ),
				'longitude':	tk102.fixGeo( str[7], str[8] ),
				'bearing':	parseInt( str[10] )
			},
			'speed': {
				'knots':	Math.round( str[9] * 1000 ) / 1000,
				'kmh':		Math.round( str[9] * 1.852 * 1000 ) / 1000,
				'mph':		Math.round( str[9] * 1.151 * 1000 ) / 1000
			},
			'imei':		str[16].replace( 'imei:', '' )
		};
	}
	
	// done
	return data;
}

// Clean geo positions
tk102.fixGeo = function( one, two ) {
	var minutes = one.substr(-7, 7);
	var degrees = parseInt( one.replace( minutes, '' ) );
	var one = degrees + (minutes / 60);

	var one = parseFloat( (two == 'S' || two == 'W' ? '-' : '') + one );
	return Math.round( one * 1000000 ) / 1000000;
}

// All ready
module.exports = tk102;