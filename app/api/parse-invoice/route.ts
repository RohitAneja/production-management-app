import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. FIXED IMPORT: We use 'require' inside the function to bypass Vercel/Turbopack build errors
    const pdfParse = require('pdf-parse');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = formData.get('company_name') as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert the uploaded file into a buffer the PDF parser can read
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from the PDF
    const data = await pdfParse(buffer);
    const pdfText = data.text;

    // 2. VERIFY COMPANY NAME
    if (!pdfText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document.` 
      }, { status: 400 });
    }

    // 3. EXTRACT DATA (Simulated parsing placeholders)
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

  } catch (error) {
    console.error("PDF Parsing Error:", error);
    return NextResponse.json({ error: "Failed to process the PDF document." }, { status: 500 });
  }
}