var Board = require("../lib/board.js"),
    events = require("events"),
    util = require('util'),
    DeviceMap;


/**
 * I2CSwitch
 * @constructor
 *
 * five.I2CSwitch();
 *
 * five.I2CSwitch({
 *  device: "PCA9548",
 *  freq: 1000,
 *  children : []
 * });
 *
 *
 * @param {Object} opts [description]
 *
 */
function I2CSwitch( opts ) {

  if ( !(this instanceof I2CSwitch) ) {
    return new I2CSwitch( opts );
  }

  var address, bytes, data, descriptor, device, delay,
      last, properties, read, setup;

  opts = Board.options( opts );

  // Hardware instance properties
  this.board = Board.mount( opts );
  this.firmata = this.board.firmata;

  this.device = DeviceMap[ opts.device ];
  this.children = [];
  // Read event throttling
  this.freq = opts.freq || 5000;

  this.setMaxListeners( 100 );

  this.device.setup( this );

  this.pending = false;

  this.channel = 0;

  // Read Request Loop
  this.interval = setInterval(this.tick.bind(this), opts.freq);
}

util.inherits( I2CSwitch, events.EventEmitter );

I2CSwitch.prototype.tick = function() {

  // Avoid spamming the switch
  if ( this.pending ) {
    return;
  }

  this.device.tick( this, this.channel );

  this.channel++;
  if ( this.channel >= this.children.length ) {
    this.channel = 0;
  }
};

I2CSwitch.prototype.add = function(device) {
  // We will manage the interval, as we don't want
  // the device sending out read commands when the switch
  // is set to a different channel
  if (device.interval) {
    clearInterval(device.interval);
  }

  this.children.push(device);
};

DeviceMap = {

  /**
   * PCA9548: I2C-bus switch
   *
   *   i2c address: 0x74
   *
   *   datasheet: http://www.nxp.com/documents/data_sheet/PCA9548A.pdf
   *   eval board: not sure any exist, contact tmpvar and he'll make you one
   *
   * Physical Connection:
   *   chip  -> arduino (uno)
   *
   *   SCL   -> A5
   *   SDA   -> A4
   *   VDD   -> +5
   *   VSS   -> GND
   *   RESET -> GND
   *   A0    -> GND
   *   A1    -> GND
   *   A2    -> GND
   *
   *   SD[0-7] and SC[0-7] should be attached to >= 1 child i2c devices
   *
   *   e.g.  SD0 -> Child1.SDA ; SC0 -> Child1.SCL
   */
  "PCA9548": {
    address: 0x74,
    channels : 8,

    setup : function( i2cSwitch ) {
      // Set up I2C data connection
      i2cSwitch.firmata.sendI2CConfig();
    },

    tick : function( i2cSwitch, channel ) {

      // Select Channel
      i2cSwitch.firmata.sendI2CWriteRequest( this.address, [ channel ]);

      // Let the child device do it's thing
      i2cSwitch.pending = true;
      i2cSwitch.children[ channel ].tick(function() {
        i2cSwitch.pending = false;
      });
    }
  }
};

module.exports = I2CSwitch;
