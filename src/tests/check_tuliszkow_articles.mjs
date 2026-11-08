import zlib from 'node:zlib';

function extractPdfText(buf) {
  const raw = buf.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let text = '';
  let m;
  while ((m = streamRegex.exec(raw)) !== null) {
    try {
      const decompressed = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
      const tjMatches = decompressed.matchAll(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g);
      for (const tj of tjMatches) {
        if (tj[1]) text += tj[1] + ' ';
        else if (tj[2]) {
          const parts = [...tj[2].matchAll(/\((.*?)\)/g)].map(p => p[1]).join('');
          text += parts + ' ';
        }
      }
    } catch {}
  }
  return text.replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim();
}

for (const id of [2102, 2100, 1935]) {
  const u = `https://bip.tuliszkow.pl/kategorie/17-zawiadomienia-o-sesji/artykuly/${id}`;
  const html = await (await fetch(u)).text();
  const m = html.match(/https:\/\/bip-api\.tuliszkow\.pl\/api\/attachments\/(\d+)/);
  console.log(`Article ${id}: PDF url:`, m ? m[0] : 'NONE');
  if (m) {
    const pdfBuf = Buffer.from(await (await fetch(m[0])).arrayBuffer());
    const txt = extractPdfText(pdfBuf);
    console.log(`  PDF text (${txt.length}):`, txt.slice(0, 180));
  }
}
