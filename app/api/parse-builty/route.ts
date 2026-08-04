import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export const maxDuration = 60; // Gives Vercel extra time to read the image

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const pendingInvoicesStr = formData.get('pending_invoices') as string;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No image uploaded" }, { status: 400 });
    }

    let pendingInvoices: string[] = [];
    try {
      if (pendingInvoicesStr) pendingInvoices = JSON.parse(pendingInvoicesStr);
    } catch (e) {}

    // 1. Convert Image to Buffer for the AI to read
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. RUN REAL OCR TO READ THE PHOTO
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    const rawText = text || "";
    
    console.log("Scanned Text from Photo:", rawText);

    // 3. EXTRACT GR NO. (LR NUMBER)
    let lrNumber = "";
    const grMatch = rawText.match(/G\.?R\.?\s*No[\.\s:-]*(\d+)/i) || rawText.match(/No[\.\s:-]*(\d{4,})/i);
    if (grMatch && grMatch[1]) {
      lrNumber = grMatch[1].trim();
    }

    // 4. EXTRACT DATE
    let lrDate = new Date().toISOString().split('T')[0];
    const dateMatch = rawText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dateMatch) {
      lrDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; 
    }

    // 5. STRICT MATCHING LOGIC (No Dummy Fallbacks!)
    let matchedInvoiceNo = null;
    
    for (const pendingNo of pendingInvoices) {
      // Looks for the exact invoice number (e.g., "1515") in the scanned text
      const exactMatchRegex = new RegExp(`\\b${pendingNo}\\b`, 'i');
      if (exactMatchRegex.test(rawText)) {
        matchedInvoiceNo = pendingNo;
        break;
      }
    }

    // If it didn't find the exact pending number, REJECT THE PHOTO
    if (!matchedInvoiceNo) {
        return NextResponse.json({ 
            success: false, 
            error: "Could not find any pending Invoice Number in this photo. Are you sure it's the correct Builty?" 
        });
    }

    // If it found a real match, send the data back to the UI!
    return NextResponse.json({ 
        success: true, 
        matched_invoice_no: matchedInvoiceNo,
        lr_number: lrNumber,
        lr_date: lrDate
    });

  } catch (error: any) {
    console.error("Builty Parsing Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to read the image. Please ensure the photo is clear and well-lit." 
    }, { status: 500 });
  }
}