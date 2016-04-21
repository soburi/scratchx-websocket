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
    let ext_ = this;

    // Extension name
    const name = 'Fake-PicoBoard extension';

    // Block and block menu descriptions
    const descriptor = {
        blocks: [
            ['w', 'connect to %s', 'connect'],
            ['w', 'disconnect', 'disconnect'],
            ['b', 'sensor %m.booleanSensor?', 'getSensorBoolValue'],
            ['r', '%m.sensor sensor value', 'getSensorValue'],
            ['h', 'when %m.booleanSensor', 'onButtonChanged'],
            ['h', 'when %m.sensor %m.lessMore %n', 'onSensorValueChanged'],
        ],
        menus: {
            lessMore: ['<', '>'],
            booleanSensor: ['button pressed', 'A connected', 'B connected', 'C connected', 'D connected'],
            sensor: ['slider', 'light', 'sound', 'resistance-A', 'resistance-B', 'resistance-C', 'resistance-D'],
        },
    };

    const proptable = {
        'button pressed': "button",
        'A connected': "connectorA",
        'B connected': "connectorB",
        'C connected': "connectorC",
        'D connected': "connectorD",
        'slider': "slider",
        'light': "light",
        'sound': "sound",
        'resistance-A': "resistance-A",
        'resistance-B': "resistance-B",
        'resistance-C': "resistance-C",
        'resistance-D': "resistance-D"
    };

    let fake_picoboard_ext_init = function(ext) {

        let state_cache = {};

        ext.api.setInternalEventCheckHook( function(event) {
            return true;
        });

        ext.api.addEventListener('message-received', function(event) {
            let recv = JSON.parse(event.data);
            if(recv.notify != undefined) {

                for(k in recv.notify) {
                    let state = state_cache[k];
                    if(state != null) {
                        state_cache[k].value = recv.notify[k];
                    }
                    else {
                        state_cache[k] = { last_probed: recv.notify[k], value: recv.notify[k] };
                    }

                }
            }
        });

        ext.getSensorValue = function(prop) {
            //console.log("ext.getSensorValue: %s %o", prop, callback);

            let key = proptable[prop];
            if(key == undefined) return "";

            let state = state_cache[key];
            if(state == undefined) return "";
            
            return state.value;
        };

        ext.getSensorBoolValue = function(prop) {
            return (ext.getSensorValue(prop) ? true : false);
        };

        ext.onButtonChanged = function(prop) {
            //console.log("ext.onButtonChanged: %s", prop);
            let ws = ext.api.getConnection(null);
            if(ws == null) return false;

            let key = proptable[prop];
            if(key == undefined) return false;

            let state = state_cache[key];
            if(state == undefined) return false;

            let last_probed = state.last_probed;
            let new_value = state.value;
            state_cache[key].last_probed = state.value;

            if(last_probed != new_value && new_value == true) {
                return true;
            }

            return false;
        };

        ext.onSensorValueChanged = function(prop, lessmore, threshold) {
            //console.log("ext.onSensorValueChanged: %s %s %d", prop, lessmore, threshold);
            let ws = ext.api.getConnection(null);
            if(ws == null) return false;

            let key = proptable[prop];
            if(key == undefined) return false;

            let state = state_cache[key];
            if(state == undefined) return false;

            let last_probed = state.last_probed;
            let new_value = state.value;
            state_cache[prop].last_probed = state.value;

            if(last_probed != new_value) {
                if( (lessmore == '<' && last_probed >= threshold && new_value < threshold)  &&
                    (lessmore == '>' && last_probed <= threshold && new_value > threshold) ) {
                        return true;
                }
            }
            
            return false;
        };

        ScratchExtensions.register(name, descriptor, ext);
    };

    let scriptpath = document.currentScript.src.match(/.*\//);
    $.getScript(scriptpath + 'ws-ext.js')
        .done( function(ws_ext, textStatus) {
            var eventTarget = document.createDocumentFragment();
            ws_ext_init(ext_, eventTarget);
            fake_picoboard_ext_init(ext_);
        });
    
})();
