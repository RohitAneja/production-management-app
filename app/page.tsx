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
  
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center font-sans">
        <p className="text-gray-500 text-lg animate-pulse">Loading secure session...</p>
      </div>
    );
  }

  // WELCOME SCREEN (Step 2)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-blue-600">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {username}!</h1>
          <p className="text-gray-500 mb-8">Welcome back to the BESTO 91 Portal.</p>
          
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition duration-200"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (Step 1)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BESTO 91 Portal</h1>
          <p className="text-gray-500">Fast Access (Testing Mode)</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-md text-center text-sm font-medium border ${
            message.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Registered Email
            </label>
            <input
              type="email"
              placeholder="admin@mybesto91.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-lg px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white text-lg font-bold py-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {isLoading ? "Checking Database..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}