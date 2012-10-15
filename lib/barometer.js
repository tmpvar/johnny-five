var Board = require("../lib/board.js"),
    events = require("events"),
    util = require('util'),
    convert = require('../util/convert'),
    DeviceMap;


/**
 * Barometer
 * @constructor
 *
 * five.Barometer();
 *
 * five.Barometer({
 *  device: "MPL115A2",
 *  freq: 1000,
 *  temperature: true,
 *  pressure: true
 * });
 *
 *
 * @param {Object} opts [description]
 *
 */

function Barometer( opts ) {

  if ( !(this instanceof Barometer) ) {
    return new Barometer( opts );
  }

  var address, bytes, data, descriptor, device, delay,
      last, properties, read, setup;

  opts = Board.options( opts );

  // Hardware instance properties
  this.board = Board.mount( opts );
  this.firmata = this.board.firmata;

  device = DeviceMap[ opts.device ];

  // Read event throttling
  this.freq = opts.freq || 500;

  this.setMaxListeners( 100 );

  // Give the sensor some time to init
  setTimeout(function() {
    device.setup( this );

    // Read Request Loop
    this.interval = setInterval(function() {
      device.read( this, opts );
    }.bind(this), opts.freq);

  }.bind(this), 100);
}

util.inherits( Barometer, events.EventEmitter );

DeviceMap = {

  /**
   * MPL115A2: I2C Barometric sensor
   *
   *   i2c address: 0x60
   *
   *   datasheet: http://www.freescale.com/files/sensors/doc/data_sheet/MPL115A2.pdf
   *   eval board: http://www.adafruit.com/products/992
   *
   * Physical Connection:
   *   board -> arduino (uno)
   *
   *   SCL   -> A5
   *   SDA   -> A4
   *   VDD   -> +5
   *   GND   -> GND
   *   RST   -> GND
   *   SDWN  -> +5
   *
   */
  "MPL115A2": {
    address: 0x60,
    bytes: 16,
    delay: 100,

    setup : function( barometer ) {
      // Set up I2C data connection
      barometer.firmata.sendI2CConfig();
    },

    read : function( barometer, opts ) {

      // Start A/D conversion
      barometer.firmata.sendI2CWriteRequest( this.address, [ 0x12, 0x1 ]);

      // Wait 10 ms
      setTimeout(function() {

        // Tell the sensor we are ready to read
        barometer.firmata.sendI2CWriteRequest( this.address, [ 0x00 ]);

        // Collect the results
        barometer.firmata.sendI2CReadRequest( this.address, this.bytes, function(data) {
          var obj = this.data( barometer, data );
          opts.temperature && barometer.emit('temperature', obj.temperature);
          opts.pressure && barometer.emit('pressure', obj.pressure);

        }.bind(this));
      }.bind(this), 10);

    },

    // read request data handler
    // derived from https://github.com/misenso/MPL115A2-Arduino-Library
    // and http://mbed.org/users/yamaguch/code/MPL115A2/file/d77bd4340924/MPL115A2.cpp
    data: function( barometer, data ) {

      var obj = {},
          pressure;
          padc = data[0] << 2 | data[1] >> 6,
          tadc = data[2] << 2 | data[3] >> 6,
          pressureOffset = convert.toFloat( data[4], data[5], 16, 3, 0 ),             // a0
          pressureSensitivity = convert.toFloat( data[6], data[7], 16, 13, 0 ),       // b1
          temperatureOffset = convert.toFloat( data[8], data[9], 16, 14, 0 ),         // b2
          temperatureSensitivity = convert.toFloat( data[10], data[11], 14, 13, 9 );  // c12


      obj.temperature = Math.round((25 + ((tadc - 498.0) / -5.35)) * 100)/100;

      // See: section 3.2 of the datasheet
      // Note: the last 4 bytes are discarded as per note in section 3
      //
      //    * These registers are set to 0x00. These are reserved, and were
      //      previously utilized as Coefficient values, c11 and c22, which
      //      were always 0x00.
      //
      // they are not included in the `Pcomp` calculations so they have been
      // ignored `Pcomp = a0 + ( b1 + c12 * Tadc) * Padc + b2 * Tadc)`

      pressure = pressureOffset;
      pressure += ( pressureSensitivity + temperatureSensitivity * tadc) * padc;
      pressure += temperatureOffset * tadc;

      obj.pressure = Math.round((((65/1023) * (pressure)) + 50)*100)/100;

      return obj;
    }
  }
};

module.exports = Barometer;
