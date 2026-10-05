#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker Configuration (We use public EMQX Broker for testing)
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883; // TCP port
const char* topic = "esp32/sensor/dashboard";

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Simulate reading data every 3 seconds
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  if (now - lastMsg > 3000) {
    lastMsg = now;

    // Simulate sensor data
    float temp = random(200, 350) / 10.0; // 20.0 to 35.0 C
    float hum = random(400, 800) / 10.0;  // 40.0 to 80.0 %

    // Create JSON document
    StaticJsonDocument<200> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["status"] = "Online";

    char jsonBuffer[512];
    serializeJson(doc, jsonBuffer);

    Serial.print("Publishing message: ");
    Serial.println(jsonBuffer);
    
    // Publish to topic
    client.publish(topic, jsonBuffer);
  }
}
