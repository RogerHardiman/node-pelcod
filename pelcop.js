/**
 *  The MIT License (MIT)
 *
 *  Copyright (c) <2014> <Léo Haddad M. C. Carneiro> <scoup001@gmail.com> (http://github.com/Scoup/node-pelcod)
 * and <2016> Roger Hardiman
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 * ===============================================================================
 *
 * PelcoP Module to Node.JS
 * This module has a MIT License but the PelcoP protocol is a property of Pelco.
 * Any doubt about it contact Pelco. http://www.pelco.com/ 
 *
 * Commands generated by this code have been compared with bytes generated
 * from a real Pelco KBD300A keyboard in Direct P mode.
 *
 * The Pelco P protocol: 
 * This is almost identical to Pelco D with these differences
 * 1) In the Standard Commands the Focus and Iris bits are in different positions (the pan/tilt/zoom and extended commands are the same)
 * 2) The message is 1 byte longer and has a STX (0xA0) byte and ETX (0xAF) byte instead of a 0xFF sync byte
 * 3) The checksum is a simple XOR instead of a sum
 * 4) The camera address transmitted is the User's Camera Number minus 1
 *
 *
 *  **** P PROTOCOL ****
 *  +-----------+---------+-----------+-----------+--------+--------+-----------+-----------+
 *  |   BYTE 1  | BYTE 2  |  BYTE 3   |  BYTE 4   | BYTE 5 | BYTE 6 |   BYTE 7  |  BYTE 8   |
 *  +-----------+---------+-----------+-----------+--------+--------+-----------+-----------+
 *  |           |         |           |           |        |        |           |           |
 *  | STX(0xA0) | Address | Command 1 | Command 2 | Data 1 | Data 2 | ETX(0xAF) | Check Sum |
 *  +-----------+---------+-----------+-----------+--------+--------+-----------+-----------+
 *
 *  All values below are shown in hexadecimal (base 16).
 *  The Start Transmission (STX) byte is always $A0.
 *  The End Transmission (ETX) byte is always $AF.
 *  The address is the logical address of the receiver/driver being controlled minus 1 (so camera 1 selected on a Pelco Keyboard has address $00.
 *  The check sum is the 8 bit xor of the payload bytes (bytes 1 through 7) in the message.
 *
 *
 *  **** STANDARD COMMAND SET ****
 *  +---------+--------+-------------+---------------+-------------+----------+---------+---------+----------+
 *  |         |  BIT 7 |    BIT 6    |     BIT 5     |   BIT 4     |  BIT 3   |  BIT 2  |  BIT 1  |  BIT 0   |
 *  +---------+--------+-------------+---------------+-------------+----------+---------+---------+----------+
 *  |         |        |             |               |             |          |         |         |          |
 *  |Command 1|Unknown |Unknown      |Unknown        |Unknown      |Iris Close|Iris Open|Focus Near|Focus Far|
 *  |         |        |             |               |             |          |         |         |          |
 *  |Command 2|Unknown |Zoom Wide    |Zoom Tele      |Tilt Down    |Tilt Up   |Pan Left |Pan Right|Always 0  |
 *  +---------+--------+-------------+---------------+-------------+----------+---------+---------+----------+
 *
 *  Command 2 bit 0 is always Zero for a standard command
 *
 *
 *  **** EXTENDED COMMANDS ****
 *  In addition to the “PTZ” commands shown above, there are control commands that 
 *  allow you access to the more advanced features of some equipment.
 *  The response to these commands is unknown
 *
 *  +--------------------------------+--------+--------+---------------------+-------------+
 *  |                                | BYTE 3 | BYTE 4 |       BYTE 5        |   BYTE 6    |
 *  +--------------------------------+--------+--------+---------------------+-------------+
 *  |                                |        |        |                     |             |
 *  | Set Preset                     | 00     | 03     | 00                  | 01 to 20    |
 *  |                                |        |        |                     |             |
 *  | Clear Preset                   | 00     | 05     | 00                  | 01 to 20    |
 *  |                                |        |        |                     |             |
 *  | Go To Preset                   | 00     | 07     | 00                  | 01 to 20    |
 *  |                                |        |        |                     |             |
 *  | Set Auxiliary                  | 00     | 09     | 00                  | 01 to 08    |
 *  |                                |        |        |                     |             |
 *  | Clear Auxiliary                | 00     | 0B     | 00                  | 01 to 08    |
 *  |                                |        |        |                     |             |
 *  | Set Pattern Start              | 00     | 1F     | 00                  | 00          |
 *  |                                |        |        |                     |             |
 *  | Set Pattern Stop               | 00     | 21     | 00                  | 00          |
 *  |                                |        |        |                     |             |
 *  | Run Pattern                    | 00     | 23     | 00                  | 00          |
 *  |                                |        |        |                     |             |
 *  | Set Zoom Speed                 | 00     | 25     | 00                  | 00 to 03    |
 *  |                                |        |        |                     |             |
 *  +--------------------------------+--------+--------+---------------------+-------------+
 *
 */

var a = 1
    , STX = 0xA0
    , ETX = 0xAF
    , Bytes = require('./libs/bytesp')
    , extend = require('node.extend')

