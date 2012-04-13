/*
	Xexun TK102 GPS server for Node.js
	
	Author:  Franklin van de Meent
	Website: http://frankl.in
	Contact: fr@nkl.in
	Twitter: @unknownt
	
	Github:  http://github.com/fvdm/nodejs-tk102
	Version: 1.0.0
*/

// settings
var serverIP = '0.0.0.0';
var serverPort = 1337;
var maxConnections = 100;
var idleTimeout = 10;

// INIT
var net = require('net');
var server = net.createServer( function( socket ) {
	if( idleTimeout > 0 ) {
		socket.setTimeout( idleTimeout * 1000, function() {
			socket.end();
		});
	}
}).listen( serverPort, serverIP );

server.maxConnections = maxConnections;

// connect
server.on( 'connection', function( socket ) {
	socket.setEncoding( 'utf8' );
	
	// data
	socket.on( 'data', function( raw ) {
		var gps = tk102( raw );
		console.log( gps );
	});
});

function tk102( raw ) {
	// 1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
	var str = raw.split(',');
	
	// parse
	var datetime = str[0].replace( /([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, year, month, day, hour, minute ) {
		return '20'+ year +'-'+ month +'-'+ day +' '+ hour +':'+ minute
	});
	var gpsdate = str[11].replace( /([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, day, month, year ) {
		return '20'+ year +'-'+ month +'-'+ day;
	});
	var gpstime = str[3].replace( /([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function( match, hour, minute, second, ms ) {
		var hour = str[4] == 'V' ? hour + 12 : hour;
		return hour +':'+ minute +':'+ second +'.'+ ms;
	});
	
	var data = {
		'raw':		raw,
		'datetime':	datetime,
		'phone':	str[1],
		'gps': {
			'date':		gpsdate,
			'time':		gpstime,
			'signal':	str[15]
		},
		'geo': {
			'latitude':	parseFloat( fixGeo( str[5], str[6] ) ),
			'longitude':	parseFloat( fixGeo( str[7], str[8] ) ),
			'heading':	parseInt( str[10] )
		},
		'kmh':		parseFloat( str[9] ),
		'imei':		str[16].replace( 'imei:', '' )
	};
	
	// done
	return data;
}

// clean geo positions
function fixGeo( one, two ) {
	var one = (two == 'S' || two == 'W' ? '-' : '') + one;
	one = one / 100 +'';
	one = one.replace( /^([0-9]+)\.([0-9]+)$/, function( match, num, dec ) {
		return num +'.'+ dec.substr(0,6);
	});
	return one;
}
