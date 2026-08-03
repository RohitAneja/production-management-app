import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

// --- VERCEL SERVER POLYFILLS ---
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expectedCompany = (formData.get('company_name') as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Initialize the class and extract the text
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
    // [^\w]* skips any random spaces or dots between "Bill No" and the actual alphanumeric ID
    const invoiceNoMatch = pdfText.match(/Bill No\.[^\w]*([A-Z0-9\/\-]+)/i);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].trim() : "UNKNOWN";

    // 2. Extract Date
    // [^\d]* skips any hidden line breaks or spaces until it hits the exact DD/MM/YYYY format
    const dateMatch = pdfText.match(/Dated[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
    let formattedDate = new Date().toISOString().split('T')[0]; // Default to today
    if (dateMatch && dateMatch[1]) {
      const [day, month, year] = dateMatch[1].split('/');
      formattedDate = `${year}-${month}-${day}`;
    }

    // 3. Extract Customer Name (Main Account)
    // [^"\r\n]+ grabs everything until the line ends or it hits a hidden quote mark
    const customerMatch = pdfText.match(/M\/S\s+([^"\r\n]+)/i);
    const mainAccount = customerMatch ? customerMatch[1].trim() : "Unknown Customer";

    // 4. Extract Transport
    const transportMatch = pdfText.match(/Transport:+\s*([^"\r\n]+)/i);
    const transport = transportMatch ? transportMatch[1].trim() : null;

    // 5. Extract Grand Total Amount 
    // [^\d]* ignores the " (Rs.)" text, newlines, and quotes, jumping straight to the exact decimal value
    const amountMatch = pdfText.match(/Grand Total[^\d]*([\d,]+\.\d{2})/i);
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