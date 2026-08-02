"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("Operator");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // COMPANY STATE INITIALIZED AS BLANK
  const [company, setCompany] = useState({
    company_name: "",
    address: "",
    support_email: "",
    support_phone: "",
    logo_url: ""
  });

  const fetchUserAndRole = async (userEmail: string) => {
    try {
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("username, role_id")
        .eq("email", userEmail)
        .single();

      if (userError || !userRecord) return { username: "", roleName: "Operator" };

      let resolvedRoleName = "Operator";
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
      console.error("Error matching user role:", err);
      return { username: "", roleName: "Operator" };
    }
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
        
      if (data && !error) setCompany(data);
    };
    fetchCompanyData();

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

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

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

  const handleLogout = () => {
    localStorage.removeItem("test_factory_username");
    localStorage.removeItem("test_factory_email");
    setEmail("");
    setStep(1);
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center font-sans">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <Dashboard
        username={username}
        userRole={userRole}
        company={company}
        setCompany={setCompany}
        handleLogout={handleLogout}
        currentTime={currentTime}
      />
    );
  }

  return (
    <LoginScreen
      company={company}
      email={email}
      setEmail={setEmail}
      handleLogin={handleLogin}
      isLoading={isLoading}
      message={message}
      currentTime={currentTime}
    />
  );
}