function PelcoP(stream, options) {
    this.stream = stream

    var defaultOptions = {
        addrs: [],
        defaultAddr: 0x00
    }
    this.options = extend(defaultOptions, options)

    var bts = [
        STX                        // STX byte 
        , this.options.defaultAddr  // address
        , 0x00                        // command 1
        , 0x00                        // command 2
        , 0x00                        // data 1
        , 0x00                        // data 2
        , ETX                         // ETX byte 
        , 0x00                        // checksum
    ]

    var extended_bts = [
        STX                        // STX byte 
        , this.options.defaultAddr  // address
        , 0x00                        // command 1
        , 0x00                        // command 2
        , 0x00                        // data 1
        , 0x00                        // data 2
        , ETX                         // ETX byte 
        , 0x00                        // checksum
    ]
    
    this.bytes = new Bytes(bts)
    this.extended_bytes = new Bytes(extended_bts)
}


/**** CONFIG COMMANDS ****/

PelcoP.prototype.setAddress = function(value) {
    this.bytes.setAddress(value - 1)
    this.extended_bytes.setAddress(value - 1)
}

PelcoP.prototype.setAddrDefault = function(value) {
    this.options.defaultAddr = this.options.addrs[value]
}

/**** STANDARD COMMAND SET ****/

PelcoP.prototype.setPanSpeed = function(speed) {
    if(speed < 0x00 || speed > 0xFF)
        speed = 0x00
    this.bytes.getData1().set(speed)
    return this
}

PelcoP.prototype.setTiltSpeed = function(speed) {
    if(speed < 0x00 || speed > 0x3F)
        speed = 0x00
    this.bytes.getData2().set(speed)
    return this
}

PelcoP.prototype.up = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x03)
        this.bytes.getCom2().off(0x04)
    } else {
        this.bytes.getCom2().off(0x03)
    }
    return this
}

PelcoP.prototype.down = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x04)
        this.bytes.getCom2().off(0x03)
    } else {
        this.bytes.getCom2().off(0x04)
    }
    return this
}

PelcoP.prototype.left = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x02)
        this.bytes.getCom2().off(0x01)
    } else {
        this.bytes.getCom2().off(0x02)
    }
    return this
}

PelcoP.prototype.right = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x01)
        this.bytes.getCom2().off(0x02)
    } else {
        this.bytes.getCom2().off(0x01)
    }
    return this
}

PelcoP.prototype.focusNear = function(status) {
    if(status === true) {
        this.bytes.getCom1().on(0x01)
        this.bytes.getCom1().off(0x00)
    } else {
        this.bytes.getCom1().off(0x01)
    }
    return this
}

PelcoP.prototype.focusFar = function(status) {
    if(status === true) {
        this.bytes.getCom1().on(0x00)
        this.bytes.getCom1().off(0x01)
    } else {
        this.bytes.getCom1().off(0x00)
    }
    return this
}

PelcoP.prototype.irisOpen = function(status) {
    if(status === true) {
        this.bytes.getCom1().on(0x02)
        this.bytes.getCom1().off(0x03)
    } else {
        this.bytes.getCom1().off(0x02)
    }
    return this
}

PelcoP.prototype.irisClose = function(status) {
    if(status === true) {
        this.bytes.getCom1().on(0x03)
        this.bytes.getCom1().off(0x02)
    } else {
        this.bytes.getCom1().off(0x03)
    }
    return this
}

PelcoP.prototype.zoomIn = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x05)
        this.bytes.getCom2().off(0x06)
    } else {
        this.bytes.getCom2().off(0x05)
    }
    return this
}

PelcoP.prototype.zoomOut = function(status) {
    if(status === true) {
        this.bytes.getCom2().on(0x06)
        this.bytes.getCom2().off(0x05)
    } else {
        this.bytes.getCom2().off(0x06)
    }
    return this
}



/***** EXTENDED COMMANDS *****/

PelcoP.prototype.sendSetPreset = function(position, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x03)
        .setData2(position)
       
    this.send_extended(callback)

    return this
}

PelcoP.prototype.sendClearPreset = function(position, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x05)
        .setData2(position)

    this.send_extended(callback)

    return this
}

PelcoP.prototype.sendGotoPreset = function(position, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x07)
        .setData2(position)

    this.send_extended(callback)

    return this
}

PelcoP.prototype.sendSetAux = function(aux, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x09)
        .setData2(aux)

    this.send_extended(callback)

    return this
}

PelcoP.prototype.sendClearAux = function(aux, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x0B)
        .setData2(aux)

    this.send_extended(callback)

    return this
}

PelcoP.prototype.sendSetZoomSpeed = function(speed, callback) {
    this.extended_bytes.clearAll(false)
        .setCom2(0x25)
        .setData2(speed)

    this.send_extended(callback)

    return this
}

/**** OTHER COMMANDS ****/



/**** HELPFUL COMMANDS ****/

/**
 * Stop moving
 */
PelcoP.prototype.stop = function() {
    this.setTiltSpeed(0)
        .setPanSpeed(0)
        .left(0)
        .right(0)
        .up(0)
        .down(0)
        .zoomIn(0)
        .zoomOut(0)
        .focusNear(0)
        .focusFar(0)
        .irisOpen(0)
        .irisClose(0)

    return this
}

/**
 * Build the byte and send it to stream
 */
PelcoP.prototype.send = function(callback) {
    var buffer = this.bytes.getBuffer()
    if(typeof(this.stream) === 'undefined' || typeof(this.stream.write) === 'undefined')
        console.warn('Stream pipe not found')
    else
        this.stream.write(buffer, callback)
    return this
}

PelcoP.prototype.send_extended = function(callback) {
    var buffer = this.extended_bytes.getBuffer()
    if(typeof(this.stream) === 'undefined' || typeof(this.stream.write) === 'undefined')
        console.warn('Stream pipe not found')
    else
        this.stream.write(buffer, callback)
    return this
}


module.exports = PelcoP;




