/*
Name:         tk102
Description:  TK102 GPS server for Node.js
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>
*/


// INIT
var net = require('net'),
    EventEmitter = require('events').EventEmitter

var tk102 = new EventEmitter()

// defaults
tk102.settings = {
	ip:		'0.0.0.0',	// default listen on all IPs
	port:		0,		// 0 = random, 'listening' event reports port
	connections:	10,		// 10 simultaneous connections
	timeout:	10		// 10 seconds idle timeout
}

// Create server
tk102.createServer = function( vars ) {
	
	// override settings
	if( typeof vars == 'object' && Object.keys(vars).length >= 1 ) {
		for( var key in vars ) {
			tk102.settings[ key ] = vars[ key ]
		}
	}
	
	// start server
	tk102.server = net.createServer( function( socket ) {
		
		// socket idle timeout
		if( tk102.settings.timeout > 0 ) {
			socket.setTimeout( tk102.settings.timeout * 1000, function() {
				tk102.emit( 'timeout', socket )
				socket.end()
			})
		}
		
	}).listen( tk102.settings.port, tk102.settings.ip, function() {
		
		// server ready
		tk102.emit( 'listening', tk102.server.address() )
		
	})
	
	// maximum number of slots
	tk102.server.maxConnections = tk102.settings.connections
	
	// inbound connection
	tk102.server.on( 'connection', function( socket ) {
		
		tk102.emit( 'connection', socket )
		socket.setEncoding( 'utf8' )
		
		// receiving data
		socket.on( 'data', function( chunk ) {
			tk102.emit( 'data', chunk )
			gps = tk102.parse( data )
			if( gps ) {
				tk102.emit( 'track', gps )
			} else {
				tk102.emit( 'fail', {
					reason:	'Cannot parse GPS data from device',
					socket:	socket,
					input:	data
				})
			}
		})
		
		// complete
		socket.on( 'close', function() {
			tk102.emit( 'disconnection', socket || null )
		})
		
	})
}

// Parse GPRMC string
tk102.parse = function( raw ) {
	
	var data = false
	
	if( raw.indexOf('GPRMC') > -1 ) {
	
		// TK102 old
		// 1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
		var raw = raw.trim()
		var str = raw.split(',')
		
		// only continue with correct input, else the server may quit...
		if( str.length == 18 && str[2] == 'GPRMC' ) {
			
			// parse
			var datetime = str[0].replace( /([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, year, month, day, hour, minute ) {
				return '20'+ year +'-'+ month +'-'+ day +' '+ hour +':'+ minute
			})
			
			var gpsdate = str[11].replace( /([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, day, month, year ) {
				return '20'+ year +'-'+ month +'-'+ day
			})
			
			var gpstime = str[3].replace( /([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function( match, hour, minute, second, ms ) {
				return hour +':'+ minute +':'+ second +'.'+ ms
			})
			
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
			}
		}
		
	} else if( raw.match( /^#\d{15}##/ ) ) {
	
		// TK102-2
		// #123456789012345##1#0000#AUT#01#2040081234aa5a#123.456789,E,1234.567891,N,0.00,356.60#260313#140227.000##
		var data = {
			raw:		raw,
			datetime:	'',
			phone:		null,
			gps:		{},
			geo:		{},
			lac:		{},
			speed:		{},
			imei:		''
		}
		
		str = raw.split('#')
		
		if( str.length == 4 ) {
			data.imei = str[1]
		} else if( str.length == 13 ) {
			data.zone = str[4]
			
			// gsm location
			str[7].replace( /^(\d{3})(\d{3})(\w{8})$/, function( s, mcc, mnc, cid ) {
				var lac = {
					mcc: mcc,
					mnc: mnc,
					cellid: cid
				}
				data.lac = lac
			})
			
			// geo data
			var gps = str[8].split(',')
			data.geo = {
				latitude:	tk102.fixGeo( gps[0], gps[1] ),
				longitude:	tk102.fixGeo( gps[2], gps[3] ),
				altitude:	null,
				bearing:	parseFloat( gps[5] )
			}
			
			// date & time
			str[9].replace( /^(\d{2})(\d{2})(\d{2})$/, function( s, d, m, y ) {
				data.datetime = '20'+ y +'-'+ m +'-'+ d
				data.gps.date = '20'+ y +'-'+ m +'-'+ d
			})
			
			str[10].replace( /^(\d{2})(\d{2})(\d{2})\.(\d{3})$/, function( s, h, i, s, ms ) {
				data.datetime += ' '+ h +':'+ i +':'+ s +'.'+ ms
				data.gps.time = h +':'+ i +':'+ s +'.'+ ms
			})
			
			// gps data
			data.gps = {
				signal:		null,
				fix:		str[9] === '000000' ? false : true
			}
			
			// speed
			data.speed = {
				knots:		Math.round( gps[4] * 1000 ) / 1000,
				kmh:		Math.round( gps[4] * 1.852 * 1000 ) / 1000,
				mph:		Math.round( gps[4] * 1.151 * 1000 ) / 1000
			}
		}
	}
	
	// done
	return data
}

// Clean geo positions, with 6 decimals
tk102.fixGeo = function( one, two ) {
	var minutes = one.substr(-7, 7)
	var degrees = parseInt( one.replace( minutes, '' ), 10 )
	var one = degrees + (minutes / 60)

	var one = parseFloat( (two == 'S' || two == 'W' ? '-' : '') + one )
	return Math.round( one * 1000000 ) / 1000000
}

// ready
module.exports = tk102
