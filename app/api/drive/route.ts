export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";

async function uploadMultipart(token: string, name: string, mimeType: string, contentType: string, body: string): Promise<{ ok: boolean; data: any; status: number }> {
  const boundary = "-------sales_support_boundary";
  const metadata = JSON.stringify({ name, mimeType });
  const multipart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    "",
    body,
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    }
  );
  return { ok: res.ok, data: await res.json(), status: res.status };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

  const { filename, content, mimeType = "text/plain" } = await req.json();
  if (!filename || !content) return NextResponse.json({ error: "Missing filename or content" }, { status: 400 });

  if (mimeType === "application/pdf") {
    // 1. Upload HTML as a Google Doc (Drive auto-converts)
    const docName = filename.replace(/\.pdf$/, "");
    const upload = await uploadMultipart(token, docName, "application/vnd.google-apps.document", "text/html; charset=UTF-8", content);
    if (!upload.ok) return NextResponse.json({ error: upload.data.error?.message ?? "Drive upload error" }, { status: upload.status });
    const docId: string = upload.data.id;

    try {
      // 2. Export the Google Doc as PDF bytes
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=application/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!exportRes.ok) {
        const err = await exportRes.text();
        return NextResponse.json({ error: `Export failed: ${err}` }, { status: exportRes.status });
      }
      const pdfBytes = new Uint8Array(await exportRes.arrayBuffer());

      // 3. Upload the PDF bytes
      const boundary = "-------sales_support_pdf";
      const meta = JSON.stringify({ name: filename, mimeType: "application/pdf" });
      const metaPart = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`);
      const endPart = new TextEncoder().encode(`\r\n--${boundary}--`);
      const combined = new Uint8Array(metaPart.length + pdfBytes.length + endPart.length);
      combined.set(metaPart, 0);
      combined.set(pdfBytes, metaPart.length);
      combined.set(endPart, metaPart.length + pdfBytes.length);

      const pdfRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: combined,
        }
      );
      const pdfData = await pdfRes.json();
      if (!pdfRes.ok) return NextResponse.json({ error: pdfData.error?.message ?? "PDF upload error" }, { status: pdfRes.status });

      return NextResponse.json(pdfData);
    } finally {
      // 4. Delete the temporary Google Doc
      await fetch(`https://www.googleapis.com/drive/v3/files/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  const result = await uploadMultipart(token, filename, mimeType, mimeType, content);
  if (!result.ok) return NextResponse.json({ error: result.data.error?.message ?? "Drive error" }, { status: result.status });
  return NextResponse.json(result.data);
}
