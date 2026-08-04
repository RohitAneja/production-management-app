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

  // Invoice Upload States (PDF & Excel)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedInvoices, setScannedInvoices] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState({ type: "", text: "" });
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(true);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelStatus, setExcelStatus] = useState({ type: "", text: "" });

  // Invoice Register States
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Upload Builty States
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [builtyFile, setBuiltyFile] = useState<File | null>(null);
  const [isParsingBuilty, setIsParsingBuilty] = useState(false);
  const [builtyStatus, setBuiltyStatus] = useState({ type: "", text: "" });
  
  const [matchedInvoice, setMatchedInvoice] = useState<any | null>(null);
  const [showBuiltyConfirm, setShowBuiltyConfirm] = useState(false);
  const [showBuiltyEdit, setShowBuiltyEdit] = useState(false);
  const [builtyForm, setBuiltyForm] = useState({ lr_number: "", lr_date: "" });
  const [isSavingBuilty, setIsSavingBuilty] = useState(false);

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
      else if (selectedInvoice) setSelectedInvoice(null);
      else if (showBuiltyConfirm) setShowBuiltyConfirm(false);
      else if (showBuiltyEdit) setShowBuiltyEdit(false);
      else {
        if (e.state && e.state.view) setActiveView(e.state.view);
        else setActiveView("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAddUserOpen, isEditUserOpen, selectedInvoice, showBuiltyConfirm, showBuiltyEdit]);

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

  // ------------------------------------------
  // DATA FETCHING
  // ------------------------------------------
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

  const fetchAllInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false }); 
      if (error) throw error;
      if (data) setAllInvoices(data);
    } catch (error) { console.error("Error fetching invoice register:", error); }
    setIsLoadingInvoices(false);
  };

  const fetchPendingInvoices = async () => {
    setIsLoadingPending(true);
    try {
      const { data, error } = await supabase.from('invoices').select('*').or('lr_number.is.null,lr_number.eq.""').order('date', { ascending: false }); 
      if (error) throw error;
      if (data) setPendingInvoices(data);
    } catch (error) { console.error("Error fetching pending invoices:", error); }
    setIsLoadingPending(false);
  };

  useEffect(() => {
    if (activeView === "users") fetchUsersAndRoles();
    if (activeView === "invoice_register") { fetchAllInvoices(); setInvoiceSearchQuery(""); }
    if (activeView === "upload_builty") { fetchPendingInvoices(); setPendingSearchQuery(""); }
  }, [activeView]);

  // ------------------------------------------
  // DISPLAY FORMATTER HELPERS
  // ------------------------------------------

  const formatDisplayDate = (dbDate: any) => {
    if (!dbDate) return "";
    const strDate = String(dbDate);
    const parts = strDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    return strDate;
  };

  const formatDisplayInvoiceNo = (invNo: any) => {
    if (!invNo) return "";
    const strInv = String(invNo); 
    if (strInv.includes('/')) {
      const parts = strInv.split('/');
      return parts[parts.length - 1]; 
    }
    return strInv;
  };

  const formatIndianAmount = (amount: any) => {
    const num = Number(amount);
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
  };

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < 20 && !isUploadPanelOpen) setIsUploadPanelOpen(true);
    else if (scrollTop > 100 && isUploadPanelOpen && scannedInvoices.length > 0) setIsUploadPanelOpen(false);
  };

  // ==========================================
  // BULLETPROOF SEARCH & WHATSAPP HELPERS
  // ==========================================
  const safeSearch = (fieldValue: any, query: string) => {
    if (fieldValue === null || fieldValue === undefined) return false;
    return String(fieldValue).toLowerCase().includes(query.toLowerCase());
  };

  const shareOnWhatsApp = (inv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); 
    
    const partyName = inv.sub_account ? `${inv.sub_account} c/o ${inv.main_account}` : inv.main_account;
    const cases = inv.num_of_cases ? `${inv.num_of_cases} ${inv.packing_type}` : 'N/A';
    
    let text = `*Invoice Dispatch Details*\n\n`;
    text += `*Inv No:* ${formatDisplayInvoiceNo(inv.invoice_no)}\n`;
    text += `*Party:* ${partyName}\n`;
    text += `*Amount:* ₹${formatIndianAmount(inv.amount)}\n`;
    text += `*Cases:* ${cases}\n`;
    text += `*Transport:* ${inv.transport || 'N/A'}\n`;
    text += `*LR No:* ${inv.lr_number || 'Pending'}\n`;
    text += `*LR Date:* ${formatDisplayDate(inv.lr_date) || 'Pending'}\n`;
    
    if (inv.builty_image_url) {
      text += `\n*View Builty Photo:* ${inv.builty_image_url}`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredUsers = usersList.filter(user => {
    const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : user.roles?.role_name;
    return (safeSearch(user.username, searchQuery) || safeSearch(user.mobile_number, searchQuery) || safeSearch(roleName, searchQuery));
  });

  const filteredRegisterInvoices = allInvoices.filter(inv => {
    return (safeSearch(inv.invoice_no, invoiceSearchQuery) || safeSearch(inv.main_account, invoiceSearchQuery) || safeSearch(inv.sub_account, invoiceSearchQuery) || safeSearch(formatDisplayDate(inv.date), invoiceSearchQuery));
  });

  const filteredPendingInvoices = pendingInvoices.filter(inv => {
    return (safeSearch(inv.invoice_no, pendingSearchQuery) || safeSearch(inv.main_account, pendingSearchQuery) || safeSearch(inv.sub_account, pendingSearchQuery));
  });

  const totalRegisterAmount = filteredRegisterInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const casesBreakdown = filteredRegisterInvoices.reduce((acc, inv) => {
    if (inv.num_of_cases && inv.packing_type) {
      const pType = inv.packing_type;
      acc[pType] = (acc[pType] || 0) + Number(inv.num_of_cases);
    }
    return acc;
  }, {} as Record<string, number>);

  // ==========================================
  // CLIENT-SIDE BROWSER OCR (FIXED VERCEL CRASH)
  // ==========================================
  const handleBuiltyUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBuiltyFile(file);
      setIsParsingBuilty(true);
      setBuiltyStatus({ type: "info", text: "Analyzing Builty image natively on your device..." });

      try {
        // Use a more robust dynamic import that Webpack/Next.js prefers for client components
        const tesseractModule = await import('tesseract.js');
        const recognize = tesseractModule.recognize || tesseractModule.default?.recognize;

        if (!recognize) {
             throw new Error("OCR module failed to load properly.");
        }
        
        const pendingNos = pendingInvoices.map(inv => formatDisplayInvoiceNo(inv.invoice_no));

        // RUN AI DIRECTLY IN THE BROWSER (Lightning Fast, No Server Timeouts!)
        const { data: { text } } = await recognize(file, 'eng', {
            logger: m => console.log(m)
        });
        
        const rawText = text || "";
        console.log("Browser Scanned Text:", rawText);

        // Extract LR Number
        let extractedLrNumber = "";
        const grMatch = rawText.match(/G\.?R\.?\s*No[\.\s:-]*(\d+)/i) || rawText.match(/No[\.\s:-]*(\d{4,})/i);
        if (grMatch && grMatch[1]) {
          extractedLrNumber = grMatch[1].trim();
        }

        // Extract LR Date
        let extractedLrDate = new Date().toISOString().split('T')[0];
        const dateMatch = rawText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (dateMatch) {
          extractedLrDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; 
        }

        // Match with Pending List
        let matchedInvoiceNo = null;
        for (const pendingNo of pendingNos) {
          const exactMatchRegex = new RegExp(`\\b${pendingNo}\\b`, 'i');
          if (exactMatchRegex.test(rawText)) {
            matchedInvoiceNo = pendingNo;
            break;
          }
        }

        // Process Result
        if (matchedInvoiceNo) {
           const matched = pendingInvoices.find(i => formatDisplayInvoiceNo(i.invoice_no) === matchedInvoiceNo);
           if (matched) {
              setMatchedInvoice(matched);
              setBuiltyForm({ lr_number: extractedLrNumber, lr_date: extractedLrDate });
              setBuiltyStatus({ type: "", text: "" });
              setShowBuiltyConfirm(true); 
           } else {
              setBuiltyStatus({ type: "error", text: `Builty matched Invoice #${matchedInvoiceNo}, but it is not in the pending list.` });
           }
        } else {
           setBuiltyStatus({ type: "error", text: "Could not find any pending Invoice Number in this photo. Please retake the photo clearly." });
        }
      } catch (err: any) {
        console.error("OCR Catch Error:", err);
        setBuiltyStatus({ type: "error", text: "Image processing failed. Please ensure your browser supports this feature or try again." });
      }

      setIsParsingBuilty(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const confirmBuiltyMatch = () => {
    setShowBuiltyConfirm(false);
    setShowBuiltyEdit(true); 
  };

 const saveBuiltyToDatabase = async () => {
    // 1. Safety check: Ensure both the invoice and the file exist
    if (!matchedInvoice || !builtyFile) {
      setBuiltyStatus({ type: "error", text: "Missing invoice data or image file. Please try again." });
      return;
    }
    
    setIsSavingBuilty(true);
    setBuiltyStatus({ type: "info", text: "Uploading image to secure cloud storage..." });

    try {
       const fileExt = builtyFile.name.split('.').pop() || 'jpg';
       const safePartyName = matchedInvoice.main_account.replace(/[^a-zA-Z0-9]/g, '_');
       const fileName = `${formatDisplayInvoiceNo(matchedInvoice.invoice_no)}_${safePartyName}.${fileExt}`;

       const { data: storageData, error: storageErr } = await supabase.storage
         .from('builties')
         .upload(fileName, builtyFile, { upsert: true });

       if (storageErr) throw storageErr;
       
       const { data: publicUrlData } = supabase.storage.from('builties').getPublicUrl(fileName);
       const imageUrl = publicUrlData.publicUrl;

       const { error: dbErr } = await supabase.from('invoices').update({
           lr_number: builtyForm.lr_number || null,
           lr_date: builtyForm.lr_date || null,
           builty_image_url: imageUrl
       }).eq('invoice_no', matchedInvoice.invoice_no);

       if (dbErr) throw dbErr;

       // 2. BULLETPROOF LOCAL DOWNLOAD: Only attempt if URL.createObjectURL is supported and builtyFile is definitely a File/Blob
       try {
           if (typeof window.URL.createObjectURL === 'function' && builtyFile instanceof Blob) {
               const localUrl = window.URL.createObjectURL(builtyFile);
               const a = document.createElement("a");
               a.href = localUrl;
               a.download = fileName; 
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               
               // Clean up the URL object slightly later to ensure download starts on slow mobile browsers
               setTimeout(() => {
                   window.URL.revokeObjectURL(localUrl);
               }, 1000);
           }
       } catch (downloadErr) {
           console.warn("Local download skipped (Mobile Browser Restriction):", downloadErr);
           // We do not throw this error because the database save was successful!
       }

       setBuiltyStatus({ type: "success", text: "Builty securely uploaded and linked to Invoice!" });
       setTimeout(() => {
           setShowBuiltyEdit(false);
           setMatchedInvoice(null);
           setBuiltyFile(null);
           setBuiltyStatus({ type: "", text: "" });
           fetchPendingInvoices(); 
       }, 2000);

    } catch (err: any) {
       console.error("Save Error:", err);
       setBuiltyStatus({ type: "error", text: "Failed to save: " + (err.message || "Unknown Error") });
    }
    setIsSavingBuilty(false);
  };

  // ==========================================
  // FORM HANDLERS (Users & Settings)
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
    setIsUploadPanelOpen(false); 
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
    { name: "Production", id: "production", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
    { name: "Reports", id: "reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
  ];

  if (userRole && userRole.trim().toUpperCase() === "ADMIN") {
    const invMenu = menuOptions.find(m => m.id === "invoices_parent");
    if (invMenu && invMenu.children && !invMenu.children.some(c => c.id === 'invoice_register')) {
      invMenu.children.push({
        name: "Invoice Register",
        id: "invoice_register",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      });
    }

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

          {/* ========================================================= */}
          {/* UPLOAD INVOICES VIEW */}
          {/* ========================================================= */}
          {activeView === "upload_invoices" && (
            <div className="flex-1 flex flex-col bg-white md:bg-white/95 md:backdrop-blur-xl rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border md:border-white overflow-hidden animate-fade-in relative">
              <div className="flex-1 overflow-y-auto pb-12" onScroll={handleMainScroll}>
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
                <div className={`transition-all duration-500 origin-top overflow-hidden ${isUploadPanelOpen ? 'max-h-[1200px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}>
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-slate-100">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">1. AI PDF Scanner</h3>
                      <p className="text-xs text-slate-500 mb-5">Select single or multiple PDF invoices. The system matches your company name and extracts data automatically.</p>
                      <input type="file" accept="application/pdf" multiple ref={fileInputRef} onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors mb-4" />
                      <div className="mt-auto pt-2">
                        <button onClick={scanInvoices} disabled={selectedFiles.length === 0 || isScanning || isProcessingExcel} className="w-full bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors disabled:opacity-50">
                          {isScanning && scannedInvoices.length === 0 ? "Scanning PDFs..." : "Scan PDF Files"}
                        </button>
                      </div>
                      {uploadStatus.text && (
                        <div className={`mt-4 p-3 rounded-xl text-xs font-semibold border ${uploadStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : uploadStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"}`}>
                          {uploadStatus.text}
                        </div>
                      )}
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 flex flex-col">
                      <h3 className="text-lg font-bold text-emerald-800 mb-1">2. Bulk Excel Sync</h3>
                      <p className="text-xs text-emerald-600/80 mb-5">Upload an Excel/CSV file containing Columns: <span className="font-bold text-emerald-700">Invoice No, Date, Main Account, Sub Account, Num of Cases, Packing Type, Amount, Transport, LR Number, LR Date</span>.</p>
                      <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" ref={excelInputRef} onChange={handleExcelFileChange} className="block w-full text-sm text-emerald-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 transition-colors mb-4" />
                      <div className="mt-auto pt-2">
                        <button onClick={processExcelUpload} disabled={!excelFile || isProcessingExcel || isScanning} className="w-full bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50">
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

                {scannedInvoices.length > 0 && (
                  <div id="preview-section" className="p-4 md:p-6 bg-slate-50/50 min-h-[600px]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Scanned Results Preview</h3>
                        <p className="text-sm text-slate-500">Verify the extracted data below before saving.</p>
                      </div>
                      <button onClick={saveInvoicesToDatabase} disabled={isScanning} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        {isScanning ? "Saving..." : "Confirm & Save to Database"}
                      </button>
                    </div>

                    <div className="md:hidden flex flex-col gap-4">
                      {scannedInvoices.map((inv, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-900">{formatDisplayInvoiceNo(inv.invoice_no)}</span>
                            <span className="text-sm font-bold text-emerald-600">₹{formatIndianAmount(inv.amount)}</span>
                          </div>
                          <div className="mb-2">
                            {inv.sub_account ? (
                              <>
                                <span className="font-bold text-slate-900 text-sm block">{inv.sub_account}</span>
                                <span className="text-xs text-slate-500 font-semibold">c/o {inv.main_account}</span>
                              </>
                            ) : (
                              <span className="font-semibold text-slate-900 text-sm">{inv.main_account}</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-xs mb-3">
                            <span className="text-slate-500 font-mono">{formatDisplayDate(inv.date)}</span>
                            {inv.num_of_cases ? (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {inv.num_of_cases} {inv.packing_type}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-2">
                            <span className="truncate max-w-[150px]">{inv.source_file}</span>
                            <span className="truncate max-w-[120px]">{inv.transport || "No Transport"}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
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

          {/* ========================================================= */}
          {/* UPLOAD BUILTY VIEW */}
          {/* ========================================================= */}
          {activeView === "upload_builty" && (
            <div className="flex-1 flex flex-col bg-white md:bg-white/95 md:backdrop-blur-xl rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border md:border-white overflow-hidden animate-fade-in relative">
              <div className="flex-1 flex flex-col h-full relative">
                
                <div className="p-4 md:p-6 border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Upload Builty</h2>
                    <p className="text-sm text-slate-500 hidden md:block">Invoices awaiting LR Number & Date integration.</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      <input 
                        type="text" 
                        placeholder="Search pending..." 
                        value={pendingSearchQuery} 
                        onChange={(e) => setPendingSearchQuery(e.target.value)} 
                        className="w-full pl-9 pr-4 h-11 shrink-0 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" 
                      />
                    </div>
                    
                    {/* CAMERA AND GALLERY BUTTONS */}
                    <div className="flex items-center gap-2">
                        {/* Hidden Input for Camera */}
                        <input 
                           type="file" 
                           accept="image/*" 
                           capture="environment" 
                           className="hidden" 
                           ref={cameraInputRef} 
                           onChange={handleBuiltyUploadChange}
                        />
                        {/* Hidden Input for Gallery */}
                        <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={galleryInputRef} 
                           onChange={handleBuiltyUploadChange}
                        />
                        
                        <button 
                           onClick={() => cameraInputRef.current?.click()}
                           disabled={isParsingBuilty}
                           className="flex-1 md:flex-none justify-center bg-blue-600 text-white px-3 md:px-4 h-11 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          <span>{isParsingBuilty ? "Wait..." : "Camera"}</span>
                        </button>
                        
                        <button 
                           onClick={() => galleryInputRef.current?.click()}
                           disabled={isParsingBuilty}
                           className="flex-1 md:flex-none justify-center bg-slate-100 text-slate-700 border border-slate-200 px-3 md:px-4 h-11 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          <span>{isParsingBuilty ? "Wait..." : "Gallery"}</span>
                        </button>
                    </div>
                  </div>
                </div>
                
                {builtyStatus.text && (
                  <div className="px-4 md:px-6 pt-4">
                    <div className={`p-4 rounded-xl text-sm font-semibold border ${builtyStatus.type === "error" ? "bg-red-50 text-red-700 border-red-100" : builtyStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"}`}>
                      {builtyStatus.text}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-0 md:p-6 pt-4 md:pt-4">
                  {isLoadingPending ? (
                    <div className="flex justify-center items-center h-full min-h-[400px]">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden flex flex-col divide-y divide-slate-100">
                        {filteredPendingInvoices.map((inv) => (
                          <div key={inv.invoice_no} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-slate-900">{formatDisplayInvoiceNo(inv.invoice_no)}</span>
                              <span className="text-sm font-bold text-slate-400 font-mono">{formatDisplayDate(inv.date)}</span>
                            </div>
                            <div className="mb-2">
                              {inv.sub_account ? (
                                <>
                                  <span className="font-bold text-slate-900 text-sm block">{inv.sub_account}</span>
                                  <span className="text-xs text-slate-500 font-semibold">c/o {inv.main_account}</span>
                                </>
                              ) : (
                                <span className="font-semibold text-slate-900 text-sm">{inv.main_account}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-xs mt-3 border-t border-slate-50 pt-2">
                               <span className="font-bold text-slate-500 uppercase">{inv.transport || "No Transport"}</span>
                              {inv.num_of_cases ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  {inv.num_of_cases} {inv.packing_type}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {filteredPendingInvoices.length === 0 && (
                          <div className="p-8 text-center text-slate-400 text-sm font-medium">No pending invoices. Great job!</div>
                        )}
                      </div>

                      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-600 text-xs uppercase tracking-wider font-bold">
                              <th className="p-4 pl-6 w-[15%]">Inv No</th>
                              <th className="p-4 w-[15%]">Date</th>
                              <th className="p-4 w-[35%]">Account</th>
                              <th className="p-4 w-[20%]">Transport</th>
                              <th className="p-4 w-[15%] text-right pr-6">Cases</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredPendingInvoices.map((inv) => (
                              <tr key={inv.invoice_no} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 pl-6 text-sm font-bold text-slate-900">
                                  {formatDisplayInvoiceNo(inv.invoice_no)}
                                </td>
                                <td className="p-4 text-sm text-slate-600 font-mono tracking-tight">
                                  {formatDisplayDate(inv.date)}
                                </td>
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
                                <td className="p-4 text-sm font-semibold text-slate-500">
                                  {inv.transport || "—"}
                                </td>
                                <td className="p-4 pr-6 text-sm text-right">
                                  {inv.num_of_cases ? (
                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 inline-block">
                                      {inv.num_of_cases} {inv.packing_type}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {filteredPendingInvoices.length === 0 && (
                              <tr><td colSpan={5} className="p-12 text-center text-emerald-600 font-bold bg-emerald-50/50">All caught up! No invoices are pending LR details.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* ========================================================= */}
          {/* INVOICE REGISTER VIEW */}
          {/* ========================================================= */}
          {activeView === "invoice_register" && (
            <div className="flex-1 flex flex-col bg-white md:bg-white/95 md:backdrop-blur-xl rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border md:border-white overflow-hidden animate-fade-in relative">
              <div className="flex-1 flex flex-col h-full relative">
                
                {/* Header & Search Bar */}
                <div className="p-4 md:p-6 border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Invoice Register</h2>
                    <p className="text-sm text-slate-500 hidden md:block">Comprehensive view of all processed invoices.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input 
                      type="text" 
                      placeholder="Search by Date, Account, or Inv No..." 
                      value={invoiceSearchQuery} 
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)} 
                      className="w-full pl-9 pr-4 h-11 shrink-0 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" 
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {isLoadingInvoices ? (
                    <div className="flex justify-center items-center h-full min-h-[400px]">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {/* MOBILE CARD VIEW FOR INVOICE REGISTER */}
                      <div className="md:hidden flex flex-col divide-y divide-slate-100">
                        {filteredRegisterInvoices.map((inv) => (
                          <div key={inv.invoice_no} onClick={() => setSelectedInvoice(inv)} className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-slate-900">{formatDisplayInvoiceNo(inv.invoice_no)}</span>
                              <span className="text-sm font-bold text-emerald-600">₹{formatIndianAmount(inv.amount)}</span>
                            </div>
                            <div className="mb-2">
                              {inv.sub_account ? (
                                <>
                                  <span className="font-bold text-slate-900 text-sm block">{inv.sub_account}</span>
                                  <span className="text-xs text-slate-500 font-semibold">c/o {inv.main_account}</span>
                                </>
                              ) : (
                                <span className="font-semibold text-slate-900 text-sm">{inv.main_account}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-mono">{formatDisplayDate(inv.date)}</span>
                              {inv.num_of_cases ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  {inv.num_of_cases} {inv.packing_type}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                            
                            {/* ACTION BUTTONS (MOBILE) */}
                            <div className="mt-4 flex gap-2 w-full">
                               {inv.builty_image_url && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); window.open(inv.builty_image_url, "_blank"); }}
                                     className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                   >
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                     View Builty
                                   </button>
                               )}
                               <button 
                                 onClick={(e) => shareOnWhatsApp(inv, e)}
                                 className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366]/10 text-[#128C7E] rounded-lg text-xs font-bold border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-colors"
                               >
                                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                 Share
                               </button>
                            </div>
                          </div>
                        ))}
                        {filteredRegisterInvoices.length === 0 && (
                          <div className="p-8 text-center text-slate-400 text-sm font-medium">No invoices found matching your criteria.</div>
                        )}
                      </div>

                      {/* DESKTOP TABLE VIEW FOR INVOICE REGISTER */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                            <tr className="text-slate-600 text-xs uppercase tracking-wider font-bold">
                              <th className="p-4 pl-6 w-[15%]">Inv No</th>
                              <th className="p-4 w-[15%]">Date</th>
                              <th className="p-4 w-[35%]">Account</th>
                              <th className="p-4 w-[10%]">Cases</th>
                              <th className="p-4 w-[15%] text-right">Amount</th>
                              <th className="p-4 w-[10%] text-center pr-6">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRegisterInvoices.map((inv) => (
                              <tr 
                                key={inv.invoice_no} 
                                onClick={() => setSelectedInvoice(inv)}
                                className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                              >
                                <td className="p-4 pl-6 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {formatDisplayInvoiceNo(inv.invoice_no)}
                                </td>
                                <td className="p-4 text-sm text-slate-600 font-mono tracking-tight">
                                  {formatDisplayDate(inv.date)}
                                </td>
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
                                <td className="p-4 text-sm font-bold text-emerald-600 text-right">
                                  ₹{formatIndianAmount(inv.amount)}
                                </td>
                                
                                {/* ACTIONS COLUMN (DESKTOP) */}
                                <td className="p-4 pr-6 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={(e) => shareOnWhatsApp(inv, e)}
                                      className="text-[#128C7E] hover:text-[#075E54] p-2 rounded-lg hover:bg-[#25D366]/10 transition-colors"
                                      title="Share on WhatsApp"
                                    >
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                    </button>
                                    
                                    {inv.builty_image_url ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); window.open(inv.builty_image_url, "_blank"); }}
                                        className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                                        title="View Builty Photo"
                                      >
                                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                      </button>
                                    ) : (
                                      <div className="w-9 h-9" />
                                    )}
                                  </div>
                                </td>
                                
                              </tr>
                            ))}
                            {filteredRegisterInvoices.length === 0 && (
                              <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No invoices found matching your criteria.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Sticky Summary Footer */}
                <div className="bg-slate-800 text-white p-4 md:p-5 sticky bottom-0 z-20 flex flex-col md:flex-row justify-between items-center shrink-0 border-t border-slate-700">
                  <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm font-medium mb-3 md:mb-0">
                    <span className="text-slate-400 uppercase tracking-widest text-xs font-bold hidden md:inline">Totals Summary</span>
                    {Object.entries(casesBreakdown).map(([type, count]: [string, any]) => (
                      <span key={type} className="bg-slate-700/50 border border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                        <span className="font-bold text-white text-base">{String(count)}</span>
                        <span className="text-slate-300 capitalize">{type}</span>
                      </span>
                    ))}
                    {Object.keys(casesBreakdown).length === 0 && <span className="text-slate-500 italic">No packing data</span>}
                  </div>
                  <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-xl w-full md:w-auto justify-between md:justify-end">
                    <span className="text-emerald-400/80 text-xs uppercase tracking-wider font-bold">Grand Total</span>
                    <span className="text-xl md:text-2xl font-black text-emerald-400 tracking-tight">₹{formatIndianAmount(totalRegisterAmount)}</span>
                  </div>
                </div>

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

          {/* BACKGROUND PLACEHOLDER */}
          {activeView !== "users" && activeView !== "settings_company" && activeView !== "upload_invoices" && activeView !== "invoice_register" && activeView !== "upload_builty" && (
             <div className="flex-1 flex justify-center items-center">
               <h2 className="text-2xl font-bold text-slate-400/70 animate-pulse text-center px-4">
                 {activeView !== "dashboard" ? `${activeView.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} (Coming Soon)` : ""}
               </h2>
             </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODALS */}
        {/* ========================================================= */}

        {/* 1. BUILTY MATCH CONFIRMATION MODAL */}
        {showBuiltyConfirm && matchedInvoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-blue-600 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-xl font-bold text-white">Builty Match Found!</h2>
                <p className="text-blue-100 text-sm mt-1">We found a pending invoice that perfectly matches this builty.</p>
              </div>
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between"><span className="text-slate-500 font-medium">Invoice No:</span> <span className="font-bold text-slate-900">{formatDisplayInvoiceNo(matchedInvoice.invoice_no)}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500 font-medium">Party Name:</span> <span className="font-bold text-slate-900 truncate max-w-[200px] text-right">{matchedInvoice.sub_account || matchedInvoice.main_account}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500 font-medium">Transport:</span> <span className="font-bold text-slate-900">{matchedInvoice.transport || "N/A"}</span></div>
                   <div className="flex justify-between"><span className="text-slate-500 font-medium">Packing/Cases:</span> <span className="font-bold text-slate-900">{matchedInvoice.num_of_cases ? `${matchedInvoice.num_of_cases} ${matchedInvoice.packing_type}` : "N/A"}</span></div>
                </div>
              </div>
              <div className="p-5 flex gap-3">
                <button onClick={() => setShowBuiltyConfirm(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={confirmBuiltyMatch} className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-colors">Yes, Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* 2. BUILTY LR EDIT & SAVE MODAL */}
        {showBuiltyEdit && matchedInvoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h2 className="text-lg font-bold text-slate-900">Update LR Details</h2>
                    <p className="text-xs text-slate-500">Invoice: {formatDisplayInvoiceNo(matchedInvoice.invoice_no)}</p>
                 </div>
                 <button onClick={() => setShowBuiltyEdit(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              <div className="p-6 space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">LR Number (GR No.)</label>
                    <input type="text" value={builtyForm.lr_number} onChange={(e) => setBuiltyForm({...builtyForm, lr_number: e.target.value})} className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900" placeholder="e.g. 2195" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">LR Date</label>
                    <input type="date" value={builtyForm.lr_date} onChange={(e) => setBuiltyForm({...builtyForm, lr_date: e.target.value})} className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900" />
                 </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50">
                 <button onClick={saveBuiltyToDatabase} disabled={isSavingBuilty} className="w-full px-4 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-50">
                    {isSavingBuilty ? "Saving Image & Details..." : "Save Builty & Update Invoice"}
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. SINGLE INVOICE DETAILS MODAL */}
        {selectedInvoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm md:p-6 transition-all duration-300 animate-fade-in" onClick={() => setSelectedInvoice(null)}>
            <div className="bg-white md:bg-white/95 md:backdrop-blur-xl w-full h-full md:h-auto md:max-w-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50 md:bg-transparent sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Invoice {formatDisplayInvoiceNo(selectedInvoice.invoice_no)}</h2>
                    <p className="text-xs font-mono text-slate-500">{selectedInvoice.invoice_no}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              
              <div className="p-6 md:p-8 space-y-8">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Account Details</p>
                    {selectedInvoice.sub_account ? (
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{selectedInvoice.sub_account}</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">c/o <span className="text-slate-700">{selectedInvoice.main_account}</span></p>
                      </div>
                    ) : (
                      <h3 className="text-lg font-black text-slate-900">{selectedInvoice.main_account}</h3>
                    )}
                  </div>
                  
                  {/* MODAL ACTIONS: WhatsApp & View Builty */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                       onClick={(e) => shareOnWhatsApp(selectedInvoice, e)}
                       className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#128C7E] font-bold border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-colors text-sm"
                    >
                       <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                       Share
                    </button>
                    {selectedInvoice.builty_image_url && (
                      <button 
                         onClick={() => window.open(selectedInvoice.builty_image_url, "_blank")}
                         className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors text-sm"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                         View Builty
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</span>
                    <span className="text-base font-bold text-slate-800 font-mono">{formatDisplayDate(selectedInvoice.date)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</span>
                    <span className="text-base font-black text-emerald-600">₹{formatIndianAmount(selectedInvoice.amount)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Packing/Cases</span>
                    {selectedInvoice.num_of_cases ? (
                      <span className="inline-block text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                        {selectedInvoice.num_of_cases} {selectedInvoice.packing_type}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transport</span>
                    <span className="text-sm font-semibold text-slate-700">{selectedInvoice.transport || "—"}</span>
                  </div>
                  <div className="col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">LR Number (GR No.)</span>
                    <span className="text-lg font-black text-emerald-900">{selectedInvoice.lr_number || "Pending"}</span>
                  </div>
                  <div className="col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">LR Date</span>
                    <span className="text-lg font-bold text-emerald-900">{formatDisplayDate(selectedInvoice.lr_date) || "Pending"}</span>
                  </div>
                </div>

              </div>
              <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button onClick={() => setSelectedInvoice(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm shadow-sm">Close Window</button>
              </div>
            </div>
          </div>
        )}

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