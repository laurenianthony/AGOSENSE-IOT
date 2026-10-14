import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Battery, Waves, MapPin, AlertTriangle } from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from your Laravel backend API
    axios.get('http://127.0.0.1:8000/api/v1/dashboard')
      .then(response => {
        setStations(response.data.stations);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to connect to Laravel backend.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-white font-mono text-xl">
        Loading Calauan Drainage Telemetry...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-900 text-red-400 font-mono text-lg">
        <AlertTriangle className="w-12 h-12 mb-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 border-b border-slate-800 pb-5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Agosense: Smart Drainage & Blockage Detection
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Municipal Urban Flood Mitigation & Waste Monitoring — Calauan, Laguna
            </p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </span>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map(station => {
          const latest = station.sensor_readings?.[0];
          return (
            <div 
              key={station.id} 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700 transition-all"
            >
              {/* Station Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-mono font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    {station.station_code}
                  </span>
                </div>
                <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
                  {station.status}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                {station.location_name}
              </h2>
              <p className="text-xs text-slate-500 font-mono mb-6">
                Lat: {station.latitude} | Long: {station.longitude}
              </p>

              {/* Telemetry Metrics */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Waves className="w-4 h-4 text-cyan-400" /> Water Level
                  </span>
                  <span className="text-lg font-bold font-mono text-cyan-400">
                    {latest ? `${latest.water_level_cm} cm` : 'No Data'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> Flow Rate
                  </span>
                  <span className="text-lg font-bold font-mono text-indigo-400">
                    {latest ? `${latest.flow_rate} L/s` : 'No Data'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Battery className="w-4 h-4 text-emerald-400" /> Solar Battery
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {latest ? `${latest.battery_voltage} V` : 'No Data'}
                  </span>
                </div>
              </div>

              <div className="mt-6 text-right">
                <span className="text-[10px] font-mono text-slate-500">
                  Last Synced: {latest ? latest.recorded_at : 'Never'}
                </span>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}