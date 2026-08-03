"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

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
  const [isVerticalMode, setIsVerticalMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Settings & Users States
  const [editForm, setEditForm] = useState({ ...company });
  const [saveStatus, setSaveStatus] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserStatus, setAddUserStatus] = useState({ type: "", text: "" });
  const [newUserForm, setNewUserForm] = useState({ username: "", email: "", mobile_number: "", role_id: "" });

  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserStatus, setEditUserStatus] = useState({ type: "", text: "" });
  const [editUserForm, setEditUserForm] = useState({ id: "", username: "", email: "", mobile_number: "", role_id: "", user_status: "active" });

  // Invoice Upload States (PDF)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedInvoices, setScannedInvoices] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState({ type: "", text: "" });
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(true);

  // Invoice Upload States (Excel)
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelStatus, setExcelStatus] = useState({ type: "", text: "" });

  // ==========================================
  // HELPERS & LIFECYCLE
  // ==========================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsVerticalMode(window.innerHeight > window.innerWidth);
      if (!window.history.state || !window.history.state.view) {
        window.history.replaceState({ view: "dashboard" }, "");
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isAddUserOpen) setIsAddUserOpen(false); 
      else if (isEditUserOpen) setIsEditUserOpen(false);
      else {
        if (e.state && e.state.view) setActiveView(e.state.view);
        else setActiveView("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAddUserOpen, isEditUserOpen]);

  const handleNavigation = (id: string) => {
    if (id !== activeView) {
      window.history.pushState({ view: id }, "");
      setActiveView(id);
    }
    setIsSidebarOpen(false); 
  };

  const goHome = () => {
    if (activeView !== "dashboard") {
      window.history.pushState({ view: "dashboard" }, "");
      setActiveView("dashboard");
    }
    setIsSidebarOpen(false);
  };

  const openAddUserModal = () => { window.history.pushState({ modal: 'add' }, ""); setIsAddUserOpen(true); };
  const openEditUserModal = (user: any) => {
    setEditUserForm({ id: user.id, username: user.username || "", email: user.email || "", mobile_number: user.mobile_number || "", role_id: user.role_id || "", user_status: user.user_status || "active" });
    setEditUserStatus({ type: "", text: "" });
    window.history.pushState({ modal: 'edit' }, "");
    setIsEditUserOpen(true);
  };

  const closeAddUserModal = () => { if (isAddUserOpen) { setIsAddUserOpen(false); window.history.back(); } };
  const closeEditUserModal = () => { if (isEditUserOpen) { setIsEditUserOpen(false); window.history.back(); } };
  const closeCompanySettings = () => { if (activeView === "settings_company") { setActiveView("dashboard"); window.history.back(); } };

  useEffect(() => { setEditForm({ ...company }); }, [company]);

  const fetchUsersAndRoles = async () => {
    setIsLoadingUsers(true);
    try {
      const { data: userData } = await supabase.from("users").select(`id, username, email, mobile_number, is_active, user_status, role_id, roles ( role_name )`).order("created_at", { ascending: true });
      if (userData) setUsersList(userData);

      const { data: rolesData } = await supabase.from("roles").select("id, role_name").order("role_name", { ascending: true });
      if (rolesData) {
        setRolesList(rolesData);
        if (rolesData.length > 0 && !newUserForm.role_id) setNewUserForm(prev => ({ ...prev, role_id: rolesData[0].id }));
      }
    } catch (err) {}
    setIsLoadingUsers(false);
  };

  useEffect(() => { if (activeView === "users") fetchUsersAndRoles(); }, [activeView]);

  const filteredUsers = usersList.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : user.roles?.role_name;
    return (
      (user.username?.toLowerCase().includes(searchLower)) ||
      (user.mobile_number?.toLowerCase().includes(searchLower)) ||
      (roleName?.toLowerCase().includes(searchLower))
    );
  });

  // ------------------------------------------
  // DISPLAY FORMATTER HELPERS
  // ------------------------------------------

  // 1. Format Date to DD/MM/YYYY
  const formatDisplayDate = (dbDate: string) => {
    if (!dbDate) return "";
    const parts = dbDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    return dbDate;
  };

  // 2. Format Invoice Number (Extracts only the final digits after the last slash)
  const formatDisplayInvoiceNo = (invNo: string) => {
    if (!invNo) return "";
    if (invNo.includes('/')) {
      const parts = invNo.split('/');
      return parts[parts.length - 1]; // Grabs the '1515' from 'TI/26-27/1515'
    }
    return invNo;
  };

  // 3. Format Amount to Indian Currency Style (e.g., 2,25,887)
  const formatIndianAmount = (amount: number) => {
    if (amount === null || amount === undefined) return "0";
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
  };

  // Smart Scroll handler to auto-collapse/expand the header
  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < 20 && !isUploadPanelOpen) {
      setIsUploadPanelOpen(true);
    } else if (scrollTop > 100 && isUploadPanelOpen && scannedInvoices.length > 0) {
      setIsUploadPanelOpen(false);
    }
  };

  // ==========================================
  // FORM HANDLERS
  // ==========================================
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault(); setIsAddingUser(true); setAddUserStatus({ type: "", text: "" });
    try {
      const { error } = await supabase.from("users").insert([{
        username: newUserForm.username, email: newUserForm.email.trim() === "" ? null : newUserForm.email.trim(), mobile_number: newUserForm.mobile_number.trim() === "" ? null : newUserForm.mobile_number.trim(), role_id: newUserForm.role_id, is_active: true, user_status: 'active'
      }]);
      if (error) setAddUserStatus({ type: "error", text: error.message || "Failed to add user." });
      else {
        setAddUserStatus({ type: "success", text: "User added successfully!" }); fetchUsersAndRoles(); 
        setTimeout(() => { closeAddUserModal(); setNewUserForm({ username: "", email: "", mobile_number: "", role_id: rolesList[0]?.id || "" }); setAddUserStatus({ type: "", text: "" }); }, 1500);
      }
    } catch (err) { setAddUserStatus({ type: "error", text: "An unexpected error occurred." }); }
    setIsAddingUser(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setIsUpdatingUser(true); setEditUserStatus({ type: "", text: "" });
    try {
      const { error } = await supabase.from("users").update({
        username: editUserForm.username, email: editUserForm.email.trim() === "" ? null : editUserForm.email.trim(), mobile_number: editUserForm.mobile_number.trim() === "" ? null : editUserForm.mobile_number.trim(), role_id: editUserForm.role_id, user_status: editUserForm.user_status, is_active: editUserForm.user_status === 'active'
      }).eq("id", editUserForm.id);
      if (error) setEditUserStatus({ type: "error", text: error.message || "Failed to update user." });
      else {
        setEditUserStatus({ type: "success", text: "User updated successfully!" }); fetchUsersAndRoles(); 
        setTimeout(() => { closeEditUserModal(); setEditUserStatus({ type: "", text: "" }); }, 1500);
      }
    } catch (err) { setEditUserStatus({ type: "error", text: "An unexpected error occurred." }); }
    setIsUpdatingUser(false);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true); setSaveStatus({ type: "", text: "" });
    try {
      const { data: existingRecord } = await supabase.from("company_settings").select("id").limit(1).single();
      if (!existingRecord) { setIsSaving(false); setSaveStatus({ type: "error", text: "Error: No record found." }); return; }
      const { error } = await supabase.from("company_settings").update({
        company_name: editForm.company_name, address: editForm.address, support_email: editForm.support_email, support_phone: editForm.support_phone, logo_url: editForm.logo_url,
      }).eq("id", existingRecord.id);
      setIsSaving(false);
      if (error) setSaveStatus({ type: "error", text: "Failed to update settings." });
      else {
        setCompany(editForm); setSaveStatus({ type: "success", text: "Saved successfully! Closing..." });
        setTimeout(() => { closeCompanySettings(); setSaveStatus({ type: "", text: "" }); }, 1500);
      }
    } catch (err) { setIsSaving(false); setSaveStatus({ type: "error", text: "An unexpected error occurred." }); }
  };

  // ==========================================
  // UPLOAD INVOICES (PDF SCANNERS)
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadStatus({ type: "", text: "" });
      setScannedInvoices([]);
    }
  };

  const scanInvoices = async () => {
    if (selectedFiles.length === 0) return;
    setIsScanning(true);
    setUploadStatus({ type: "", text: "Scanning documents..." });
    const results = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company_name", company.company_name);

      try {
        const response = await fetch('/api/parse-invoice', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
          results.push({ ...data.data, source_file: data.filename });
        } else {
          setUploadStatus({ type: "error", text: `File: ${file.name} - ${data.error}` });
          setIsScanning(false);
          return;
        }
      } catch (err: any) {
        setUploadStatus({ type: "error", text: `Server Crash: Could not reach API. Check Vercel Logs.` });
        setIsScanning(false);
        return;
      }
    }

    setScannedInvoices(results);
    setUploadStatus({ type: "success", text: `Successfully scanned ${results.length} invoice(s). Please review and save.` });
    setIsScanning(false);
    setIsUploadPanelOpen(false); // Auto collapse
  };

  const saveInvoicesToDatabase = async () => {
    setIsScanning(true);
    setUploadStatus({ type: "", text: "Checking database and saving..." });

    try {
      const invoiceNos = scannedInvoices.map(inv => inv.invoice_no);
      const { data: existingInvoices, error: fetchErr } = await supabase
        .from('invoices')
        .select('invoice_no, amount, lr_number, lr_date, num_of_cases')
        .in('invoice_no', invoiceNos);

      if (fetchErr) throw fetchErr;

      const rowsToUpsert = scannedInvoices.map((inv) => {
        const { source_file, ...rest } = inv;
        const existing = existingInvoices?.find(e => e.invoice_no === rest.invoice_no);

        if (existing) {
           rest.lr_number = existing.lr_number;
           rest.lr_date = existing.lr_date;
           if (!rest.num_of_cases) rest.num_of_cases = existing.num_of_cases;
        }

        Object.keys(rest).forEach(key => {
          if (rest[key] === null) {
            delete rest[key];
          }
        });
        return rest;
      });

      const { error: upsertErr } = await supabase
         .from('invoices')
         .upsert(rowsToUpsert, { onConflict: 'invoice_no' });

      if (upsertErr) throw upsertErr;

      setUploadStatus({ type: "success", text: "Invoices securely saved/updated in the database!" });
      setSelectedFiles([]);
      setScannedInvoices([]);
      setIsUploadPanelOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      setUploadStatus({ type: "error", text: "Database Error: " + (error.message || "Unknown error") });
    }
    
    setIsScanning(false);
  };

  // ==========================================
  // BULK EXCEL UPLOAD LOGIC
  // ==========================================
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
      setExcelStatus({ type: "", text: "" });
    }
  };

  const processExcelUpload = async () => {
    if (!excelFile) return;
    setIsProcessingExcel(true);
    setExcelStatus({ type: "", text: "Parsing Excel file..." });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

          if (jsonData.length === 0) {
            setExcelStatus({ type: "error", text: "Excel file is empty." });
            setIsProcessingExcel(false);
            return;
          }

          const formattedData: any[] = jsonData.map((row: any) => ({
            date: row.date || row.Date || row.DATE,
            invoice_no: row.invoice_no || row['Invoice No'] || row.InvoiceNo || row.invoiceno,
            main_account: row.main_account || row['Main Account'] || row.MainAccount,
            sub_account: row.sub_account || row['Sub Account'] || row.SubAccount || null,
            num_of_cases: row.num_of_cases || row['Num of Cases'] || row.Cases || null,
            packing_type: row.packing_type || row['Packing Type'] || row.PackingType || null,
            amount: row.amount || row.Amount || null,
            transport: row.transport || row.Transport || null,
            lr_number: row.lr_number || row['LR Number'] || row.LRNumber || row.LR || null,
            lr_date: row.lr_date || row['LR Date'] || row.LRDate || null,
          })).filter(r => r.invoice_no);

          if (formattedData.length === 0) {
            setExcelStatus({ type: "error", text: "No valid 'Invoice No' found in the spreadsheet." });
            setIsProcessingExcel(false);
            return;
          }

          setExcelStatus({ type: "", text: `Found ${formattedData.length} records. Checking database for duplicates...` });

          const invoiceNos = formattedData.map(r => r.invoice_no);
          const { data: existingInvoices, error: fetchErr } = await supabase
            .from('invoices')
            .select('invoice_no, lr_number')
            .in('invoice_no', invoiceNos);

          if (fetchErr) throw fetchErr;

          const rowsToUpsert = [];
          let skippedCount = 0;

          for (const row of formattedData) {
            const existing = existingInvoices?.find(e => e.invoice_no === row.invoice_no);
            if (existing) {
              if (existing.lr_number && existing.lr_number.trim() !== '') {
                skippedCount++;
                continue;
              }
            }
            Object.keys(row).forEach(key => {
              if (row[key] === null) delete row[key];
            });
            rowsToUpsert.push(row);
          }

          if (rowsToUpsert.length === 0) {
            setExcelStatus({ type: "success", text: `All ${skippedCount} invoices already exist with LR Numbers. Nothing to update.` });
            setIsProcessingExcel(false);
            return;
          }

          setExcelStatus({ type: "", text: `Saving ${rowsToUpsert.length} records to database (Skipped ${skippedCount})...` });
          const { error: upsertErr } = await supabase.from('invoices').upsert(rowsToUpsert, { onConflict: 'invoice_no' });
          if (upsertErr) throw upsertErr;

          setExcelStatus({ type: "success", text: `Successfully saved/updated ${rowsToUpsert.length} invoices! (Skipped ${skippedCount})` });
          setExcelFile(null);
          if (excelInputRef.current) excelInputRef.current.value = "";

        } catch (err: any) {
          setExcelStatus({ type: "error", text: err.message || "Error processing Excel data." });
        } finally {
          setIsProcessingExcel(false);
        }
      };
      reader.readAsBinaryString(excelFile);
    } catch (err: any) {
      setExcelStatus({ type: "error", text: "Failed to read file." });
      setIsProcessingExcel(false);
    }
  };

  // ==========================================
  // SIDEBAR CONFIGURATION
  // ==========================================
  const menuOptions = [
    { name: "Orders", id: "orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
    { 
      name: "Invoices/Bills", 
      id: "invoices_parent", 
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      children: [
        { name: "Upload Invoices", id: "upload_invoices", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
        { name: "Upload Builty", id: "upload_builty", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" }
      ]
    },
    { name: "Production", id: "production", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
    { name: "Reports", id: "reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
  ];

  if (userRole && userRole.trim().toUpperCase() === "ADMIN") {
    menuOptions.push({ name: "Users", id: "users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" });
    menuOptions.push({
      name: "Settings", id: "settings_parent", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
      children: [
        { name: "Company Info", id: "settings_company", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
        { name: "App Settings", id: "settings_app", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" }
      ]
    });
  }

  return (
    <div className="h-screen w-full flex overflow-hidden font-sans bg-slate-50 text-slate-900">
      
      {/* SIDEBAR */}
      <aside 
        onMouseEnter={() => !isVerticalMode && setIsSidebarOpen(true)}
        onMouseLeave={() => !isVerticalMode && setIsSidebarOpen(false)}
        className={`${isSidebarOpen ? 'w-64 border-r border-slate-200' : 'w-0 border-r-0'} bg-white transition-all duration-300 flex flex-col z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 overflow-hidden absolute md:relative h-full`}
      >
        <div className="w-64 flex flex-col h-full shrink-0">
          <div onClick={goHome} className="h-16 flex items-center justify-center border-b border-slate-100 p-2 cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
            <img src="/logo.png" alt="Company Logo" className="object-contain h-10 transition-all duration-300" />
          </div>
          <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto">
            {menuOptions.map((item: any) => (
              <div key={item.id}>
                <button 
                  onClick={() => { 
                    if (item.children) {
                      setExpandedMenu(expandedMenu === item.id ? null : item.id); 
                    } else {
                      handleNavigation(item.id); 
                    }
                  }} 
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors w-full overflow-hidden font-medium ${activeView === item.id || (item.children && item.children.some((c:any) => c.id === activeView)) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}
                >
                  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
                  <span className="whitespace-nowrap">{item.name}</span>
                  {item.children && <svg className={`ml-auto w-4 h-4 shrink-0 transition-transform duration-200 ${expandedMenu === item.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>}
                </button>
                {item.children && expandedMenu === item.id && (
                  <div className="ml-10 mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-2 overflow-hidden animate-fade-in">
                    {item.children.map((child: any) => (
                      <button key={child.id} onClick={() => handleNavigation(child.id)} className={`flex items-center gap-3 p-2 rounded-lg transition-colors w-full overflow-hidden text-sm font-medium ${activeView === child.id ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-700'}`}>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={child.icon}></path></svg>
                        <span className="whitespace-nowrap">{child.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative bg-[url('/bg-mobile.jpg')] md:bg-[url('/bg-desktop.jpg')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-white/90 overflow-y-auto">
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200/50 flex justify-between items-center px-4 md:px-8 shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-slate-400 font-bold hidden md:block">
              {isVerticalMode ? (isSidebarOpen ? "Select" : "Select") : (isSidebarOpen ? "Select an option from the menu" : "Select an option from the menu")}
            </h1>
          </div>
          <div className="relative">
            <div onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 cursor-pointer p-1 pr-3 rounded-full hover:bg-white/50 transition-colors border border-transparent hover:border-slate-200">
              <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200">{username.charAt(0).toUpperCase()}</div>
              <span className="hidden md:block font-semibold text-slate-700">Hi, {username} ({userRole})</span>
              <svg className="w-4 h-4 text-slate-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 md:hidden">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{username}</p>
                </div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* FULL SCREEN DYNAMIC VIEWS */}
        <div className="flex-1 flex flex-col p-0 md:p-6 overflow-hidden">

          {/* UPLOAD INVOICES VIEW - UPDATED WITH SMART COLLAPSE & TABLE DESIGN */}
          {activeView === "upload_invoices" && (
            <div className="flex-1 flex flex-col bg-white md:bg-white/95 md:backdrop-blur-xl rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border md:border-white overflow-hidden animate-fade-in relative">
              
              <div className="flex-1 overflow-y-auto pb-12" onScroll={handleMainScroll}>
                
                {/* Sticky Header with manual expand/collapse toggle */}
                <div className="p-5 md:p-6 border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center transition-all">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Upload Invoices</h2>
                    <p className="text-sm text-slate-500 hidden md:block">Add invoices via AI PDF Scan or Bulk Excel Upload.</p>
                  </div>
                  {scannedInvoices.length > 0 && (
                    <button 
                      onClick={() => setIsUploadPanelOpen(!isUploadPanelOpen)}
                      className="text-xs md:text-sm font-bold text-blue-600 bg-blue-50 px-3 md:px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      {isUploadPanelOpen ? "Hide Scanner" : "Show Scanner"}
                    </button>
                  )}
                </div>
                
                {/* The smoothly collapsing grid container */}
                <div className={`transition-all duration-500 origin-top overflow-hidden ${isUploadPanelOpen ? 'max-h-[1200px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}>
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-slate-100">
                    
                    {/* 1. PDF UPLOAD CARD */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">1. AI PDF Scanner</h3>
                      <p className="text-xs text-slate-500 mb-5">Select single or multiple PDF invoices. The system matches your company name and extracts data automatically.</p>
                      
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        multiple 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors mb-4"
                      />
                      
                      <div className="mt-auto pt-2">
                        <button 
                          onClick={scanInvoices}
                          disabled={selectedFiles.length === 0 || isScanning || isProcessingExcel}
                          className="w-full bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors disabled:opacity-50"
                        >
                          {isScanning && scannedInvoices.length === 0 ? "Scanning PDFs..." : "Scan PDF Files"}
                        </button>
                      </div>
                      {uploadStatus.text && (
                        <div className={`mt-4 p-3 rounded-xl text-xs font-semibold border ${uploadStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : uploadStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"}`}>
                          {uploadStatus.text}
                        </div>
                      )}
                    </div>

                    {/* 2. EXCEL BULK UPLOAD CARD */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 flex flex-col">
                      <h3 className="text-lg font-bold text-emerald-800 mb-1">2. Bulk Excel Sync</h3>
                      <p className="text-xs text-emerald-600/80 mb-5">Upload an Excel/CSV file containing Columns: <span className="font-bold text-emerald-700">Invoice No, Date, Main Account, Sub Account, Num of Cases, Packing Type, Amount, Transport, LR Number, LR Date</span>.</p>
                      
                      <input 
                        type="file" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        ref={excelInputRef}
                        onChange={handleExcelFileChange}
                        className="block w-full text-sm text-emerald-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 transition-colors mb-4"
                      />
                      
                      <div className="mt-auto pt-2">
                        <button 
                          onClick={processExcelUpload}
                          disabled={!excelFile || isProcessingExcel || isScanning}
                          className="w-full bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          {isProcessingExcel ? "Processing Spreadsheet..." : "Upload & Sync Database"}
                        </button>
                      </div>
                      {excelStatus.text && (
                        <div className={`mt-4 p-3 rounded-xl text-xs font-semibold border ${excelStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : excelStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse"}`}>
                          {excelStatus.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF SCANNED INVOICES PREVIEW */}
                {scannedInvoices.length > 0 && (
                  <div id="preview-section" className="p-6 bg-slate-50/50 min-h-[600px]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Scanned Results Preview</h3>
                        <p className="text-sm text-slate-500">Verify the extracted data below before saving.</p>
                      </div>
                      <button 
                        onClick={saveInvoicesToDatabase}
                        disabled={isScanning}
                        className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isScanning ? "Saving..." : "Confirm & Save to Database"}
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr className="text-slate-600 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 pl-6 w-[15%]">File Name</th>
                            <th className="p-4 w-[10%]">Inv No</th>
                            <th className="p-4 w-[10%]">Date</th>
                            <th className="p-4 w-[25%]">Account</th>
                            <th className="p-4 w-[10%]">Cases</th>
                            <th className="p-4 w-[10%]">Amount</th>
                            <th className="p-4 w-[20%]">Transport</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {scannedInvoices.map((inv, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 pl-6 text-sm font-medium text-slate-500 truncate max-w-[150px]">{inv.source_file}</td>
                              
                              {/* UPDATED: Formatted Invoice Number (Displays only the last segment) */}
                              <td className="p-4 text-sm font-bold text-slate-900">{formatDisplayInvoiceNo(inv.invoice_no)}</td>
                              
                              <td className="p-4 text-sm text-slate-600 font-mono tracking-tight">{formatDisplayDate(inv.date)}</td>
                              
                              <td className="p-4 text-sm text-slate-700">
                                {inv.sub_account ? (
                                  <>
                                    <span className="font-bold text-slate-900 block md:inline">{inv.sub_account}</span>
                                    <span className="text-slate-400 font-normal mx-1 hidden md:inline">c/o</span>
                                    <span className="block md:inline text-xs md:text-sm font-semibold">{inv.main_account}</span>
                                  </>
                                ) : (
                                  <span className="font-semibold text-slate-900">{inv.main_account}</span>
                                )}
                              </td>
                              
                              <td className="p-4 text-sm">
                                {inv.num_of_cases ? (
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                    {inv.num_of_cases} {inv.packing_type}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* UPDATED: Formatted Indian Currency Amount */}
                              <td className="p-4 text-sm font-bold text-emerald-600">₹{formatIndianAmount(inv.amount)}</td>
                              
                              <td className="p-4 text-sm text-slate-600">{inv.transport}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* USERS TABLE VIEW */}
          {activeView === "users" && (
            <div className="flex-1 flex flex-col bg-white md:bg-white/95 md:backdrop-blur-xl rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border md:border-white overflow-hidden animate-fade-in relative">
              <div className="p-0 md:p-6 flex-1 flex flex-col">
                <div className="p-5 md:p-0 border-b md:border-none border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 md:bg-transparent mb-0 md:mb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-sm text-slate-500">Manage factory staff, roles, and access.</p>
                  </div>
                  <div className="flex w-full md:w-auto items-center gap-3">
                    <div className="relative w-full md:w-64">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 h-12 shrink-0 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" />
                    </div>
                    <button onClick={openAddUserModal} className="flex shrink-0 bg-blue-600 text-white px-4 h-12 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      <span className="hidden md:block">Add User</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-x-auto overflow-y-auto md:border border-slate-200 md:rounded-xl">
                  {isLoadingUsers ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr className="text-slate-500 text-xs uppercase tracking-wider font-bold">
                          <th className="p-4 pl-6">S.No</th>
                          <th className="p-4">Username</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Mobile</th>
                          <th className="p-4 text-center pr-6">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredUsers.map((user, index) => {
                          const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : user.roles?.role_name;
                          return (
                            <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                              <td className="p-4 pl-6 text-sm font-medium text-slate-500">{(index + 1).toString().padStart(2, '0')}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">{user.username.charAt(0).toUpperCase()}</div>
                                  <span className="text-sm font-bold text-slate-900">{user.username}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleName?.toUpperCase() === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                  {roleName || "Operator"}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.user_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : user.user_status === 'hold' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                  {user.user_status ? user.user_status.toUpperCase() : "ACTIVE"}
                                </span>
                              </td>
                              <td className="p-4"><span className="text-sm font-medium text-slate-600">{user.mobile_number || "—"}</span></td>
                              <td className="p-4 pr-6 text-center">
                                <button onClick={() => openEditUserModal(user)} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors opacity-70 group-hover:opacity-100">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredUsers.length === 0 && !isLoadingUsers && (
                          <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">{searchQuery ? `No users found matching "${searchQuery}"` : "No users found in database."}</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BACKGROUND PLACEHOLDER FOR OTHER VIEWS */}
          {activeView !== "users" && activeView !== "settings_company" && activeView !== "upload_invoices" && (
             <div className="flex-1 flex justify-center items-center">
               <h2 className="text-2xl font-bold text-slate-400/70 animate-pulse text-center px-4">
                 {activeView !== "dashboard" ? `${activeView.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} (Coming Soon)` : ""}
               </h2>
             </div>
          )}
        </div>

        {/* MODALS */}
        {isAddUserOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm md:p-6 transition-all duration-300" onClick={closeAddUserModal}>
            <div className="bg-white md:bg-white/95 md:backdrop-blur-xl w-full h-full md:h-auto md:max-w-md md:rounded-2xl shadow-2xl flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-100 bg-transparent sticky top-0 z-10 shrink-0">
                <h2 className="text-xl font-extrabold text-slate-800">Add New User</h2>
                <button onClick={closeAddUserModal} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 shrink-0">
                <button onClick={closeAddUserModal} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back</button>
                <h2 className="ml-4 text-lg font-extrabold text-slate-800">Add User</h2>
              </div>
              <div className="p-6 md:p-8">
                {addUserStatus.text && <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${addUserStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>{addUserStatus.text}</div>}
                <form onSubmit={handleAddUser} className="space-y-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label><input type="text" value={newUserForm.username} onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email (Optional)</label><input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mobile Number (Optional)</label><input type="text" value={newUserForm.mobile_number} onChange={(e) => setNewUserForm({...newUserForm, mobile_number: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Assign Role</label><select value={newUserForm.role_id} onChange={(e) => setNewUserForm({...newUserForm, role_id: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all appearance-none cursor-pointer" required><option value="" disabled>Select a role...</option>{rolesList.map((role) => (<option key={role.id} value={role.id}>{role.role_name}</option>))}</select></div>
                  <div className="pt-4"><button type="submit" disabled={isAddingUser} className="w-full bg-blue-600 text-white font-bold h-12 shrink-0 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 text-base md:text-sm">{isAddingUser ? "Adding User..." : "Add User"}</button></div>
                </form>
              </div>
            </div>
          </div>
        )}

        {isEditUserOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm md:p-6 transition-all duration-300" onClick={closeEditUserModal}>
            <div className="bg-white md:bg-white/95 md:backdrop-blur-xl w-full h-full md:h-auto md:max-w-md md:rounded-2xl shadow-2xl flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-100 bg-transparent sticky top-0 z-10 shrink-0">
                <h2 className="text-xl font-extrabold text-slate-800">Edit User Profile</h2>
                <button onClick={closeEditUserModal} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 shrink-0">
                <button onClick={closeEditUserModal} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back</button>
                <h2 className="ml-4 text-lg font-extrabold text-slate-800">Edit User</h2>
              </div>
              <div className="p-6 md:p-8">
                {editUserStatus.text && <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${editUserStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>{editUserStatus.text}</div>}
                <form onSubmit={handleUpdateUser} className="space-y-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label><input type="text" value={editUserForm.username} onChange={(e) => setEditUserForm({...editUserForm, username: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email (Optional)</label><input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mobile Number (Optional)</label><input type="text" value={editUserForm.mobile_number} onChange={(e) => setEditUserForm({...editUserForm, mobile_number: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Assign Role</label><select value={editUserForm.role_id} onChange={(e) => setEditUserForm({...editUserForm, role_id: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all appearance-none cursor-pointer" required><option value="" disabled>Select role...</option>{rolesList.map((role) => (<option key={role.id} value={role.id}>{role.role_name}</option>))}</select></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Status</label><select value={editUserForm.user_status} onChange={(e) => setEditUserForm({...editUserForm, user_status: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all appearance-none cursor-pointer" required><option value="active">Active</option><option value="hold">Hold</option><option value="ban">Ban</option></select></div>
                  </div>
                  <div className="pt-4"><button type="submit" disabled={isUpdatingUser} className="w-full bg-blue-600 text-white font-bold h-12 shrink-0 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 text-base md:text-sm">{isUpdatingUser ? "Saving Changes..." : "Save Changes"}</button></div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeView === "settings_company" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm md:p-6 transition-all duration-300" onClick={closeCompanySettings}>
            <div className="bg-white md:bg-white/95 md:backdrop-blur-xl w-full h-full md:h-auto md:max-w-xl md:rounded-2xl shadow-2xl flex flex-col overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 shrink-0">
                <button onClick={closeCompanySettings} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back</button>
                <h2 className="ml-4 text-lg font-extrabold text-slate-800">Company Info</h2>
              </div>
              <div className="p-6 md:p-8">
                <div className="hidden md:block mb-6 border-b border-slate-100 pb-4"><h2 className="text-2xl font-bold text-slate-900">Company Settings</h2></div>
                {saveStatus.text && <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${saveStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>{saveStatus.text}</div>}
                <form onSubmit={handleSaveCompany} className="space-y-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Company Name</label><input type="text" value={editForm.company_name} onChange={(e) => setEditForm({...editForm, company_name: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Factory Address</label><input type="text" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Support Email</label><input type="email" value={editForm.support_email} onChange={(e) => setEditForm({...editForm, support_email: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Support Phone</label><input type="text" value={editForm.support_phone} onChange={(e) => setEditForm({...editForm, support_phone: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Logo URL</label><input type="text" value={editForm.logo_url} onChange={(e) => setEditForm({...editForm, logo_url: e.target.value})} className="w-full px-4 h-12 shrink-0 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
                  <div className="pt-6 flex flex-col md:flex-row gap-4">
                    <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white font-bold h-12 shrink-0 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 text-base md:text-sm">{isSaving ? "Saving..." : "Save Company Info"}</button>
                    <button type="button" onClick={closeCompanySettings} className="hidden md:block px-6 h-12 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/50 shadow-sm z-10 shrink-0">
          {activeView === "dashboard" && (
            <div className="py-2 px-4 text-center space-y-0.5 border-b border-slate-100 animate-fade-in">
              <p className="text-xs font-bold text-slate-700">{company.company_name}</p>
              {company.address && <p className="text-xs text-slate-500">{company.address}</p>}
              {company.support_email && <p className="text-xs text-slate-500">Support: {company.support_email} {company.support_phone && `| ${company.support_phone}`}</p>}
            </div>
          )}
          <footer className="h-9 flex justify-between items-center px-6 text-slate-500 font-mono text-[11px] tracking-wider">
            <span>v1.0.6 - Build: {process.env.NODE_ENV === 'production' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : 'Local-Dev'}</span>
            <span>{currentTime ? currentTime.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Initializing clock...'}</span>
          </footer>
        </div>

      </main>
    </div>
  );
}