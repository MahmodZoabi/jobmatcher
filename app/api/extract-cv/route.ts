import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithImage } from "@/lib/ai";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing "file" in form data' },
        { status: 400 },
      );
    }

    const anyFile = file as any;
    const originalMime: string = anyFile.type || "";
    const name: string = anyFile.name || "upload";
    const nameLower = name.toLowerCase();

    // Reject unsupported formats
    if (
      nameLower.endsWith(".docx") ||
      nameLower.endsWith(".doc") ||
      originalMime.includes("officedocument") ||
      originalMime.includes("msword")
    ) {
      return NextResponse.json(
        { error: "Word documents (.docx/.doc) aren't supported. Please export your CV as a PDF and try again." },
        { status: 415 },
      );
    }

    let mimeType = originalMime;
    if (!mimeType) {
      if (nameLower.endsWith(".pdf")) {
        mimeType = "application/pdf";
      } else if (nameLower.match(/\.(png|jpg|jpeg|webp)$/)) {
        const ext = name.split(".").pop()?.toLowerCase();
        mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload a PDF, PNG, JPG, or WEBP." },
          { status: 415 },
        );
      }
    }

    if (isDev) console.log("[API /extract-cv] Received file", { name, mimeType });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "The uploaded file appears to be empty." },
        { status: 422 },
      );
    }

    // PDFs: extract locally first
    if (mimeType === "application/pdf" || nameLower.endsWith(".pdf")) {
      try {
        const text = await extractPdfText(buffer);
        if (text && text.trim().length > 50) {
          if (isDev) console.log("[API /extract-cv] pdf-parse extracted", text.length, "chars");
          return NextResponse.json({ text: text.trim() }, { status: 200 });
        }
        if (isDev) console.warn("[API /extract-cv] pdf-parse returned too little text, falling back to Gemini OCR");
      } catch (pdfErr: any) {
        if (isDev) console.warn("[API /extract-cv] pdf-parse failed, falling back to Gemini OCR:", pdfErr?.message);
      }
    }

    // Images and scanned PDFs: Gemini OCR
    const base64 = buffer.toString("base64");
    const prompt = `Extract all meaningful text from this CV (PDF or image) in a clean, readable format.
Preserve section headings (Experience, Education, Skills) and bullet points.
Return only the plain text content.`;

    try {
      const text = await callGeminiWithImage(base64, mimeType, prompt, { maxTokens: 4000 });

      if (!text || text.trim().length < 20) {
        return NextResponse.json(
          { error: "Could not extract text from this file. Try a different file or paste the text directly." },
          { status: 422 },
        );
      }

      return NextResponse.json({ text: text.trim() }, { status: 200 });
    } catch (geminiError: any) {
      console.error("[API /extract-cv] Gemini OCR error:", geminiError?.message);
      return NextResponse.json(
        { error: "Failed to extract text from the file. Try pasting your CV text directly." },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("[API /extract-cv] Unexpected error:", error?.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
