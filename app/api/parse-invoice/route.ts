import { NextResponse } from 'next/server';

// --- 1. VERCEL SERVER POLYFILLS ---
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // --- 2. DYNAMIC LOAD ---
    const { PDFParse } = require('pdf-parse');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = (formData.get('company_name') as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const rawText = data.text || "";

    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }

    if (expectedCompany && !rawText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document. Please check your App Settings.` 
      }, { status: 400 });
    }

    // ==========================================
    // HYBRID EXTRACTION LOGIC
    // ==========================================

    // 1. EXTRACT INVOICE NUMBER
    const invoiceMatch = rawText.match(/Bill No\.\s*([A-Z0-9\/\-]+)/i);
    let invoiceNo = invoiceMatch ? invoiceMatch[1].trim() : "UNKNOWN";
    if (invoiceNo.toLowerCase() === "no" || invoiceNo.toLowerCase() === "unit") {
        const backupMatch = rawText.match(/(TI\/[0-9]{2}-[0-9]{2}\/[0-9]+)/i);
        invoiceNo = backupMatch ? backupMatch[1] : "UNKNOWN";
    }

    // 2. EXTRACT DATE
    const dateMatch = rawText.match(/Dated[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i) || rawText.match(/(\d{2}\/\d{2}\/\d{4})/);
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dateMatch && dateMatch[1]) {
      const [day, month, year] = dateMatch[1].split('/');
      formattedDate = `${year}-${month}-${day}`;
    }

    // 3. EXTRACT ACCOUNT
    const customerMatch = rawText.match(/M\/S\s+([^\r\n]+)/i);
    let mainAccount = customerMatch ? customerMatch[1].replace(/['"]/g, '').trim() : "Unknown Customer";

    // 4. EXTRACT TRANSPORT
    const transportMatch = rawText.match(/Transport:*\s*([^\r\n]+)/i);
    let transport = transportMatch ? transportMatch[1].replace(/[:'"]/g, '').trim() : "";

    // 5. EXTRACT GRAND TOTAL (The "Maximum Amount" Strategy)
    let amountVal = 0;
    
    // Step A: Remove commas so "2,25,887.00" becomes "225887.00"
    const noCommaText = rawText.replace(/,/g, ''); 
    
    // Step B: Find every single decimal number on the entire page
    const allAmounts = noCommaText.match(/\d+\.\d{2}/g); 
    
    // Step C: Convert them to actual numbers and pick the absolute highest one!
    if (allAmounts && allAmounts.length > 0) {
        // Convert the string array to a number array
        const numericAmounts = allAmounts.map(val => parseFloat(val));
        // Use JavaScript's Math.max to instantly find the highest value
        amountVal = Math.max(...numericAmounts);
    }

    // Construct the final data object for the database
    const invoiceData = {
      date: formattedDate, 
      invoice_no: invoiceNo,
      main_account: mainAccount,
      sub_account: null,
      num_of_cases: null, 
      packing_type: "Carton", 
      amount: amountVal,
      transport: transport,
      lr_number: null,
      lr_date: null
    };

    return NextResponse.json({ success: true, data: invoiceData, filename: file.name });

  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process the PDF document." 
    }, { status: 500 });
  }
}