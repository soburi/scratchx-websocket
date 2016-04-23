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

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsServer.h>

#include <ArduinoJson.h>

#define SSID "ssid"
#define PASS "password"

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * json, size_t length);
void sendSensorValue(int A0_current, int IO0_current);

bool strequal(const char* x, const char* y) {
  return (strncmp(x, y, strlen(x)) == 0);
}

const int ANALOG_THRESHOLD = 4;
const int SEND_INTERVAL = 100;

ESP8266WiFiMulti WiFiMulti;
WebSocketsServer webSocket = WebSocketsServer(80);

int conn_status[WEBSOCKETS_SERVER_CLIENT_MAX] = {WStype_ERROR};
char sendtext[128] = {0};

int A0_prev = 0;
int IO0_prev = 0;

int A0_current;
int IO0_current;

int last_update = 0;

void setup() {
  Serial.begin(115200);

  pinMode(A0, INPUT);
  pinMode(0, INPUT_PULLUP);
  pinMode(14, OUTPUT);

  digitalWrite(14, 0);
  
  A0_prev = analogRead(A0);
  IO0_prev = digitalRead(0);
  A0_current = A0_prev;
  IO0_current = IO0_prev;
  
  Serial.println();

  WiFiMulti.addAP(SSID, PASS);

  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(100);
  }

  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());
  digitalWrite(14, 1);

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

    
void loop() {

  webSocket.loop();
  
  int now = millis();

  if ( (last_update + SEND_INTERVAL) < now) {
    last_update = now;
        
    A0_current = analogRead(A0);
    IO0_current = digitalRead(0);

    bool A0_changed = false;
    bool IO0_changed = false;
    
    if(abs(A0_current - A0_prev) > ANALOG_THRESHOLD) {
      A0_prev = A0_current;
      A0_changed = true;
    }
    
    if(IO0_current != IO0_prev) {
      IO0_prev = IO0_current;
      IO0_changed = true;
    }
    
    if(A0_changed || IO0_changed) {
      sendSensorValue(A0_current, IO0_current);
    }
  }
}



void webSocketEvent(uint8_t num, WStype_t type, uint8_t * json, size_t length) {
  IPAddress ip = webSocket.remoteIP(num);

  Serial.print("webSocketEvent ");
  switch (type) {
    case WStype_DISCONNECTED: {
      conn_status[num] = WStype_DISCONNECTED;
      Serial.print("[");
      Serial.print(num);
      Serial.println("] Disconnected!");
      return;
    }
    case WStype_CONNECTED: {
      conn_status[num] = WStype_CONNECTED;
      Serial.print("[");
      Serial.print(num);
      Serial.print("] Connected from ");
      Serial.print(ip);
      Serial.print(" url: ");
      Serial.println((char*)json);
      sendSensorValue(A0_current, IO0_current);
      return;
    }
    case WStype_TEXT: {
      Serial.print("[");
      Serial.print(num);
      Serial.print("] get Text: ");
      Serial.println((char*)json);
      break;
    }
    case WStype_BIN: {
      Serial.print("[");
      Serial.print(num);
      Serial.print("] get binary length: ");
      Serial.println(length);
      hexdump(json, length);
      break;
    }
    case WStype_ERROR: {
      Serial.println("ERROR");
      break;
    }
  }
}


void sendSensorValue(int slider, int button) {
  StaticJsonBuffer<128> notifyBuffer;
  JsonObject& root = notifyBuffer.createObject();
  JsonObject& notify = root.createNestedObject("notify");

  notify["slider"] = (int) (slider / 1024.0 * 100.0);
  notify["button"] = (button ? 0 : 1);
  
  root.printTo(sendtext, sizeof(sendtext) );

  for(int i=0; i<WEBSOCKETS_SERVER_CLIENT_MAX; i++) {
    if( conn_status[i] == WStype_CONNECTED) {
      Serial.print("sendTXT[");
      Serial.print(i);
      Serial.print("]: ");
      Serial.println(sendtext);
      webSocket.sendTXT(i, sendtext);
    }
  }
}

