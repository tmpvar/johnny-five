var Board = require("../lib/board.js"),
    events = require("events"),
    util = require('util'),
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

  // Set up I2C data connection
  this.firmata.sendI2CConfig();

  this.setMaxListeners( 100 );

  device.setup( this );

  // Read Request Loop
  this.interval = setInterval(function() {
    device.read( this, opts );
  }.bind(this), opts.freq);
}

util.inherits( Barometer, events.EventEmitter );


DeviceMap = {
  /**
   * MPL115A2: Barometric sensor
   * 0x60
   *
   * datasheet: http://www.freescale.com/files/sensors/doc/data_sheet/MPL115A2.pdf
   * eval board: http://www.digikey.com/product-detail/en/KITMPL115A2I2C/KITMPL115A2I2C-ND/2185321
   *
   * Personally I'd recommend not buying the eval board as it is _way_ _way_ _way_ overpriced.
   * e.g. $27 versus a $2.20 sensor + 2x 1uf caps @ $0.10
   */
  "MPL115A2": {
    address: 0x60,
    bytes: 4,
    setupBytes: 12,
    delay: 100,

    setup : function( barometer ) {

      barometer.firmata.sendI2CWriteRequest( this.address, [ 0x04 ] );
      barometer.firmata.sendI2CReadRequest( this.address, this.setupBytes, function(data) {
        console.log(data);
      });
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
      }.bind(this), 100);

    },

    // read request data handler
    data: function( barometer, data ) {

      var temp = (data[2] << 8) + (data[3] & 0x00FF) >> 6,
          obj = {},
          pressure = 0;

      obj.temperature = Math.round((25 + ((temp - 498.0) / -5.35)) * 100)/100;

      return obj;
    }
  }
};

module.exports = Barometer;
