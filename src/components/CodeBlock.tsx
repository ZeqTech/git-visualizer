"use client";

export default function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-auto">
      <code>{code}</code>
    </pre>
  );
}
