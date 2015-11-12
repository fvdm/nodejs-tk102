TK102 GPS server
================

[![Build Status](https://travis-ci.org/fvdm/nodejs-tk102.svg?branch=master)](https://travis-ci.org/fvdm/nodejs-tk102)

Receive and parse GPS data from Xexun TK102 trackers.

The Xexun TK102 is a GPS device that can send coordinates over TCP to 
a server via GPRS. This Node.js script creates a TCP server that listens 
for GPRMC data, parse it and send the data to your post-process function. 
The parsed data is provided in a clean easy to use object, so you can 
easily store it in a database or push to a websocket server, etc.


- [Example](#example)
- [Prepare device](#prepare-device)
- [Installation](#installation)
- [Settings](#settings)
- [Events](#events)
- [Notes](#notes)


Example
-------

```js
var server = require ('tk102');

// start server
server.createServer ({
  port: 1337
});

// incoming data, i.e. update a map
server.on ('track', function (gps) {
  updateMap (gps.geo.latitude, gps.geo.longitude);
});
```


Prepare device
--------------

Assuming your simcard has enough SMS and data credits and the TK102 is 
configured for your provider's APN, simply send `adminip123456 IP PORT` 
where obviously `IP` is the server's IP, `PORT` is the port to listen on 
and `123456` is your admin password. :) It cannot take hostnames as it 
has no dns features on board.

Activate sending coordinates: **t030s003n123456**

This tells the device to send its location AFTER each **30** seconds and 
no more than **3** times. 30 seconds is the minimum. 
Send `t030s***n123456` to go on for infinity.

* **s** (seconds) can also be **m** (minutes) or **h** (hours)
* To end tracking send `notn123456`


Installation
------------

Stable: `npm install tk102`

Develop: `npm install fvdm/nodejs-tk102#develop`


Settings
--------

name        | type    | default | description
:-----------|:--------|:--------|:----------------------------------
ip          | string  | 0.0.0.0 | Listen on IP, `0.0.0.0` is all IPs
port        | integer | 0       | Listen on port, `0` is random (see [listening](#listening) event)
connections | integer | 10      | Maximum simultaneous connections
timeout     | integer | 10      | Idle time out in seconds

```js
server.createServer ({
  ip: '1.2.3.4',
  port: 0
});
```


Events
------

The server emits the following events about the server status and incoming GPS pushes.


### track
**( gpsObject )**

The data push from the device.

```js
server.on ('track', function (gps) {
  { raw: '1203301642,0031698765432,GPRMC,144219.000,A,5213.0327,N,00516.7759,E,0.63,179.59,300312,,,A*6D,F,imei:123456789012345,123',
    datetime: '2012-03-30 16:42',
    phone: '0031698765432',
    gps: { date: '2012-03-30', time: '14:42:19.000', signal: 'full', fix: 'active' },
    geo: { latitude: 52.130326, longitude: 5.167759, bearing: 179 },
    speed: { knots: 0.63, kmh: 1.167, mph: 0.725 },
    imei: '123456789012345' }
})
```

property    | description
:-----------|:--------------------------------------------------
raw         | the input string without trailing whitespace
datetime    | the device 24h clock
phone       | the admin phonenumber that initiated this tracking
gps         |
- date      | date as received from GPS
- time      | time in 24h UTC as received from GPS
- signal    | signal strength, either _full_ or _low_
- fix       | GPS fix, either _active_ or _invalid_
geo         |
- latitude  | position latitude
- longitude | position longitude
- bearing   | direction in degrees
speed       |
- knots     | speed in knots per hour
- kmh       | speed in kilometer per hour
- mph       | speed in miles per hour
imei        | device IMEI


### data
**( rawString )**

The raw unprocessed inbound data.

```js
server.on ('data', function (raw) {
  console.log ('Incoming data: '+ raw);
});
```


### listening
**( listeningObject )**

Very useful to find out random port (0).

```js
server.on ('listening', function (listen) {
  // listen = { port: 56751, family: 2, address: '0.0.0.0' }
});
```


### connection
**( socket )**

Emitted when a connection is established with the server, includes the socket basics.

```js
server.on ('connection', function (socket) {
  console.log ('Connection from '+ socket.remoteAddress);
});
```


### disconnect
**( socket )**

Emitted when a connection is ended, includes the socket basics.

```js
server.on ('disconnect', function (socket) {
  console.log ('Disconnected device '+ socket.remoteAddress);
});
```


### timeout
**( socket )**

Emitted when a connection expires, includes the socket basics.

```js
server.on ('timeout', function (socket) {
  console.log ('Time-out from '+ socket.remoteAddress);
});
```


### fail
**( Error )**

Emitted when data cannot be parsed.
Useful for debugging device issues.

`Error` is an `instanceof Error` with .stack trace.

```js
server.on ('fail', function (err) {
  console.log (err);
});
```


### error
**( Error )**

Emitted when a server related error occured.

`Error` is an `instanceof Error` with .stack trace.


#### Messages

error                    | description
:------------------------|:---------------------------------
Server error             | Catch server failures
Socket error             | Catch communication failures
IP or port not available | This catches EADDRNOTAVAIL errors


```js
server.on ('error', function (err) {
  console.log (err);
});
```


### log
**( name, data )**

Emitted on of the above events.
Useful for debugging and logging.

argument | type   | description
:--------|:-------|:------------------------
name     | string | Event name, i.e. `track`
value    | mixed  | Data from the event

```js
server.on ('log', function (name, value) {
  console.log ('Event: ' + name);
  console.log (value);
});
```


Notes
-----

There is no security built in, anyone could push data to your server.

The parsed object is based on a lot of testing in the field and
incomplete documentation, I hope I got it right. There are many
variations of the TK102 tracker available with each different data
formats. It may be possible your device or even mine is one of the
clones and incompatible with this module.

If you can, please provide multiple responses from the [data](#data)
event in a [Github issue](https://github.com/fvdm/nodejs-tk102/issues)
(public) or contact me [directly](https://frankl.in/contact), your data
is handled confidentially. Preferably leave the device tracking with an
interval of 30 seconds or less for about 3 to 5 minutes outdoors or near
a window. This way I can figure out the data format and various states
the tracker reports about itself to the server.


Unlicense
---------

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


Author
------

Franklin van de Meent
| [Website](https://frankl.in)
| [Github](https://github.com/fvdm)
