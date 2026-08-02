"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for the browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FactoryMockLogin() {
  const [email, setEmail] = useState("");
  // Steps: 0 = Loading Session, 1 = Email Input, 2 = Welcome Dashboard
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [username, setUsername] = useState("");

  // Dashboard Specific States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 1. AUTO-LOGIN: Check local storage
  useEffect(() => {
    const savedUsername = localStorage.getItem("test_factory_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setStep(2); 
    } else {
      setStep(1); 
    }
  }, []);

  // 2. LIVE CLOCK: Update the time every second (only runs on client to prevent errors)
  useEffect(() => {
    if (step === 2) {
      setCurrentTime(new Date());
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // 3. MOCK LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const { data: userRecord, error: dbError } = await supabase
      .from("users")
      .select("username")
      .eq("email", email)
      .single();

    setIsLoading(false);

    if (dbError || !userRecord) {
      setMessage({ type: "error", text: "Error: Email not Registered." });
      return;
    }

    localStorage.setItem("test_factory_username", userRecord.username);
    setUsername(userRecord.username);
    setStep(2);
  };

  // 4. LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("test_factory_username");
    setEmail("");
    setIsProfileOpen(false);
    setStep(1);
  };

  // --- UI RENDERING ---
  
  // Loading Screen (Step 0)
  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center font-sans">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Dashboard Screen (Step 2)
  if (step === 2) {
    return (
      <div className="h-screen w-full flex overflow-hidden font-sans bg-slate-900 text-slate-100">
        
        {/* FOLDABLE SIDEBAR */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-700 transition-all duration-300 flex flex-col z-20`}>
          {/* Sidebar Header */}
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-center border-b border-slate-700">
            {isSidebarOpen ? (
              <img src="/logo.png" alt="PMS Logo" className="h-8 object-contain" />
            ) : (
              <img src="/logo.png" alt="PMS Icon" className="h-8 object-contain" />
            )}
          </div>
          
          {/* Menu Options */}
          <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
            {[
              { name: "Orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
              { name: "Production", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
              { name: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { name: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
              { name: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }
            ].map((item) => (
              <button key={item.name} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800 transition-colors w-full overflow-hidden text-slate-300 hover:text-white">
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
                {isSidebarOpen && <span className="font-semibold whitespace-nowrap">{item.name}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA (Responsive Background) */}
        <main className="flex-1 flex flex-col relative bg-[url('/bg-mobile
        ')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/60">
          
          {/* Top Bar */}
          <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-4 md:px-8">
            {/* Hamburger Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer p-1 rounded-full hover:bg-slate-800/50 transition-colors"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <span className="hidden md:block font-medium text-slate-200">Hi, {username}</span>
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md border-2 border-blue-400">
                  {username.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-700 md:hidden">
                    <p className="text-sm text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">{username}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 font-semibold hover:bg-slate-700 hover:text-red-300 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Center Content Placeholder */}
          <div className="flex-1 flex justify-center items-center p-6">
            <h2 className="text-3xl font-bold text-white/50 animate-pulse">Select an option from the menu</h2>
          </div>

          {/* Bottom Bar (Live Time) */}
          <footer className="h-12 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex justify-center items-center text-slate-300 font-mono text-sm tracking-widest shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            {currentTime ? currentTime.toLocaleString(undefined, { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            }) : 'Initializing temporal sensors...'}
          </footer>

        </main>
      </div>
    );
  }

  // Professional Login Screen (Step 1)
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 font-sans bg-slate-900 bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex justify-center">
            <img src="/logo-vertical.png" alt="PMS Logo" className="h-24 object-contain block md:hidden drop-shadow-md" />
            <img src="/logo-horizontal.png" alt="PMS Logo" className="h-16 object-contain hidden md:block drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">PMS PORTAL</h1>
          <p className="text-blue-200 text-sm mt-1">Authorized Access Only</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg text-center text-sm font-bold border ${
            message.type === "error" 
            ? "bg-red-500/20 text-red-200 border-red-500/50" 
            : "bg-emerald-500/20 text-emerald-200 border-emerald-500/50"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Corporate Email
            </label>
            <input
              type="email"
              placeholder="admin@factory.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-lg px-4 py-4 bg-slate-900/50 text-white border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-500 transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white text-lg font-bold py-4 rounded-xl hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? "Authenticating..." : "Access Dashboard"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-xs text-slate-400">© 2026 Production Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}