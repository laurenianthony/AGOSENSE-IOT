import React, { useState, useEffect } from 'react';
import api from './api/axios';
import Login from './components/Login';
import Register from './components/Register';
import { Activity, LogOut, Droplets, Battery, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
    const [user, setUser] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check localStorage on initial load
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const role = localStorage.getItem('user_role');
        if (token) {
            setUser({ role });
            fetchDashboard();
        }
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            // Calls http://127.0.0.1:8000/api/v1/dashboard
            const response = await api.get('/dashboard');
            setDashboardData(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to connect to local Laravel backend. Make sure php artisan serve is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            // Clear session locally even if request fails
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        setUser(null);
    };

    const handleAuthSuccess = (userData) => {
        setUser(userData);
        fetchDashboard();
    };

    // 1. Render Login or Register if not authenticated
    if (!user) {
        return isRegistering ? (
            <Register 
                onRegisterSuccess={handleAuthSuccess} 
                onSwitchToLogin={() => setIsRegistering(false)} 
            />
        ) : (
            <Login 
                onLoginSuccess={handleAuthSuccess} 
                onSwitchToRegister={() => setIsRegistering(true)} 
            />
        );
    }

    // 2. Render Calauan Drainage Monitoring Dashboard if authenticated
    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                        <Activity className="text-cyan-400" /> AGOSENSE: Calauan Drainage Monitor
                    </h1>
                    <p className="text-sm text-gray-400">IoT Smart Drainage & Blockage Detection System (Midterm Build)</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-cyan-300 flex items-center gap-1">
                        <ShieldCheck size={14} /> Role: <strong className="uppercase">{user.role || localStorage.getItem('user_role')}</strong>
                    </span>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold transition"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            {/* Dashboard Content */}
            <main>
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} /> {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-gray-400 animate-pulse">Loading telemetry from local Laravel server...</div>
                ) : dashboardData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboardData.stations?.map((station) => (
                            <div key={station.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:border-cyan-500 transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">
                                            {station.code}
                                        </span>
                                        <h3 className="text-lg font-bold mt-1">{station.name}</h3>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        station.status === 'normal' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'
                                    }`}>
                                        {station.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="space-y-3 mt-4 text-sm text-gray-300">
                                    <div className="flex justify-between items-center bg-gray-900/50 p-2.5 rounded">
                                        <span className="flex items-center gap-2 text-gray-400"><Droplets size={16} className="text-cyan-400"/> Water Level</span>
                                        <span className="font-bold">{station.latest_reading?.water_level_cm || 0} cm</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-900/50 p-2.5 rounded">
                                        <span className="flex items-center gap-2 text-gray-400"><Activity size={16} className="text-cyan-400"/> Flow Rate</span>
                                        <span className="font-bold">{station.latest_reading?.flow_rate || 0} L/min</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-900/50 p-2.5 rounded">
                                        <span className="flex items-center gap-2 text-gray-400"><Battery size={16} className="text-cyan-400"/> Battery Voltage</span>
                                        <span className="font-bold">{station.latest_reading?.battery_voltage || 0} V</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-10">No station data found. Make sure your database seeders ran successfully.</p>
                )}
            </main>
        </div>
    );
}