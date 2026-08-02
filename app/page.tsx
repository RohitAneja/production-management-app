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
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("Operator"); // Default fallback

  // Dashboard Specific States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isVerticalMode, setIsVerticalMode] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // Active Navigation View ('dashboard' or 'settings_company')
  const [activeView, setActiveView] = useState("dashboard");

  // Company Settings State
  const [company, setCompany] = useState({
    company_name: "PMS Industries Pvt. Ltd.",
    address: "123 Industrial Phase-IV, Ludhiana, Punjab",
    support_email: "support@pms-industries.com",
    support_phone: "+91 98765 43210",
    logo_url: "/logo.png"
  });

  // Edit Form States for Company Info
  const [editForm, setEditForm] = useState({ ...company });
  const [saveStatus, setSaveStatus] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);

  // EXPLICIT TWO-STEP LOOKUP FUNCTION
  const fetchUserAndRole = async (userEmail: string) => {
    try {
      // Step 1: Fetch user details by email
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("username, role_id")
        .eq("email", userEmail)
        .single();

      if (userError || !userRecord) {
        return { username: "", roleName: "Operator" };
      }

      let resolvedRoleName = "Operator";

      // Step 2: If role_id exists, fetch the exact role_name from the roles table
      if (userRecord.role_id) {
        const { data: roleRecord, error: roleError } = await supabase
          .from("roles")
          .select("role_name")
          .eq("id", userRecord.role_id)
          .single();

        if (!roleError && roleRecord && roleRecord.role_name) {
          resolvedRoleName = roleRecord.role_name;
        }
      }

      return { username: userRecord.username, roleName: resolvedRoleName };
    } catch (err) {
      console.error("Error fetching user/role:", err);
      return { username: "", roleName: "Operator" };
    }
  };

  // 1. FETCH COMPANY SETTINGS, AUTO-LOGIN & ROLES MAPPING
  useEffect(() => {
    const fetchCompanyData = async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
        
      if (data && !error) {
        setCompany(data);
        setEditForm(data);
      }
    };
    fetchCompanyData();

    if (window.innerHeight > window.innerWidth) {
      setIsVerticalMode(true);
      setIsSidebarOpen(true); 
    }

    const checkStoredUser = async () => {
      const savedEmail = localStorage.getItem("test_factory_email");
      
      if (savedEmail) {
        const { username: fetchedName, roleName: fetchedRole } = await fetchUserAndRole(savedEmail);
        if (fetchedName) {
          setUsername(fetchedName);
          setUserRole(fetchedRole);
          setStep(2); 
        } else {
          setStep(1);
        }
      } else {
        setStep(1); 
      }
    };
    checkStoredUser();
  }, []);

  // 2. LIVE CLOCK
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. MOCK LOGIN & ROLE RESOLUTION
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    // Execute the explicit two-step query for the provided email
    const { username: fetchedName, roleName: fetchedRole } = await fetchUserAndRole(email);

    setIsLoading(false);

    if (!fetchedName) {
      setMessage({ type: "error", text: "Error: Email not Registered." });
      return;
    }

    localStorage.setItem("test_factory_username", fetchedName);
    localStorage.setItem("test_factory_email", email);
    setUsername(fetchedName);
    setUserRole(fetchedRole);
    setStep(2);
  };

  // 4. LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("test_factory_username");
    localStorage.removeItem("test_factory_email");
    setEmail("");
    setIsProfileOpen(false);
    setActiveView("dashboard");
    setStep(1);
  };

  // 5. SAVE COMPANY SETTINGS
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
        logo_url: editForm.logo_url
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

  // --- UI RENDERING ---
  
  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center font-sans">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Dashboard Screen (Step 2)
  if (step === 2) {
    const baseMenu = [
      { name: "Orders", id: "orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
      { name: "Production", id: "production", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
      { name: "Reports", id: "reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { name: "Users", id: "users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    ];

    // Conditionally show Settings menu ONLY if mapped role is ADMIN (case-insensitive check)
    if (userRole && userRole.trim().toUpperCase() === "ADMIN") {
      baseMenu.push({ 
        name: "Settings", 
        id: "settings_company", 
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
      });
    }

    return (
      <div className="h-screen w-full flex overflow-hidden font-sans bg-slate-50 text-slate-900">
        
        {/* FOLDABLE SIDEBAR */}
        <aside 
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => {
            if (!isVerticalMode) {
              setIsSidebarOpen(false);
            }
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
              /* EDITABLE COMPANY INFO FORM */
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
              /* DEFAULT DASHBOARD VIEW */
              <h2 className="text-2xl font-bold text-slate-400/70 animate-pulse">
                {isVerticalMode && isSidebarOpen ? "Select" : "Select an option from the menu"}
              </h2>
            )}
          </div>

          {/* Bottom Footer on Dashboard */}
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
              }) : 'Initializing temporal sensors...'}
            </footer>
          </div>

        </main>
      </div>
    );
  }

  // Professional Login Screen (Step 1)
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-white/80 p-4">
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
  );
}