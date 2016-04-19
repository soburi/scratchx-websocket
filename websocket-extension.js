/*
  Copyright (c) 2016 TOKITA Hiroshi.  All right reserved.

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

new (function() {
    var ext_ = this;

    // Extension name
    var name = 'WebSocket extension';
    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['w', 'connect to %s', 'connect'],
            ['w', 'disconnect %s', 'disconnect'],
            [ '', 'send %s to %s', 'send'],
            ['r', 'message from %s', 'getMessage'],
            ['r', 'message origin', 'getLastReceivedMessageOrigin'],
            ['h', 'when data received', 'onMessageReceived'],

            ['r', 'JSON', 'emptyObject'],
            ['r', 'add string %s:%s to %s', 'addJsonProperty'],
            ['r', 'add number %s:%n to %s', 'addJsonProperty'],
            ['r', 'get property:%s from JSON:%s', 'getJsonProperty'],
        ]
    };

    var scriptpath = document.currentScript.src.match(/.*\//);
    $.getScript(scriptpath + 'ws-ext.js')
        .done( function(ws_ext, textStatus) {
            var eventTarget = document.createDocumentFragment();
            ws_ext_init(ext_, eventTarget);
            ScratchExtensions.register(name, descriptor, ext_);
        });

})();
