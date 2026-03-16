function download(filename: string, mime: string, data: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 120) || 'documento';
}

export function exportMarkdown(filenameBase: string, content: string) {
  const filename = `${sanitizeFilename(filenameBase)}.md`;
  download(filename, 'text/markdown;charset=utf-8', content);
}

export function exportTxt(filenameBase: string, content: string) {
  const filename = `${sanitizeFilename(filenameBase)}.txt`;
  download(filename, 'text/plain;charset=utf-8', content);
}

export function exportDoc(filenameBase: string, content: string) {
  const filename = `${sanitizeFilename(filenameBase)}.doc`;
  const html =
    '<html><head><meta charset="utf-8"></head><body>' +
    content.replace(/\n/g, '<br/>') +
    '</body></html>';
  download(filename, 'application/msword', html);
}

export function exportPdfViaPrint(title: string, content: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(
    '<html><head><meta charset="utf-8"><title>' +
      sanitizeFilename(title) +
      '</title><style>body{font-family: Arial, sans-serif; line-height:1.5; padding:24px; white-space:pre-wrap}</style></head><body>' +
      content.replace(/\n/g, '<br/>') +
      '</body></html>'
  );
  w.document.close();
  w.focus();
  w.print();
}

export function exportSrt(filenameBase: string, srt: string) {
  const filename = `${sanitizeFilename(filenameBase)}.srt`;
  download(filename, 'application/x-subrip', srt);
}
