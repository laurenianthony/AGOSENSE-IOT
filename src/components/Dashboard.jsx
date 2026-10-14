import { 
    Activity, Droplets, ShieldCheck, Waves, Bell, Database, Wifi, Users, ChevronRight, CheckCircle2, User 
} from 'lucide-react';

export default function Landing({ onLogin, onRegister }) {
    return (
        <div className="min-h-screen bg-[#040d1a] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30">
            {/* Global Ambient Glows */}
            <div className="absolute top-0 right-0 w-1/2 h-[800px] bg-gradient-to-bl from-[#0879ff]/10 via-[#19c7ff]/5 to-transparent blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed top-1/2 left-0 w-1/3 h-[500px] bg-[#19c7ff]/5 blur-[150px] pointer-events-none -z-10"></div>

            {/* ================= HEADER ================= */}
            <header className="flex justify-between items-center px-6 md:px-12 py-8 max-w-[1400px] mx-auto w-full relative z-50">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                    <div className="bg-gradient-to-br from-[#0879ff] to-[#19c7ff] w-12 h-12 rounded-xl flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_20px_rgba(25,199,255,0.3)]">
                        ≈
                    </div>
                    <div className="leading-tight">
                        <div className="font-bold text-xl tracking-wider text-white">AGOSENSE</div>
                        <div className="text-[10px] text-[#8ba3bd] tracking-[0.25em] mt-0.5">SMART DRAINAGE</div>
                    </div>
                </div>

                <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-gray-400 tracking-wide">
                    <a href="#home" className="hover:text-[#19c7ff] transition">Home</a>
                    <a href="#monitoring" className="hover:text-[#19c7ff] transition">Monitoring</a>
                    <a href="#features" className="hover:text-[#19c7ff] transition">Features</a>
                    <a href="#records" className="hover:text-[#19c7ff] transition">Records</a>
                    <a href="#contact" className="hover:text-[#19c7ff] transition">Contact</a>
                    
                    <div className="flex items-center gap-5 ml-4 pl-8 border-l border-[#1a3555]">
                        <button onClick={onLogin} className="text-gray-300 hover:text-white transition font-bold">
                            Sign In
                        </button>
                        <button onClick={onRegister} className="bg-gradient-to-r from-[#0879ff] to-[#19c7ff] text-white px-5 py-2.5 rounded text-[13px] font-bold shadow-[0_4px_15px_rgba(8,121,255,0.3)] hover:scale-105 transition-transform">
                            Create Account
                        </button>
                    </div>
                </nav>
            </header>

            {/* ================= HERO SECTION ================= */}
            <section id="home" className="max-w-[1400px] mx-auto px-6 md:px-12 pt-10 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10 border-b border-[#1a3555]/50">
                <div className="space-y-8 mt-4">
                    <div className="flex items-center gap-3 text-[11px] font-extrabold tracking-[0.2em] text-[#8ba3bd]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e]"></span>
                        IoT-POWERED MONITORING SYSTEM
                    </div>

                    <h1 className="text-[3.5rem] lg:text-[5.5rem] font-bold leading-[1.05] tracking-tight text-white">
                        Smarter<br/>Drainage.<br/>
                        <span className="text-[#19c7ff]">Safer<br/>Communities.</span>
                    </h1>

                    <p className="text-[#8ba3bd] max-w-[500px] text-[1.05rem] leading-relaxed">
                        AGOSENSE is an IoT-based smart drainage monitoring and blockage detection system designed to monitor water levels and water flow in real time.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <button onClick={onLogin} className="bg-[#0879ff] hover:bg-[#0066eb] text-white px-8 py-3.5 rounded-lg text-[15px] font-bold shadow-[0_8px_25px_rgba(8,121,255,0.4)] transition-all hover:-translate-y-0.5 flex items-center gap-2">
                            View Dashboard <ChevronRight size={18} />
                        </button>
                        <a href="#monitoring" className="border border-[#2a4365] hover:border-[#19c7ff] text-white px-8 py-3.5 rounded-lg text-[15px] font-bold transition-all bg-[#0a1829]/50 backdrop-blur-sm">
                            Live Demo
                        </a>
                    </div>

                    <div className="flex gap-12 pt-10">
                        <div>
                            <div className="text-[#19c7ff] font-bold mb-1 text-[15px]">24/7</div>
                            <div className="text-[#647b96] text-[11px] font-semibold tracking-wider">Monitoring</div>
                        </div>
                        <div>
                            <div className="text-[#19c7ff] font-bold mb-1 text-[15px]">REAL-TIME</div>
                            <div className="text-[#647b96] text-[11px] font-semibold tracking-wider">Sensor Data</div>
                        </div>
                        <div>
                            <div className="text-[#19c7ff] font-bold mb-1 text-[15px]">IoT</div>
                            <div className="text-[#647b96] text-[11px] font-semibold tracking-wider">Connected</div>
                        </div>
                    </div>
                </div>

                {/* Hero Illustration (CSS Art) */}
                <div className="relative w-full max-w-[520px] mx-auto lg:ml-auto">
                    <div className="bg-gradient-to-br from-[#0c223a] to-[#061424] border border-[#1a3555] rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-[#718aa6] mb-2.5">
                                    <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]"></span> LIVE SYSTEM
                                </div>
                                <h2 className="text-[1.6rem] font-bold tracking-[0.1em] text-white">AGOSENSE</h2>
                            </div>
                            <div className="text-[#19c7ff] font-bold tracking-widest mt-2">⌁⌁</div>
                        </div>

                        <div className="relative h-[280px] bg-gradient-to-b from-[#09223b] to-[#04101c] rounded-2xl overflow-hidden mb-10 border border-[#122b46]">
                            <div className="absolute -left-[10%] top-[40%] w-[120%] h-[60%] bg-gradient-to-b from-[#19c7ff]/80 to-[#0879ff]/40 rounded-t-[50%]">
                                <div className="absolute top-6 left-1/4 w-24 h-1.5 bg-white/30 rounded-full"></div>
                                <div className="absolute top-10 right-[20%] w-16 h-1.5 bg-white/20 rounded-full"></div>
                                <div className="absolute top-[80px] left-[15%] w-12 h-1.5 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[220px] h-[150px] bg-[#071321] rounded-t-[110px] border-[6px] border-[#132a42]">
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-14 bg-[#0d2640] border border-[#224466] rounded-xl flex items-center justify-center gap-2.5 z-10 shadow-[0_0_20px_rgba(25,199,255,0.15)]">
                                    <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span>
                                    <span className="text-[11px] text-[#b3cce6] font-bold tracking-wider">ESP32</span>
                                </div>
                                <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[3px] h-[70px] bg-gradient-to-b from-[#19c7ff] to-transparent opacity-80"></div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-[12px] pt-5 border-t border-[#1a324d]">
                            <span className="text-[#6c86a1]">Sensor Network</span>
                            <span className="text-[#22c55e] font-bold tracking-widest">CONNECTED</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= MONITORING / DEMO SECTION ================= */}
            <section id="monitoring" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10 border-b border-[#1a3555]/50">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                    <div>
                        <p className="text-[#19c7ff] text-[11px] font-extrabold tracking-[0.2em] mb-3">SYSTEM MONITORING</p>
                        <h2 className="text-[2.5rem] font-bold text-white leading-tight">Live Drainage Status</h2>
                    </div>
                    <div className="bg-[#19c7ff]/10 border border-[#19c7ff]/30 text-[#19c7ff] px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-widest">
                        DEMO DATA
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1: Water Level */}
                    <article className="bg-gradient-to-br from-[#0c223a] to-[#061424] border border-[#1a3555] rounded-2xl p-8 hover:-translate-y-1 hover:border-[#19c7ff]/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-[#19c7ff]/10 text-[#19c7ff] p-3 rounded-xl"><Droplets size={24} /></div>
                            <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold px-3 py-1.5 rounded-md tracking-wider">NORMAL</span>
                        </div>
                        <p className="text-[#8ba3bd] text-[13px] font-medium">Water Level</p>
                        <div className="text-[2.5rem] font-bold text-white mt-1 mb-4">68<span className="text-lg text-[#6c86a1] ml-1">%</span></div>
                        <div className="w-full bg-[#0a1829] h-2 rounded-full overflow-hidden mb-3">
                            <div className="bg-gradient-to-r from-[#0879ff] to-[#19c7ff] w-[68%] h-full rounded-full"></div>
                        </div>
                        <small className="text-[#6c86a1] text-[11px]">Safe operating level</small>
                    </article>

                    {/* Card 2: Water Flow */}
                    <article className="bg-gradient-to-br from-[#0c223a] to-[#061424] border border-[#1a3555] rounded-2xl p-8 hover:-translate-y-1 hover:border-[#19c7ff]/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-[#19c7ff]/10 text-[#19c7ff] p-3 rounded-xl"><Waves size={24} /></div>
                            <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold px-3 py-1.5 rounded-md tracking-wider">NORMAL</span>
                        </div>
                        <p className="text-[#8ba3bd] text-[13px] font-medium">Water Flow</p>
                        <div className="text-[2.5rem] font-bold text-white mt-1 mb-4">2.8<span className="text-lg text-[#6c86a1] ml-1">L/min</span></div>
                        <div className="flex items-end gap-1.5 h-6 mb-3">
                            {[40, 70, 50, 90, 60].map((height, i) => (
                                <div key={i} className="w-2 bg-[#19c7ff]/80 rounded-full" style={{ height: `${height}%` }}></div>
                            ))}
                        </div>
                        <small className="text-[#6c86a1] text-[11px]">Flow detected</small>
                    </article>

                    {/* Card 3: Drainage Status */}
                    <article className="bg-gradient-to-br from-[#0c223a] to-[#061424] border border-[#1a3555] rounded-2xl p-8 hover:-translate-y-1 hover:border-[#19c7ff]/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-[#19c7ff]/10 text-[#19c7ff] p-3 rounded-xl"><Activity size={24} /></div>
                            <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold px-3 py-1.5 rounded-md tracking-wider">CLEAR</span>
                        </div>
                        <p className="text-[#8ba3bd] text-[13px] font-medium">Drainage Status</p>
                        <div className="flex items-center gap-3 mt-4 mb-5">
                            <div className="bg-[#22c55e]/20 text-[#22c55e] p-2 rounded-full"><CheckCircle2 size={24} /></div>
                            <strong className="text-white text-lg">Clear</strong>
                        </div>
                        <small className="text-[#6c86a1] text-[11px] block mt-5">No abnormal condition detected</small>
                    </article>

                    {/* Card 4: Blockage */}
                    <article className="bg-gradient-to-br from-[#0c223a] to-[#061424] border border-[#1a3555] rounded-2xl p-8 hover:-translate-y-1 hover:border-[#19c7ff]/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-[#19c7ff]/10 text-[#19c7ff] p-3 rounded-xl"><ShieldCheck size={24} /></div>
                            <span className="bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold px-3 py-1.5 rounded-md tracking-wider">SAFE</span>
                        </div>
                        <p className="text-[#8ba3bd] text-[13px] font-medium">Blockage Detection</p>
                        <div className="flex items-center gap-3 mt-4 mb-5">
                            <div className="bg-[#0879ff]/20 text-[#0879ff] p-2 rounded-full"><ShieldCheck size={24} /></div>
                            <strong className="text-white text-lg">Not Detected</strong>
                        </div>
                        <small className="text-[#6c86a1] text-[11px] block mt-5">Water flow is within normal range</small>
                    </article>
                </div>
            </section>

            {/* ================= FEATURES SECTION ================= */}
            <section id="features" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10 border-b border-[#1a3555]/50">
                <div className="text-center max-w-[700px] mx-auto mb-20">
                    <p className="text-[#0879ff] text-[11px] font-extrabold tracking-[0.2em] mb-3">SYSTEM CAPABILITIES</p>
                    <h2 className="text-[2.5rem] font-bold text-white leading-tight mb-6">Built for smarter <span className="text-[#19c7ff]">drainage management.</span></h2>
                    <p className="text-[#8ba3bd]">AGOSENSE provides essential monitoring tools for communities, LGU personnel, and drainage maintenance teams.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { icon: <Droplets size={28} />, title: 'Water-Level Monitoring', desc: 'Sensors monitor water levels and provide continuous information about changing drainage conditions.' },
                        { icon: <Waves size={28} />, title: 'Flow Monitoring', desc: 'Monitor water flow in real time to quickly identify unusual or reduced drainage movement.' },
                        { icon: <Bell size={28} />, title: 'Early Alerts', desc: 'Receive immediate alerts when water levels spike or a possible blockage is detected.' },
                        { icon: <Database size={28} />, title: 'Historical Records', desc: 'Review recorded telemetry data to understand seasonal drainage patterns over time.' },
                        { icon: <Wifi size={28} />, title: 'IoT Connectivity', desc: 'An ESP32-based hardware system wirelessly transmits sensor telemetry to the cloud interface.' },
                        { icon: <Users size={28} />, title: 'Community Support', desc: 'Designed to establish safer environments for residents by supporting rapid LGU response.' },
                    ].map((feature, idx) => (
                        <article key={idx} className="bg-[#0a1829] border border-[#1a3555] rounded-2xl p-8 hover:border-[#0879ff]/50 hover:bg-[#0c223a] transition-all duration-300">
                            <div className="w-14 h-14 rounded-xl bg-[#0879ff]/10 text-[#19c7ff] flex items-center justify-center mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-[#8ba3bd] text-[14px] leading-relaxed">{feature.desc}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* ================= RECORDS SECTION ================= */}
            <section id="records" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10 border-b border-[#1a3555]/50">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <p className="text-[#19c7ff] text-[11px] font-extrabold tracking-[0.2em] mb-3">MONITORING HISTORY</p>
                        <h2 className="text-[2.5rem] font-bold text-white leading-tight">Recent Sensor Records</h2>
                    </div>
                </div>

                <div className="w-full overflow-x-auto rounded-xl border border-[#1a3555] bg-[#061424]">
                    <table className="w-full min-w-[700px] text-left">
                        <thead className="bg-[#0a1829] border-b border-[#1a3555]">
                            <tr>
                                <th className="p-5 text-[11px] font-bold tracking-wider text-[#6c86a1] uppercase">Date</th>
                                <th className="p-5 text-[11px] font-bold tracking-wider text-[#6c86a1] uppercase">Time</th>
                                <th className="p-5 text-[11px] font-bold tracking-wider text-[#6c86a1] uppercase">Water Level</th>
                                <th className="p-5 text-[11px] font-bold tracking-wider text-[#6c86a1] uppercase">Flow Rate</th>
                                <th className="p-5 text-[11px] font-bold tracking-wider text-[#6c86a1] uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a3555]/50">
                            {[
                                { date: 'August 27, 2026', time: '08:00 AM', level: '62%', flow: '3.1 L/min', status: 'Normal', color: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20' },
                                { date: 'August 27, 2026', time: '10:00 AM', level: '68%', flow: '2.8 L/min', status: 'Normal', color: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20' },
                                { date: 'August 27, 2026', time: '12:00 PM', level: '74%', flow: '2.2 L/min', status: 'Watch', color: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' },
                                { date: 'August 27, 2026', time: '02:00 PM', level: '70%', flow: '2.6 L/min', status: 'Normal', color: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20' },
                            ].map((row, idx) => (
                                <tr key={idx} className="hover:bg-[#0c223a]/50 transition-colors">
                                    <td className="p-5 text-[14px] text-white">{row.date}</td>
                                    <td className="p-5 text-[14px] text-[#8ba3bd]">{row.time}</td>
                                    <td className="p-5 text-[14px] text-white font-medium">{row.level}</td>
                                    <td className="p-5 text-[14px] text-[#8ba3bd]">{row.flow}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1.5 rounded-md text-[11px] font-bold border ${row.color}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ================= CONTACT SECTION ================= */}
            <section id="contact" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10 border-b border-[#1a3555]/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div>
                        <p className="text-[#0879ff] text-[11px] font-extrabold tracking-[0.2em] mb-3">GET IN TOUCH</p>
                        <h2 className="text-[2.5rem] font-bold text-white leading-tight mb-6">Help us build a <span className="text-[#19c7ff]">safer community.</span></h2>
                        <p className="text-[#8ba3bd] mb-12">Send feedback, report drainage concerns, or share monitoring observations directly with the AGOSENSE administrative team.</p>
                        
                        <div className="space-y-6 border-l-2 border-[#1a3555] pl-6">
                            <div>
                                <h4 className="text-white font-bold mb-1">01. Report drainage concerns</h4>
                                <p className="text-[13px] text-[#6c86a1]">Notify maintenance of localized flooding.</p>
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-1">02. Share monitoring observations</h4>
                                <p className="text-[13px] text-[#6c86a1]">Verify live sensor data with on-the-ground facts.</p>
                            </div>
                        </div>
                    </div>

                    <form className="bg-[#061424] border border-[#1a3555] p-8 rounded-2xl shadow-xl">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[12px] font-bold text-[#8ba3bd] mb-2 uppercase tracking-wider">Full Name</label>
                                <input type="text" className="w-full bg-[#0a1829] border border-[#1a3555] text-white p-3.5 rounded-xl focus:outline-none focus:border-[#19c7ff] transition-colors" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#8ba3bd] mb-2 uppercase tracking-wider">Email</label>
                                <input type="email" className="w-full bg-[#0a1829] border border-[#1a3555] text-white p-3.5 rounded-xl focus:outline-none focus:border-[#19c7ff] transition-colors" placeholder="you@email.com" />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-[12px] font-bold text-[#8ba3bd] mb-2 uppercase tracking-wider">User Role</label>
                            <select className="w-full bg-[#0a1829] border border-[#1a3555] text-white p-3.5 rounded-xl focus:outline-none focus:border-[#19c7ff] transition-colors appearance-none">
                                <option>Resident</option>
                                <option>Barangay Official</option>
                                <option>Maintenance Personnel</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-[12px] font-bold text-[#8ba3bd] mb-2 uppercase tracking-wider">Message</label>
                            <textarea rows="4" className="w-full bg-[#0a1829] border border-[#1a3555] text-white p-3.5 rounded-xl focus:outline-none focus:border-[#19c7ff] transition-colors resize-none" placeholder="How can we help?"></textarea>
                        </div>
                        <button type="button" className="w-full bg-[#0879ff] hover:bg-[#0066eb] text-white font-bold py-4 rounded-xl transition-colors shadow-[0_4px_15px_rgba(8,121,255,0.2)]">
                            Send Message
                        </button>
                    </form>
                </div>
            </section>

            {/* ================= DEVELOPER SECTION ================= */}
            <section id="developer" className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10">
                <div className="bg-gradient-to-r from-[#0c223a] to-[#081a2c] border border-[#1a3555] rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-2xl bg-gradient-to-br from-[#0879ff] to-[#19c7ff] flex items-center justify-center shadow-[0_10px_30px_rgba(25,199,255,0.2)]">
                        <User size={64} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[#19c7ff] text-[11px] font-extrabold tracking-[0.2em] mb-2">PROJECT DEVELOPER</p>
                        <h3 className="text-[2rem] font-bold text-white mb-3">CALDERON, Lauren Anthony S.</h3>
                        <p className="text-[#8ba3bd] max-w-[600px] leading-relaxed mb-6">
                            Junior BS Information Technology student specializing in full-stack web development and IoT integration. Developing the AGOSENSE capstone to provide practical, scalable solutions for municipal drainage systems using Laravel, React, and embedded C++.
                        </p>
                        <button className="text-[#19c7ff] font-bold text-[13px] hover:text-white transition-colors flex items-center gap-1">
                            View Full Profile <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ================= FOOTER ================= */}
            <footer className="bg-[#020810] border-t border-[#1a3555] py-12">
                <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-[#19c7ff] font-bold text-xl">≈</div>
                        <div>
                            <div className="text-white font-bold text-[14px] tracking-wider">AGOSENSE</div>
                            <div className="text-[#6c86a1] text-[10px] tracking-widest mt-0.5">SMART DRAINAGE</div>
                        </div>
                    </div>
                    <div className="text-center md:text-right text-[#6c86a1] text-[12px]">
                        <p className="mb-1">© 2026 AGOSENSE. Academic Capstone Project.</p>
                        <p>Developed for Calauan, Laguna • BSIT Junior Standing</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
