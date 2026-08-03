import { NextResponse } from 'next/server';

// --- 1. VERCEL SERVER POLYFILLS ---
// These MUST run before the PDF library is loaded!
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

// Prevents Vercel from timing out the heavy PDF extraction
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // --- 2. DYNAMIC LOAD ---
    // We load the library INSIDE the function to bypass Next.js import hoisting.
    const { PDFParse } = require('pdf-parse');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = (formData.get('company_name') as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Initialize the PDF class and extract the text
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const rawText = data.text || "";

    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }

    // VERIFY COMPANY NAME
    if (expectedCompany && !rawText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document. Please check your App Settings.` 
      }, { status: 400 });
    }

    // ==========================================
    // THE "SANITIZE FIRST" EXTRACTION METHOD
    // ==========================================
    
    // Remove all hidden quotation marks that break regex searches
    const cleanText = rawText.replace(/"/g, '');
    
    // Create a version with NO commas so amount parsing is flawless
    const noCommaText = cleanText.replace(/,/g, '');

    // 1. Extract Invoice Number
    const invoiceNoMatch = cleanText.match(/(?:Bill|Invoice)\s*No[\.\s:]+([A-Z0-9\/\-]+)/i);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].trim() : "UNKNOWN";

    // 2. Extract Date
    const dateMatch = cleanText.match(/(?:Date|Dated)[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
    let formattedDate = new Date().toISOString().split('T')[0]; 
    if (dateMatch && dateMatch[1]) {
      const [day, month, year] = dateMatch[1].split('/');
      formattedDate = `${year}-${month}-${day}`;
    }

    // 3. Extract Customer Name (Main Account)
    const customerMatch = cleanText.match(/M\/S\s+([^\r\n]+)/i);
    const mainAccount = customerMatch ? customerMatch[1].trim() : "Unknown Customer";

    // 4. Extract Transport
    const transportMatch = cleanText.match(/Transport[:\s]+([^\r\n]+)/i);
    const transport = transportMatch ? transportMatch[1].trim() : null;

    // 5. Extract Grand Total Amount 
    const amountMatch = noCommaText.match(/Grand Total[^\d]*(\d+\.\d{2})/i);
    let amountVal = 0;
    if (amountMatch && amountMatch[1]) {
      amountVal = parseFloat(amountMatch[1]);
    } else {
       // Fallback: If "Grand Total" isn't found, find the absolute last "Total" number on the page
       const backupMatch = noCommaText.match(/Total[^\d]*(\d+\.\d{2})(?![\s\S]*\d+\.\d{2})/i);
       if (backupMatch && backupMatch[1]) amountVal = parseFloat(backupMatch[1]);
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