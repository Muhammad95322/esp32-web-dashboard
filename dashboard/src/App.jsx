import React, { useState, useEffect } from 'react';
import mqtt from 'precompiled-mqtt'; // Wait, let's just use regular 'mqtt'
// The mqtt module in Vite sometimes needs to be imported as follows or might have polyfill issues. 
// Standard import:
import * as mqtt from 'mqtt/dist/mqtt.min';
import { Thermometer, Droplets, Activity, Wifi, WifiOff } from 'lucide-react';

const MQTT_BROKER_URL = 'ws://broker.emqx.io:8083/mqtt';
const TOPIC = 'esp32/sensor/dashboard';

function App() {
  const [client, setClient] = useState(null);
  const [connectStatus, setConnectStatus] = useState('Disconnected');
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    status: 'Offline'
  });

  useEffect(() => {
    // Generate a random client ID
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    
    // Connect to EMQX public broker over WebSockets
    const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    setClient(mqttClient);

    mqttClient.on('connect', () => {
      setConnectStatus('Connected');
      mqttClient.subscribe(TOPIC, () => {
        console.log(`Subscribed to topic: ${TOPIC}`);
      });
    });

    mqttClient.on('message', (topic, payload) => {
      if (topic === TOPIC) {
        try {
          const data = JSON.parse(payload.toString());
          setSensorData(prev => ({ ...prev, ...data }));
        } catch (error) {
          console.error("Invalid JSON:", payload.toString());
        }
      }
    });

    mqttClient.on('reconnect', () => {
      setConnectStatus('Reconnecting');
    });

    mqttClient.on('error', (err) => {
      console.error('Connection error: ', err);
      mqttClient.end();
      setConnectStatus('Error');
    });

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      <header className="max-w-5xl mx-auto py-8">
        <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              ESP32 Smart Dashboard
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Real-time IoT Monitoring System</p>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700">
            {connectStatus === 'Connected' ? (
              <Wifi className="text-emerald-400 h-5 w-5 animate-pulse" />
            ) : (
              <WifiOff className="text-rose-400 h-5 w-5" />
            )}
            <span className={`font-medium ${
              connectStatus === 'Connected' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {connectStatus}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Temperature Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Thermometer size={100} />
          </div>
          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
              <Thermometer size={28} />
            </div>
            <h2 className="text-xl font-semibold text-slate-200">Temperature</h2>
          </div>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-6xl font-bold tracking-tight text-white">{sensorData.temperature.toFixed(1)}</span>
            <span className="text-3xl font-medium text-blue-400 mb-1">°C</span>
          </div>
        </div>

        {/* Humidity Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Droplets size={100} />
          </div>
          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Droplets size={28} />
            </div>
            <h2 className="text-xl font-semibold text-slate-200">Humidity</h2>
          </div>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-6xl font-bold tracking-tight text-white">{sensorData.humidity.toFixed(1)}</span>
            <span className="text-3xl font-medium text-emerald-400 mb-1">%</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={100} />
          </div>
          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
              <Activity size={28} />
            </div>
            <h2 className="text-xl font-semibold text-slate-200">Device Status</h2>
          </div>
          <div className="mt-4 relative z-10">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
              sensorData.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${sensorData.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></div>
              <span className="font-semibold text-lg">{sensorData.status}</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto mt-12 text-center">
        <p className="text-slate-500 text-sm">Waiting for data from ESP32 via EMQX Broker • Topic: <span className="font-mono bg-slate-800 px-2 py-1 rounded">{TOPIC}</span></p>
      </footer>
    </div>
  );
}

export default App;
