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

function ws_ext_init(ext, emitter) {
    let ws_conn = {};
    let received_events = [];
    let received_events_length = 20;
    let timeout_duration = 1000;
    let status_ = {status: 2, msg: 'Ready'};

    ext.api = {};

    // util functions

    received_events.unchecked = function() {
        for(let i=this.length-1; i>=0; i--) {
            if(this[i].checked == undefined) return this[i];
        }
        return null;
    }.bind(received_events);

    ws_conn.getErrorReason = function() {
        let msg = null;
        let ws_conn = this;
        for(k in ws_conn) {
            let ws = ws_conn[k];
            if( ws.close_status_ != undefined) {
                if(msg == null) {
                    msg = ws.url + ': ' + ws.close_reason_;
                }
                else {
                    msg += '\n' + ws.url + ': ' + ws.close_reason_;
                }
            }
        }
        return msg;
    }.bind(ws_conn);

    ext.api.getConnection = function(_k) {
        let ret = ws_conn[_k];
        if(ret != undefined)
            return ret;

        for(let kk in ws_conn) {
            if(kk.indexOf('://') != -1) {
                return ws_conn[kk];
            }
        }
        return null;
    };

    ext.api.disposeEvent = function(e) {
        let i=0;
        for(i=0; i<received_events.length; i++) {
            if(received_events[i] === e) {
                received_events.splice(i, 1);
                return;
            }
        }
    };

    ext.api.setErrorStatus = function(status, msg) {
        status_.status = status;
        status_.msg = msg;
    };

    let isInternalProcessEvent = function(event) { return false; };
    ext.api.setInternalEventCheckHook = function(fn) {
        isInternalProcessEvent = fn;
    }

    ext.api.addEventListener    = emitter.addEventListener.bind(emitter);
    ext.api.removeEventListener = emitter.removeEventListener.bind(emitter);
    ext.api.dispatchEvent       = emitter.dispatchEvent.bind(emitter);


    // Scratch system facilities.

    ext._shutdown = function() {
        for(k in ws_conn) ws_conn[k].close();
    };

    ext._getStatus = function() {
        return status_;
    };

    // Connect and disconnect

    ext.connect = function(_url, callback) {
        console.log("ext.connect: %s %O", _url, callback);
        if(_url in ws_conn) {
            console.log("ext.connect: %s readyState:%d", _url, ws_conn[_url].readyState);
            switch(ws_conn[_url].readyState) {
                case 0:
                case 1:
                    callback();
                    return;
                default:
                    //fall through
            }
        }

        let callbacked = false;
        let reason = "";
        let ws = null;

        try {
            ws = new WebSocket(_url);
            ws.message = null;
            ws_conn[_url] = ws;
        }
        catch(e) {
            status_.status = 1;
            status_.msg = _url + ' exception: ' + e.message;
            callbacked = true;
            console.log("ext.connect: %s: exception:%o", _url, e);
            callback();
            return;
        }

        setTimeout( function() {
            if(!callbacked) {
                status_.status = 1;
                status_.msg    = "Connect timeout";
                callbacked = true;
                console.log("ext.connect: %s timeout", _url);
                callback();
            }
        }, timeout_duration );

        ws.addEventListener('open', function(event) {
            console.log("%s: onopen", _url);

            if(!callbacked) {
                let errmsg = ws_conn.getErrorReason();
                status_.status = (errmsg != null) ? 1 : 2;
                status_.msg    = (errmsg != null) ? errmsg : 'Ready';
                callbacked = true;
                console.log("%s: onopen: callback:%s", _url, status_.msg);
                callback();
            }
        });

        ws.addEventListener('error', function(err) {
            console.log("%s: onerror", ws.url);
            if(!callbacked) {
                status_.status = 1;
                status_.msg    = 'onerror: ' + reason;
                callbacked = true;
                console.log("%s: onerror: msg:%s", _url, status_.msg);
                callback();
            }
        });
        
        ws.addEventListener('close', function(event) {
                 if(event.code == 1001) reason = "1000: CLOSE_NORMAL";
            else if(event.code == 1001) reason = "1001: CLOSE_GOING_AWAY";
            else if(event.code == 1002) reason = "1002: CLOSE_PROTOCOL_ERROR";
            else if(event.code == 1003) reason = "1003: CLOSE_UNSUPPORTED";
            else if(event.code == 1004) reason = "1004: RESERVED";
            else if(event.code == 1005) reason = "1005: CLOSE_NO_STATUS";
            else if(event.code == 1006) reason = "1006: CLOSE_ABNORMAL";
            else if(event.code == 1007) reason = "1007: Unsupported Data";
            else if(event.code == 1008) reason = "1008: Policy Violation";
            else if(event.code == 1009) reason = "1009: CLOSE_TOO_LARGE";
            else if(event.code == 1010) reason = "1010: Missing Extension";
            else if(event.code == 1011) reason = "1011: Internal Error";
            else if(event.code == 1012) reason = "1012: Service Restart";
            else if(event.code == 1013) reason = "1013: Try Again Later";
            else if(event.code == 1014) reason = "1014: RESERVED";
            else if(event.code == 1015) reason = "1015: TLS Handshake";
            else                        reason = "" + event.code + ": Unknown reason";

            console.log("%s: onclose: %s", ws.url, reason);

            if(event.code != 1000) {
                ws.close_status_ = event.code;
                ws.close_reason_ = reason;

                status_.status = 1;
                status_.msg = ws_conn.getErrorReason();

                if(!callbacked) {
                    callbacked = true;
                    console.log("%s: onclose: msg:%s", _url, status_.msg);
                    callback();
                }
            }
        });

        ws.addEventListener('message', function(event) {
            console.log("%s: onmessage:", ws.url, event.data);
            if(received_events.length == received_events_length) {
                received_events.shift();
            }
            if( !isInternalProcessEvent(event) ) {
                received_events.push(event);
            }
            let evt = new MessageEvent('message-received',
                {
                    data: event.data,
                    origin: event.origin,
                    currentTarget: event.currentTarget,
                    srcElement: event.srcElement,
                    target: event.target
                });
            ext.api.dispatchEvent(evt);
        });

    };

    ext.disconnect = function(arg0, arg1) {
        let disconnect_ = function(_url, callback) {
            let ws = ext.api.getConnection(_url);
            if(ws == null) {
                console.log("ext.disconnect: callback %s not yet init", _url);
                callback();
                return;
            }

            switch(ws.readyState) {
                case 0:
                case 1:
                    console.log("ext.disconnect: close: %s readyState:%d", ws.url, ws.readyState);
                    ws.close();
                    ws.addEventListener('close', function(event) {
                        console.log("%s: onclose callback", ws.url);
                        callback();
                        return;
                    });
            }
            console.log("ext.disconnect: %s: callback default", ws.url);
            callback();
        };
        disconnect_(  arg1==undefined ? null : arg0, arg1==undefined ? arg0 : arg1 );
    };

    // Send and receive

    ext.send = function(data, _url) {
        let ws = ext.api.getConnection(_url);
        console.log("ext.send: %s, %s %o", _url, ws.url, data);
        ws.send(data);
    };

    ext.api.send = ext.send;

    ext.getMessage = function(_url) {
        console.log("ext.getMessage: %s", _url);
        for(let i=0; i<received_events.length; i++) {
            console.log("ext.getMessage: %o", received_events[i]);
            if(received_events[i].checked == true && received_events[i].origin == _url) {
                let r = received_events.splice(i, 1);
                let ret = r[0].data;
                console.log("ext.getMessage: ", ret);
                return ret;
            }
        }

        return null; 
    };

    ext.getLastReceivedMessageOrigin = function() {
        console.log("ext.getLastReceivedMessageOrigin");
        if(received_event.length == 0) 
            return null;
        else
            return received_event[0].origin;
    };

    ext.onMessageReceived = function() {
        let chk = received_events.unchecked();
        if(chk != null) {
            chk.checked = true;
            return true;
        }
        return false;
    };

    // Tiny Json Library

    ext.emptyObject = function() {
        console.log("ext.emptyObject");
        let obj = new Object();
        return JSON.stringify(obj);
    };

    ext.addJsonProperty = function(propname, propvalue, jsonstr) {
        console.log("ext.addJsonProperty: %s %s %o", propname, propvalue, jsonstr);
        let jsonobj = jsonstr;
        if(jQuery.type(jsonstr) == 'string') {
            jsonobj = JSON.parse(jsonstr);
        }

        jsonobj[propname] = propvalue;
        return JSON.stringify(jsonobj);
    };

    ext.getJsonProperty = function(propname, jsonstr) {
        console.log("ext.getJsonProperty: %s %o", propname, jsonstr);
        let jsonobj = jsonstr;
        if(jQuery.type(jsonstr) == 'string') {
            jsonobj = JSON.parse(jsonstr);
        }

        if(propname in jsonobj) {
            if( jQuery.type(jsonobj[propname]) == 'object') {
                return JSON.stringify(jsonobj[propname]);
            }
            else {
                return jsonobj[propname];
            }
        }
        return null;
    };

    return ext;
}
