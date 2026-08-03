import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export const maxDuration = 60; // Allow Vercel more time for image processing

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const pendingInvoicesStr = formData.get('pending_invoices') as string;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No image uploaded" }, { status: 400 });
    }

    // Safely parse the list of pending invoice numbers sent from the frontend
    let pendingInvoices: string[] = [];
    try {
      if (pendingInvoicesStr) pendingInvoices = JSON.parse(pendingInvoicesStr);
    } catch (e) {
      console.error("Failed to parse pending invoices array");
    }

    // 1. Convert Image to Buffer for Tesseract
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Run OCR (Optical Character Recognition)
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
      logger: m => console.log(m) // Optional: logs progress in your Vercel terminal
    });

    const rawText = text || "";
    console.log("Extracted OCR Text:", rawText);

    // 3. EXTRACT GR NO. (LR NUMBER)
    // Looks for "GR No", "G.R. No", etc., and grabs the numbers right after it
    let lrNumber = "";
    const grMatch = rawText.match(/G\.?R\.?\s*No[\.\s:-]*(\d+)/i) || rawText.match(/No[\.\s:-]*(\d{4,})/i);
    if (grMatch && grMatch[1]) {
      lrNumber = grMatch[1].trim();
    }

    // 4. EXTRACT DATE
    // Looks for standard Indian dates (DD-MM-YYYY or DD/MM/YYYY)
    let lrDate = new Date().toISOString().split('T')[0];
    const dateMatch = rawText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dateMatch) {
      lrDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; // Convert to YYYY-MM-DD for database
    }

    // 5. MATCH WITH PENDING INVOICES
    // We look at the extracted text to see if any of our pending invoice numbers (e.g., '1515') are printed on it
    let matchedInvoiceNo = null;
    
    // First, try to find a direct match from the pending list
    for (const pendingNo of pendingInvoices) {
      // Create a regex to find the exact invoice number as a standalone word/number
      const exactMatchRegex = new RegExp(`\\b${pendingNo}\\b`, 'i');
      if (exactMatchRegex.test(rawText)) {
        matchedInvoiceNo = pendingNo;
        break;
      }
    }

    // If no match from the pending list, try to extract standard invoice format as a fallback
    if (!matchedInvoiceNo) {
      const invMatch = rawText.match(/TI\/\d{2}-\d{2}\/(\d+)/i) || rawText.match(/(\d+)\s*\/\s*\d+\s*C\/R/i);
      if (invMatch && invMatch[1]) {
        matchedInvoiceNo = invMatch[1].trim();
      }
    }

    if (!matchedInvoiceNo) {
        return NextResponse.json({ 
            success: false, 
            error: "Could not find a matching Invoice Number on this Builty." 
        });
    }

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
      error: error.message || "Failed to process the Builty image." 
    }, { status: 500 });
  }
}