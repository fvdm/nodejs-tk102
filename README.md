## TK102 GPS server for Node.js

The Xexun TK102 is a GPS device that can send coordinates over TCP to a server via GPRS. This Node.js script creates a TCP server that listens for GPRMC data, parsing it and dump it to the console. The parsed data is provided in a clean easy to use object, so you can easily store it in a database or push to a websocket server, for example.

## Prepare device

Assuming your simcard has enough SMS and data credits and the TK102 is configured for your provider's APN, simply send **adminip123456 IP PORT** where obviously IP is the server's IP and PORT is the port to listen on :) It cannot take hostnames as it has no dns features on board.

Activate sending coordinates: **t030s003n123456**

This tells the device to send its location AFTER each **30** seconds and no more than **3** times. 30 seconds is the minimum. Send t030s\*\*\*n123456 to go on for infinity. **s** can also be **m** or **h**. To kill send notn123456.

## Installation

Either load the module with NPM:

**npm install tk102**

```javascript
var server = require('tk102');
```

or load directly:

```javascript
var server = require('/path/to/tk102.js');
```

## Usage

```javascript
var server = require('tk102');

// start server
server.createServer({
        port: 1337
});

// incoming data
server.on( 'track', function( gps ) {
        console.log( gps );
});
```

## Settings

```javascript
server.createServer({
        ip:          '1.2.3.4',  // default 0.0.0.0 (all ips)
        port:        0,          // default 0 = random, see 'listening' event
        connections: 10,         // simultaneous connections
        timeout:     10          // idle timeout in seconds
});
```

## Events

### track

The GPRMC push from the device.

```javascript
server.on( 'track', function( gps ) {
        { raw: '1203301642,0031698765432,GPRMC,144219.000,A,5213.0327,N,00516.7759,E,0.63,179.59,300312,,,A*6D,F,imei:123456789012345,123',
          datetime: '2012-03-30 16:42',
          phone: '0031698765432',
          gps: { date: '2012-03-30', time: '14:42:19.000', signal: 'full', fix: 'active' },
          geo: { latitude: 52.130326, longitude: 5.167759, bearing: 179 },
          speed: { knots: 0.63, kmh: 1.167, mph: 0.725 },
          imei: '123456789012345' };
});
```

* **raw:** the input string without trailing whitespace
* **datetime:** the device 24h clock
* **phone:** the admin phonenumber that initiated this tracking
* **gps:**
	* **date:** date as received from satellites
	* **time:** time in 24h UTC as received from satellites
	* **signal:** GPS signal strength, either _full_ or _low_
	* **fix:** GPS fix, either _active_ or _invalid_
* **geo:**
	* **latitude:** position latitude
	* **longitude:** position longitude
	* **bearing:** direction in degrees
* **speed:**
	* **knots:** speed in knots per hour
	* **kmh:** speed in kilometer per hour
	* **mph:** speed in miles per hour
* **imei:** device IMEI

### data

The raw unprocessed inbound data.

```javascript
server.on( 'data', function( raw ) {
        console.log( 'Incoming data: '+ raw );
});
```

### listening

Very useful to find out random port (0).

```javascript
server.on( 'listening', function( listen ) {
        { port: 56751, family: 2, address: '0.0.0.0' }
});
```

### connection

Emitted when a connection is established with the server, includes the socket.

```javascript
server.on( 'connection', function( socket ) {
        console.log( 'Connection from '+ socket.remoteAddress );
});
```

### timeout

Emitted when a connection expires.

```javascript
server.on( 'timeout', function( socket ) {
        console.log( 'Time-out from '+ socket.remoteAddress );
});
```

## Note

I'm not sure how this works with TK102-2 and other similar devices, I wrote this strictly for the TK102 as I only have one of those. There is no security built in, anyone could push GPRMC data to your server.

## License

This code is released under COPYLEFT meaning you can do with it
anything you like except copyrighting it. If possible it would
be nice to include the source URL for future reference:

https://github.com/fvdm/nodejs-tk102
