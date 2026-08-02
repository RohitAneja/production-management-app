"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DashboardProps {
  username: string;
  userRole: string;
  company: {
    company_name: string;
    address: string;
    support_email: string;
    support_phone: string;
    logo_url: string;
  };
  setCompany: (comp: any) => void;
  handleLogout: () => void;
  currentTime: Date | null;
}

export default function Dashboard({
  username,
  userRole,
  company,
  setCompany,
  handleLogout,
  currentTime,
}: DashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVerticalMode] = useState(window.innerHeight > window.innerWidth);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  // Editable Form States
  const [editForm, setEditForm] = useState({ ...company });
  const [saveStatus, setSaveStatus] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus({ type: "", text: "" });

    const { error } = await supabase
      .from("company_settings")
      .update({
        company_name: editForm.company_name,
        address: editForm.address,
        support_email: editForm.support_email,
        support_phone: editForm.support_phone,
        logo_url: editForm.logo_url,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    setIsSaving(false);

    if (error) {
      setSaveStatus({ type: "error", text: "Failed to update settings. Check permissions." });
    } else {
      setCompany(editForm);
      setSaveStatus({ type: "success", text: "Company information updated successfully!" });
    }
  };

  const baseMenu = [
    { name: "Orders", id: "orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
    { name: "Production", id: "production", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
    { name: "Reports", id: "reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Users", id: "users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  ];

  // Show Settings only if role is ADMIN
  if (userRole && userRole.trim().toUpperCase() === "ADMIN") {
    baseMenu.push({
      name: "Settings",
      id: "settings_company",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    });
  }

  return (
    <div className="h-screen w-full flex overflow-hidden font-sans bg-slate-50 text-slate-900">
      
      {/* FOLDABLE SIDEBAR */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => {
          if (!isVerticalMode) setIsSidebarOpen(false);
        }}
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-100 p-2">
          <img src={company.logo_url} alt="Company Logo" className={`object-contain transition-all duration-300 ${isSidebarOpen ? 'h-10' : 'h-8'}`} />
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-2 px-3">
          {baseMenu.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors w-full overflow-hidden font-medium ${
                activeView === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'
              }`}
            >
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
              {isSidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-white/90 overflow-y-auto">
        
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200/50 flex justify-between items-center px-4 md:px-8 shadow-sm shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>

          <div className="relative">
            <div 
              className="flex items-center gap-3 cursor-pointer p-1 pr-3 rounded-full hover:bg-white/50 transition-colors border border-transparent hover:border-slate-200"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block font-semibold text-slate-700">Hi, {username} ({userRole})</span>
              <svg className="w-4 h-4 text-slate-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 md:hidden">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{username}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* DYNAMIC VIEW ROUTING */}
        <div className="flex-1 flex justify-center items-center p-6">
          {activeView === "settings_company" ? (
            <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-slate-100 my-auto">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Company Settings</h2>
                <p className="text-sm text-slate-500">Update your organization profile details below.</p>
              </div>

              {saveStatus.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${
                  saveStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}>
                  {saveStatus.text}
                </div>
              )}

              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Company Name</label>
                  <input 
                    type="text" 
                    value={editForm.company_name} 
                    onChange={(e) => setEditForm({...editForm, company_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Factory Address</label>
                  <input 
                    type="text" 
                    value={editForm.address} 
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Support Email</label>
                    <input 
                      type="email" 
                      value={editForm.support_email} 
                      onChange={(e) => setEditForm({...editForm, support_email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Support Phone</label>
                    <input 
                      type="text" 
                      value={editForm.support_phone} 
                      onChange={(e) => setEditForm({...editForm, support_phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Logo URL or Path</label>
                  <input 
                    type="text" 
                    value={editForm.logo_url} 
                    onChange={(e) => setEditForm({...editForm, logo_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 text-sm"
                  >
                    {isSaving ? "Saving Changes..." : "Save Company Info"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveView("dashboard")}
                    className="px-6 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-slate-400/70 animate-pulse">
              {isVerticalMode && isSidebarOpen ? "Select" : "Select an option from the menu"}
            </h2>
          )}
        </div>

        {/* Footer */}
        <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/50 shadow-sm z-10 shrink-0">
          <div className="py-2 px-4 text-center space-y-0.5 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-700">{company.company_name}</p>
            {company.address && <p className="text-xs text-slate-500">{company.address}</p>}
            {company.support_email && (
              <p className="text-xs text-slate-500">
                Support: {company.support_email} {company.support_phone && `| ${company.support_phone}`}
              </p>
            )}
          </div>

          <footer className="h-9 flex justify-center items-center text-slate-600 font-mono text-xs tracking-widest">
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

      </main>
    </div>
  );
}