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

  // 1. AUTO-LOGIN: Check local storage to see if they logged in previously
  useEffect(() => {
    const savedUsername = localStorage.getItem("test_factory_username");
    
    if (savedUsername) {
      setUsername(savedUsername);
      setStep(2); // Jump straight to Welcome screen
    } else {
      setStep(1); // Show Email input
    }
  }, []);

  // 2. MOCK LOGIN: Check database, skip OTP, save to local storage
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    // Query the users table to see if the email exists
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

    // If found, bypass Supabase Auth entirely for testing
    // Save the username to the browser's local storage so it survives a refresh/close
    localStorage.setItem("test_factory_username", userRecord.username);
    setUsername(userRecord.username);
    setStep(2);
  };

  // 3. LOGOUT: Clear local storage and return to Step 1
  const handleLogout = () => {
    localStorage.removeItem("test_factory_username");
    setEmail("");
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

  // Welcome Dashboard (Step 2)
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 font-sans bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-blue-600">
          <img src="/logo.png" alt="Company Logo" className="h-16 mx-auto mb-6 object-contain" />
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-inner">
            {username.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Hi, {username}!</h1>
          <p className="text-slate-500 mb-8 font-medium">Production Management System</p>
          
          <button
            onClick={handleLogout}
            className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 hover:shadow-md transition-all duration-200"
          >
            Secure Log Out
          </button>
        </div>
      </div>
    );
  }

  // Professional Login Screen (Step 1)
  return (
    /* The main wrapper containing the responsive background logic */
    <div className="min-h-screen flex flex-col justify-center items-center p-4 font-sans bg-slate-900 bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay">
      
      {/* Glassmorphism Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Company Logo" className="h-20 mx-auto mb-4 object-contain drop-shadow-md" />
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