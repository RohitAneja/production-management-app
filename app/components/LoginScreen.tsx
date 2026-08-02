"use client";

import { useState } from "react";

interface LoginScreenProps {
  company: {
    company_name: string;
    address: string;
    support_email: string;
    support_phone: string;
    logo_url: string;
  };
  email: string;
  setEmail: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  isLoading: boolean;
  message: { type: string; text: string };
  currentTime: Date | null;
}

export default function LoginScreen({
  company,
  email,
  setEmail,
  handleLogin,
  isLoading,
  message,
  currentTime,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-slate-100 bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-white/80 p-4">
      
      {/* Spacer to center card */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-10 border border-white">
          
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex justify-center">
              <img src={company.logo_url} alt="Company Logo" className="h-20 object-contain drop-shadow-sm" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{company.company_name}</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Authorized Portal Access</p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-center text-sm font-semibold border ${
              message.type === "error" 
              ? "bg-red-50 text-red-700 border-red-100" 
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Corporate Email
              </label>
              <input
                type="email"
                placeholder="admin@factory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-lg px-4 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400 transition-all shadow-sm"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white text-lg font-bold py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} {company.company_name}. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/50 shadow-sm z-10">
        <div className="py-3 px-4 text-center space-y-1 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700">{company.company_name}</p>
          {company.address && <p className="text-xs text-slate-500">{company.address}</p>}
          {company.support_email && (
            <p className="text-xs text-slate-500">
              Support: {company.support_email} {company.support_phone && `| ${company.support_phone}`}
            </p>
          )}
        </div>

        <footer className="h-10 flex justify-center items-center text-slate-600 font-mono text-xs tracking-widest">
          {currentTime ? currentTime.toLocaleString(undefined, { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }) : 'Initializing clock...'}
        </footer>
      </div>

    </div>
  );
}