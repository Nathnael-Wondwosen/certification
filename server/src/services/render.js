import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { downloadFile as awDownload } from './appwrite.js';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

function getEmbeddedFontCSS() {
  try {
    // Resolve relative to current module as well as process cwd (Vercel packs files under /var/task)
    const moduleDir = (() => {
      try {
        const { fileURLToPath } = require('url');
        return path.dirname(fileURLToPath(import.meta.url));
      } catch {
        try {
          // ESM-safe fallback
          return path.dirname(new URL(import.meta.url).pathname);
        } catch {
          return process.cwd();
        }
      }
    })();
    const candidates = [
      path.join(process.cwd(), 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf'),
      path.join(moduleDir, '..', '..', 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf'),
      path.join(moduleDir, 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf')
    ];
    let fontPath = '';
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) { fontPath = p; break; }
      } catch {}
    }
    if (!fontPath) {
      console.warn('getEmbeddedFontCSS: font not found in candidates', candidates);
      return '';
    }
    const buf = fs.readFileSync(fontPath);
    const b64 = Buffer.from(buf).toString('base64');
    const dataUrl = `data:font/ttf;base64,${b64}`;
    const css = `@font-face { font-family: 'NotoSansEthiopic'; src: url('${dataUrl}') format('truetype'); font-weight: 100 900; font-style: normal; font-display: swap; }`;
    console.log('getEmbeddedFontCSS: loaded font at', fontPath, 'size', buf.length);
    return css;
  } catch (e) {
    console.warn('getEmbeddedFontCSS: error embedding font', e?.message);
    return '';
  }
}

// Build an SVG overlay for text rendering with Sharp
function escapeXml(s = '') {
  // First ensure we have a string
  const str = String(s);
  console.log(`Escaping XML - Input: "${str}", Type: ${typeof str}`);
  
  // Handle special cases
  if (str === '') return '';
  
  // Escape XML entities
  const escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
    
  console.log(`Escaping XML - Output: "${escaped}"`);
  return escaped;
}

// Note: Font handling in SVGs for certificate generation
// We use a robust fallback chain: DejaVu Sans -> Verdana -> Arial -> sans-serif
// DejaVu Sans is chosen because it has excellent Unicode coverage and is often
// available in server environments. This approach avoids the "boxes" issue
// that occurs when fonts are not available.

