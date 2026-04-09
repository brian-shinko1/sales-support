"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  content: string;
}

export function MarkdownPreview({ content }: Props) {
  if (!content) {
    return <p className="text-zinc-600 text-sm">Run an agent to generate a summary.</p>;
  }
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-300 prose-headings:text-zinc-100 prose-code:text-violet-300 prose-pre:bg-zinc-800 prose-blockquote:border-violet-500 prose-blockquote:text-zinc-400">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
