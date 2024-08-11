#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Arduino_JSON.h>
#include <ArduinoOTA.h>
#include <math.h>
// put function declarations here:
int RelayPin = D3;
JSONVar thermostatData;

// Replace with your network credentials
const char *ssid = "Home_2G";
const char *password = "GoHome2G";

const char *PARAM_MESSAGE = "maxTemp";
const double hysteresis = 0.5;

const int thermistorPin = A0;
const int seriesResistor = 10000;      // Value of the series resistor in ohms
const float nominalResistance = 10000; // Resistance of thermistor at 25 degrees C
const float nominalTemperature = 25.0; // Nominal temperature value (usually 25 degrees C)
const float betaCoefficient = 3950;    // Beta coefficient of the thermistor (usually found in datasheet)
const int adcMaxValue = 1023;          // ADC resolution (10-bit ADC -> 0 to 1023)
const float maxAdcInputVoltage = 3.1;  // Maximum input voltage to ADC
const float supplyVoltage = 3.7;       // Supply voltage

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);

// Create a WebSocket object
AsyncWebSocket ws("/ws");

// Timer variables
unsigned long lastTime = 0;
unsigned long timerDelay = 10000;

// Initialize LittleFS
void initFS()
{
  if (!LittleFS.begin())
  {
    Serial.println("An error has occurred while mounting LittleFS");
  }
  else
  {
    Serial.println("LittleFS mounted successfully");
  }
}

// Initialize WiFi
void initWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi ..");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print('.');
    delay(1000);
  }

  Serial.println("Ready");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void initOta()
{
  ArduinoOTA.setPassword((const char *)"Ota23050607");
  ArduinoOTA.onStart([]()
                     { Serial.println("Start"); });
  ArduinoOTA.onEnd([]()
                   { Serial.println("\nEnd"); });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total)
                        { Serial.printf("Progress: %u%%\r", (progress / (total / 100))); });
  ArduinoOTA.onError([](ota_error_t error)
                     {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed"); });
  ArduinoOTA.begin();
}

void InitMDNS()
{
  if (!MDNS.begin("thermostat"))
  {
    Serial.println("Error starting mDNS");
  }
  Serial.println("mDNS started");
}

void notifyClients(String sensorReadings)
{
  ws.textAll(sensorReadings);
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
  case WS_EVT_CONNECT:
    Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
    break;
  case WS_EVT_DISCONNECT:
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
    break;
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void initWebSocket()
{
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}

float getTemperature(void)
{
  int adcValue = analogRead(thermistorPin);
  thermostatData["read"] = adcValue;
  float voltage = adcValue * maxAdcInputVoltage / adcMaxValue;
  float resistance = seriesResistor * (supplyVoltage / voltage - 1.0);
  float steinhart;
  steinhart = resistance / nominalResistance;       // (R/Ro)
  steinhart = log(steinhart);                       // ln(R/Ro)
  steinhart /= betaCoefficient;                     // 1/B * ln(R/Ro)
  steinhart += 1.0 / (nominalTemperature + 273.15); // + (1/To)
  steinhart = 1.0 / steinhart;                      // Invert
  steinhart -= 273.15;
  thermostatData["readTemp"] = steinhart;
  if ((double)thermostatData["prevTemp"] != 0)
  {
    steinhart = 0.9 * (double)thermostatData["prevTemp"] + 0.1 * steinhart; // Convert to Celsius
  }

  return steinhart;
}

void setup()
{
  pinMode(RelayPin, OUTPUT);
  digitalWrite(RelayPin, LOW);
  analogReference(EXTERNAL);
  Serial.begin(115200);

  thermostatData["maxTemp"] = (float)28;
  thermostatData["currentTemp"] = (float)0;
  thermostatData["prevTemp"] = (float)0;
  thermostatData["fanOn"] = (bool)false;
  thermostatData["message"];

  initOta();
  initWiFi();
  initFS();
  initWebSocket();
  InitMDNS();

  // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
            { request->send(LittleFS, "/index.html", "text/html"); });

  server.on("/api/data", HTTP_POST, [](AsyncWebServerRequest *request)
            {
    if (request->hasParam(PARAM_MESSAGE, true)) {
      thermostatData["maxTemp"] = request->getParam(PARAM_MESSAGE, true)->value().toFloat();
      String message = "Max temp set to "  + (String) request->getParam(PARAM_MESSAGE, true)->value().toFloat() + "°C";
      thermostatData["message"] = message;
      request->send(200, "text/plain", JSON.stringify(thermostatData));
    } else {
      thermostatData["message"] = "Max temp not set";
      request->send(400, "text/plain", JSON.stringify(thermostatData));
    } });

  server.on("/api/data", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    thermostatData["currentTemp"] = getTemperature();
    request->send(200, "text/plain", JSON.stringify(thermostatData)); });

  server.serveStatic("/", LittleFS, "/");

  // Start server
  server.begin();
}

void loop()
{
  ArduinoOTA.handle();
  if ((millis() - lastTime) > timerDelay)
  {
    thermostatData["currentTemp"] = getTemperature();

    if ((double)thermostatData["currentTemp"] > (double)thermostatData["maxTemp"] + hysteresis)
    {
      thermostatData["fanOn"] = true;
      Serial.println("serial pin high");
      digitalWrite(RelayPin, HIGH);
    }

    if ((double)thermostatData["currentTemp"] < (double)thermostatData["maxTemp"] - hysteresis)
    {
      thermostatData["fanOn"] = false;
      Serial.println("serial pin low");
      digitalWrite(RelayPin, LOW);
    }
    String thrData = JSON.stringify(thermostatData);
    Serial.println(thrData);
    notifyClients(thrData);
    Serial.println("serial pin");
    Serial.println(digitalRead(RelayPin));
    thermostatData["prevTemp"] = (double)thermostatData["currentTemp"];
    lastTime = millis();
  }

  ws.cleanupClients();
}