"use client";

import { useState } from "react";
import { Save, ExternalLink, Loader2 } from "lucide-react";

interface Props {
  content: string;
  filename: string;
  label?: string;
  requestToken: () => Promise<string>;
  disabled?: boolean;
}

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHeaderDone = false;
  let inTbody = false;

  const isTableRow = (l: string) => l.trimEnd().startsWith("|") && l.trimEnd().endsWith("|");
  const isSeparatorRow = (l: string) => /^\|[\s|:-]+\|$/.test(l.trimEnd());

  const closeList = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  const closeTable = () => {
    if (inTable) {
      if (inTbody) { html.push("</tbody>"); inTbody = false; }
      html.push("</table>");
      inTable = false;
      tableHeaderDone = false;
    }
  };

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  const parseTableCells = (line: string) =>
    line.trimEnd().replace(/^\||\|$/g, "").split("|").map(c => c.trim());

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (isTableRow(line)) {
      if (isSeparatorRow(line)) {
        // separator row — marks end of header
        tableHeaderDone = true;
        continue;
      }
      const cells = parseTableCells(line);
      if (!inTable) {
        closeList();
        html.push(`<table style="border-collapse:collapse;width:100%;margin:1em 0"><thead><tr>`);
        cells.forEach(c => html.push(`<th style="border:1px solid #ccc;padding:6px 12px;background:#f0f0f0;text-align:left">${inline(c)}</th>`));
        html.push(`</tr></thead>`);
        inTable = true;
        tableHeaderDone = false;
      } else {
        if (!tableHeaderDone) {
          // still in header area before separator
          html.push(`<tr>`);
          cells.forEach(c => html.push(`<th style="border:1px solid #ccc;padding:6px 12px;background:#f0f0f0;text-align:left">${inline(c)}</th>`));
          html.push(`</tr>`);
        } else {
            if (!inTbody) { html.push(`<tbody>`); inTbody = true; }
          html.push(`<tr>`);
          cells.forEach(c => html.push(`<td style="border:1px solid #ccc;padding:6px 12px">${inline(c)}</td>`));
          html.push(`</tr>`);
        }
      }
      continue;
    }

    closeTable();

    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const ul = line.match(/^[-*] (.+)/);
    const ol = line.match(/^\d+\. (.+)/);

    if (h1) { closeList(); html.push(`<h1>${inline(h1[1])}</h1>`); }
    else if (h2) { closeList(); html.push(`<h2>${inline(h2[1])}</h2>`); }
    else if (h3) { closeList(); html.push(`<h3>${inline(h3[1])}</h3>`); }
    else if (ul) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push(`<li>${inline(ul[1])}</li>`);
    } else if (ol) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${inline(ol[1])}</li>`);
    } else if (line.match(/^---+$/)) {
      closeList(); html.push("<hr>");
    } else if (line === "") {
      closeList();
    } else {
      closeList(); html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  closeTable();
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:40px auto;line-height:1.6">${html.join("")}</body></html>`;
}

export function DriveSaveButton({ content, filename, label = "Save to Drive", requestToken, disabled }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    setSavedUrl(null);
    try {
      const token = await requestToken();
      const pdfFilename = filename.replace(/\.[^.]+$/, "") + ".pdf";

      const res = await fetch("/api/drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename: pdfFilename, content: mdToHtml(content), mimeType: "application/pdf" }),
      });

      const data = await res.json();
      if (data.id) {
        setSavedUrl(`https://drive.google.com/file/d/${data.id}/view`);
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={save}
        disabled={isSaving || disabled || !content}
        className="flex items-center gap-1.5 rounded-md py-1 px-3 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-zinc-300"
      >
        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        {isSaving ? "Saving…" : label}
      </button>

      {savedUrl && (
        <a
          href={savedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
        >
          <ExternalLink className="w-3 h-3" /> Saved
        </a>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
