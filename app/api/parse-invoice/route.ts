import { NextResponse } from 'next/server';

// --- 1. VERCEL SERVER POLYFILLS ---
// These are placed at the very top and execute immediately.
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

export async function POST(req: Request) {
  try {
    // --- 2. DYNAMIC LOAD ---
    // We load the library INSIDE the function to bypass Next.js import hoisting.
    // This guarantees the polyfills above run BEFORE the library is evaluated.
    const { PDFParse } = require('pdf-parse');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = (formData.get('company_name') as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Initialize the Version 2 class and extract the text
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const pdfText = data.text || "";

    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }

    // VERIFY COMPANY NAME
    if (expectedCompany && !pdfText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document. Please check your App Settings.` 
      }, { status: 400 });
    }

    // ==========================================
    // HYPER-PRECISE DATA EXTRACTION
    // ==========================================
    
    // 1. Extract Invoice Number
    const invoiceNoMatch = pdfText.match(/Bill\s*No[\.\s]*([A-Za-z0-9\/\-]+)/i);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].replace(/"/g, '').trim() : "UNKNOWN";

    // 2. Extract Date
    const dateMatch = pdfText.match(/Dated[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dateMatch && dateMatch[1]) {
      const [day, month, year] = dateMatch[1].split('/');
      formattedDate = `${year}-${month}-${day}`;
    }

    // 3. Extract Customer Name (Main Account)
    const customerMatch = pdfText.match(/M\/S\s+([^"\r\n]+)/i);
    const mainAccount = customerMatch ? customerMatch[1].replace(/"/g, '').trim() : "Unknown Customer";

    // 4. Extract Transport
    const transportMatch = pdfText.match(/Transport:+\s*([^"\r\n]+)/i);
    const transport = transportMatch ? transportMatch[1].replace(/"/g, '').trim() : "Unknown Transport";

    // 5. Extract Grand Total Amount 
    const amountMatch = pdfText.match(/Grand Total[\s\S]*?([\d,]+\.\d{2})/i);
    let amountVal = 0;
    if (amountMatch && amountMatch[1]) {
      amountVal = parseFloat(amountMatch[1].replace(/,/g, ''));
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