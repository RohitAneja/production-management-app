import { NextResponse } from 'next/server';

// --- VERCEL SERVER POLYFILLS ---
// The PDF parser expects a web browser environment. We must create dummy versions
// of these browser objects so Vercel's Node.js server doesn't crash during the build.
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

// Now we can safely load the library without it crashing the Vercel build
const pdfParse = require('pdf-parse');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = (formData.get('company_name') as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert the uploaded file into a buffer the PDF parser can read
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from the PDF
    const data = await pdfParse(buffer);
    const pdfText = data.text || "";

    // VERIFY COMPANY NAME
    if (expectedCompany && !pdfText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document. Please check your App Settings.` 
      }, { status: 400 });
    }

    // EXTRACT DATA (Simulated parsing placeholders)
    const invoiceData = {
      date: new Date().toISOString().split('T')[0], 
      invoice_no: "INV-" + Math.floor(Math.random() * 90000 + 10000),
      main_account: "General Supplier",
      sub_account: "Raw Materials",
      num_of_cases: Math.floor(Math.random() * 50 + 1),
      packing_type: "Carton", 
      amount: parseFloat((Math.random() * 50000).toFixed(2)),
      transport: "FastTrack Logistics",
      lr_number: "LR-" + Math.floor(Math.random() * 900000),
      lr_date: new Date().toISOString().split('T')[0]
    };

    return NextResponse.json({ success: true, data: invoiceData, filename: file.name });

  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process the PDF document." 
    }, { status: 500 });
  }
}