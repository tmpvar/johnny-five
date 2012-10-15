
// Convert 2 bytes (msb, lsb) to a 16 bit number
var to16Bit = module.exports.to16Bit = function ( msb, lsb ) {
  return(msb << 8) | (lsb & 0x00FF);
};

/**
 * Convert 2 bytes (msb, lsb) to floating point number
 *
 * @param {Integer} msb
 *    most significant bits
 *
 * @param {Integer} lsb
 *    least significant bits
 *
 * @param {Integer} integerBits
 *    number of bits used for the integer portion of a number
 *
 * @param {Integer} fractionalBits
 *    number of bits used for the fractional portion of a number
 *
 * @param {Integer} padBits
 *    number of bits used to pad the number to 16 bits
 *
 */
module.exports.toFloat = function (msb, lsb, integerBits, fractionalBits, padBits) {
  var numerator = to16Bit(msb, lsb) >> 16 - integerBits,
      denominator = (1 << (fractionalBits + padBits));
  return numerator/denominator;
}