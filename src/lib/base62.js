"use strict";

const chars = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98,
  99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  115, 116, 117, 118, 119, 120, 121, 122,
  // - _
  45, 95,
];
//
export var Base62Str = /** @class */ (function () {
  function Base62Str(alphabet) {
    this.alphabet = alphabet;
    // this.lookup = this.createLookupTable();
  }
  Base62Str.getBytes = function (str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      // tslint:disable-next-line:no-bitwise
      bytes.push(char & 0xff);
    }
    return bytes;
  };
  Base62Str.getString = function (arr) {
    return String.fromCharCode.apply(this, arr);
  };
  /**
   * Creates a {@link Base62} instance. Defaults to the GMP-style character set.
   *
   * @return a {@link Base62} instance.
   */
  Base62Str.createInstance = function () {
    return this.createInstanceWithGmpCharacterSet();
  };
  /**
   * Creates a {@link Base62} instance using the GMP-style character set.
   *
   * @return a {@link Base62} instance.
   */
  Base62Str.createInstanceWithGmpCharacterSet = function () {
    return new Base62Str(chars);
  };
  /**
   * Uses the elements of a byte array as indices to a dictionary and returns the corresponding values
   * in form of a byte array.
   */
  Base62Str.translate = function (indices, dictionary) {
    var translation = [];
    for (var _i = 0, indices_1 = indices; _i < indices_1.length; _i++) {
      var indicesi = indices_1[_i];
      translation.push(dictionary[indicesi]);
    }
    return translation;
  };
  /**
   * Converts a byte array from a source base to a target base using the alphabet.
   */
  Base62Str.convert = function (message, sourceBase, targetBase) {
    /**
     * This algorithm is inspired by: http://codegolf.stackexchange.com/a/21672
     */
    var out = [];
    var source = message;
    while (source.length > 0) {
      var quotient = [];
      var remainder = 0;
      for (var _i = 0, source_1 = source; _i < source_1.length; _i++) {
        var sourcei = source_1[_i];
        // tslint:disable-next-line:no-bitwise
        var accumulator = (sourcei & 0xff) + remainder * sourceBase;
        remainder = accumulator % targetBase;
        var digit = (accumulator - remainder) / targetBase;
        if (quotient.length > 0 || digit > 0) {
          quotient.push(digit);
        }
      }
      out.push(remainder);
      source = quotient;
    }
    // pad output with zeroes corresponding to the number of leading zeroes in the message
    for (var i = 0; i < message.length - 1 && message[i] === 0; i++) {
      out.push(0);
    }
    return out.reverse();
  };
  /**
   * Encodes a sequence of bytes in Base62 encoding.
   *
   * @param message a byte sequence.
   * @return a sequence of Base62-encoded bytes.
   */
  Base62Str.prototype.encode = function (message) {
    var indices = Base62Str.convert(
      message,
      Base62Str.STANDARD_BASE,
      Base62Str.TARGET_BASE,
    );
    return Base62Str.translate(indices, this.alphabet);
  };
  /**
   * Decodes a sequence of Base62-encoded bytes.
   *
   * @param encoded a sequence of Base62-encoded bytes.
   * @return a byte sequence.
   */
  Base62Str.prototype.decode = function (encoded) {
    var prepared = Base62Str.translate(encoded, this.lookup);
    return Base62Str.convert(
      prepared,
      Base62Str.TARGET_BASE,
      Base62Str.STANDARD_BASE,
    );
  };
  Base62Str.prototype.encodeStr = function (input) {
    return Base62Str.getString(this.encode(Base62Str.getBytes(input)));
  };
  Base62Str.prototype.decodeStr = function (input) {
    return Base62Str.getString(this.decode(Base62Str.getBytes(input)));
  };
  /**
   * Creates a {@link Base62} instance using the inverted character set.
   *
   * @return a {@link Base62} instance.
   */
  Base62Str.STANDARD_BASE = 256;
  Base62Str.TARGET_BASE = 62;
  return Base62Str;
})();
