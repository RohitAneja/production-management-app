import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(req: Request) {
  try {
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

    // 1. VERIFY COMPANY NAME
    // Check if the expected company name exists anywhere in the PDF text (case insensitive)
    if (!pdfText.toLowerCase().includes(expectedCompany.toLowerCase())) {
      return NextResponse.json({ 
        error: `Company Match Failed: Could not find '${expectedCompany}' in this document.` 
      }, { status: 400 });
    }

    // 2. EXTRACT DATA (Regex / Parsing Logic)
    // *NOTE*: Since every company's invoice layout is different, extracting exact fields 
    // using code requires complex Regex. For now, we simulate extraction with smart placeholders 
    // so you can see the flow. In a real enterprise app, you would plug OpenAI or Google Document AI here.
    
    const invoiceData = {
      date: new Date().toISOString().split('T')[0], 
      invoice_no: "INV-" + Math.floor(Math.random() * 90000 + 10000), // Simulated extraction
      main_account: "General Supplier",
      sub_account: "Raw Materials",
      num_of_cases: Math.floor(Math.random() * 50 + 1),
      packing_type: "Carton", // Must match your SQL Check constraint ('Carton', 'Small Carton', 'Bora', 'Tender')
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