export function buildOverlaySVG({ width, height, fields }) {
  const fontCSS = getEmbeddedFontCSS()
  console.log('Building SVG with fields:', JSON.stringify(fields, null, 2));
  
  const texts = fields
    .filter((f) => f && f.visible !== false && String(f.value || '').trim() !== '')
    .map((f) => {
      const anchor = f.align === 'left' ? 'start' : f.align === 'right' ? 'end' : 'middle';
      // Use NotoSansEthiopic when available, otherwise use fallback
      const fontFamily = fontCSS && !fontCSS.includes('FallbackFont') ? 
        'NotoSansEthiopic, DejaVu Sans, Verdana, Arial, sans-serif' : 
        'FallbackFont, DejaVu Sans, Verdana, Arial, sans-serif';
      // Ensure proper text rendering by converting value to string and escaping XML
      const textValue = String(f.value || '');
      const escapedValue = escapeXml(textValue);
      console.log(`Generating text element - Field: ${f.field}, Value: "${textValue}", Escaped: "${escapedValue}", Font: ${fontFamily}`);
      return `<text x="${f.x}" y="${f.y}" text-anchor="${anchor}" fill="${f.color || '#000000'}" font-size="${f.fontSize || 48}" font-family="${fontFamily}">${escapedValue}</text>`;
    })
    .join('');
  const style = fontCSS ? `<defs><style><![CDATA[${fontCSS}]]></style></defs>` : ''
  // Add additional SVG attributes to ensure proper text rendering
  const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${style}${texts}</svg>`;
  console.log('Generated SVG content (first 500 chars):', svgContent.substring(0, 500));
  return svgContent;
}

export async function renderCertificatePNG({ template, payload }) {
  const { backgroundPath, backgroundFileId, width, height, textLayout } = template;
  
  // Log for debugging font issues
  const fontCSS = getEmbeddedFontCSS();
  console.log('Font CSS loaded:', !!fontCSS);
  
  // Log the payload for debugging
  console.log('Payload values:', JSON.stringify(payload, null, 2));
  
  // Ensure textLayout is properly converted to plain objects
  let plainTextLayout = [];
  if (Array.isArray(textLayout)) {
    plainTextLayout = textLayout.map(t => {
      // Convert Mongoose documents to plain objects
      if (typeof t.toObject === 'function') {
        return t.toObject();
      } else if (typeof t.toJSON === 'function') {
        return t.toJSON();
      } else {
        return t;
      }
    });
  }
  
  console.log('Plain text layout:', JSON.stringify(plainTextLayout, null, 2));
  
  const processedFields = plainTextLayout.map((fieldObj) => {
    // Map the payload value to the field
    const fieldValue = payload[fieldObj.field];
    console.log(`Field mapping - Field: ${fieldObj.field}, Payload value:`, fieldValue, 'Type:', typeof fieldValue);
    
    // Handle undefined/null values
    const finalValue = (fieldValue !== undefined && fieldValue !== null) ? String(fieldValue) : '';
    console.log(`Final value for ${fieldObj.field}: "${finalValue}"`);
    
    return { 
      ...fieldObj, 
      value: finalValue
    };
  });
  
  // Log the processed fields for debugging
  console.log('Processed fields:', JSON.stringify(processedFields, null, 2));
  
  // Build full SVG that embeds the background image and text, then rasterize with Resvg
  // Load background as buffer
  let bgBuffer;
  if (backgroundFileId) {
    const data = await awDownload(backgroundFileId);
    bgBuffer = Buffer.from(data);
  } else if (backgroundPath && fs.existsSync(backgroundPath)) {
    bgBuffer = fs.readFileSync(backgroundPath);
  } else {
    throw new Error('Template background not found');
  }
  function detectMime(buf) {
    if (!buf || buf.length < 4) return 'application/octet-stream';
    const b0 = buf[0], b1 = buf[1], b2 = buf[2], b3 = buf[3];
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) return 'image/png';
    if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) return 'image/jpeg';
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return 'image/gif';
    return 'image/png';
  }
  const bgMime = detectMime(bgBuffer);
  const bgDataUrl = `data:${bgMime};base64,${bgBuffer.toString('base64')}`;

  // Create text layer SVG
  const textOverlay = buildOverlaySVG({ width, height, fields: processedFields });
  
  // Assemble full SVG
  const defs = fontCSS ? `<defs><style><![CDATA[${fontCSS}]]></style></defs>` : '';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${defs}
  <image href="${bgDataUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
  ${textOverlay.replace(/^<svg[^>]*>|<\/svg>$/g, '')}
</svg>`;
  console.log('Full SVG built (first 500 chars):', svg.substring(0, 500));

  // Provide font file to Resvg explicitly for reliable glyph rendering
  const moduleDir = path.dirname(new URL(import.meta.url).pathname);
  const fontCandidates = [
    path.join(process.cwd(), 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf'),
    path.join(moduleDir, '..', '..', 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf'),
    path.join(moduleDir, 'fonts', 'NotoSansEthiopic-VariableFont_wdth,wght.ttf')
  ];
  const fontFiles = fontCandidates.filter(p => { try { return fs.existsSync(p); } catch { return false; } });
  console.log('Resvg font files found:', fontFiles);
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'original' },
      font: { fontFiles, loadSystemFonts: false }
    });
    const pngData = resvg.render().asPng();
    console.log('PNG generated successfully via Resvg');
    return Buffer.from(pngData);
  } catch (e) {
    console.warn('Resvg render failed, falling back to sharp overlay:', e?.message);
    const overlayBuffer = Buffer.from(textOverlay);
    const out = await sharp(bgBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite([{ input: overlayBuffer, top: 0, left: 0 }])
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();
    console.log('PNG generated via Sharp fallback');
    return out;
  }
}

export async function renderCertificatePDF({ template, payload }) {
  const pngBuffer = await renderCertificatePNG({ template, payload });
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
  page.drawImage(pngImage, { x: 0, y: 0, width: pngImage.width, height: pngImage.height });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}