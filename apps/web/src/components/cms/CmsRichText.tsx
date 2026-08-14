'use client';

import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function CmsRichText({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value || '';
  }, [value]);

  function cmd(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || '');
  }

  function insertHtml(html: string) {
    document.execCommand('insertHTML', false, html);
    onChange(ref.current?.innerHTML || '');
  }

  const tools: Array<{ label: string; run: () => void }> = [
    { label: 'H2', run: () => cmd('formatBlock', 'h2') },
    { label: 'H3', run: () => cmd('formatBlock', 'h3') },
    { label: 'Bold', run: () => cmd('bold') },
    { label: 'Italic', run: () => cmd('italic') },
    { label: 'List', run: () => cmd('insertUnorderedList') },
    { label: 'Numbers', run: () => cmd('insertOrderedList') },
    { label: 'Quote', run: () => cmd('formatBlock', 'blockquote') },
    { label: 'Link', run: () => cmd('createLink', window.prompt('URL') || '') },
    {
      label: 'Image',
      run: () => {
        const src = window.prompt('Image URL');
        if (src) insertHtml(`<img src="${src}" alt="" style="max-width:100%" />`);
      },
    },
    {
      label: 'YouTube',
      run: () => {
        const url = window.prompt('YouTube URL');
        if (!url) return;
        const id = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/)?.[1];
        if (id) {
          insertHtml(
            `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`,
          );
        }
      },
    },
    {
      label: 'Table',
      run: () =>
        insertHtml(
          '<table border="1" cellpadding="6"><tr><th>Heading</th><th>Heading</th></tr><tr><td>Cell</td><td>Cell</td></tr></table>',
        ),
    },
    { label: 'Left', run: () => cmd('justifyLeft') },
    { label: 'Center', run: () => cmd('justifyCenter') },
    { label: 'Colour', run: () => cmd('foreColor', window.prompt('Colour (e.g. #722f37)') || '#722f37') },
    { label: 'Highlight', run: () => cmd('hiliteColor', window.prompt('Highlight colour') || '#fde68a') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--bcl-border)] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-[var(--bcl-border)] bg-[var(--bcl-bg)] px-2 py-1.5">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--bcl-muted)] hover:bg-white"
            onMouseDown={(e) => {
              e.preventDefault();
              tool.run();
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="min-h-[180px] px-3 py-2 text-sm outline-none prose prose-sm max-w-none"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
      />
    </div>
  );
}
