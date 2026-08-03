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
    // AI-SIMULATION "ANCHOR CHUNKING" PARSER
    // ==========================================
    // This explicitly mimics human/AI reading behavior. Find the keyword, 
    // grab the next 150 characters, and extract the expected shape.

    const getChunkAfter = (keyword: string) => {
      const idx = rawText.toLowerCase().indexOf(keyword.toLowerCase());
      return idx !== -1 ? rawText.substring(idx + keyword.length, idx + keyword.length + 150) : "";
    };

    // 1. EXTRACT INVOICE NUMBER
    let invoiceNo = "UNKNOWN";
    const billChunk = getChunkAfter("bill no");
    // Grabs the first real sequence of letters, numbers, slashes, or dashes
    const billMatch = billChunk.match(/([A-Z0-9][A-Z0-9\/\-]+)/i);
    if (billMatch) invoiceNo = billMatch[1];

    // 2. EXTRACT DATE
    let formattedDate = new Date().toISOString().split('T')[0];
    const dateChunk = getChunkAfter("dated");
    // Strictly looks for DD/MM/YYYY in the chunk following the word "Dated"
    const dateMatch = dateChunk.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      // Reformat to YYYY-MM-DD for SQL
      formattedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // 3. EXTRACT ACCOUNT
    let mainAccount = "Unknown Customer";
    const msChunk = getChunkAfter("m/s");
    if (msChunk) {
      // Strips leading colons/spaces/quotes, grabs everything until the first line break
      mainAccount = msChunk.replace(/^[\s":\.]+/, '').split(/[\r\n]+/)[0].trim();
    }

    // 4. EXTRACT TRANSPORT (Fixes the unnecessary '::')
    let transport: string | null = null;
    const transChunk = getChunkAfter("transport");
    if (transChunk) {
       // Strips leading colons/spaces/quotes, grabs everything until the first line break
       transport = transChunk.replace(/^[\s":\.]+/, '').split(/[\r\n]+/)[0].trim();
    }

    // 5. EXTRACT GRAND TOTAL (Exactly as requested!)
    let amountVal = 0;
    const grandTotalChunk = getChunkAfter("grand total");
    // Ignores all words, parentheses, and spaces to grab the first comma-separated decimal
    const amountMatch = grandTotalChunk.match(/([\d,]+\.\d{2})/);
    if (amountMatch) {
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