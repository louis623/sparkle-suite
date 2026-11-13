import { deadline, jsonRequest } from "./swap-request-state.js";

const MAX_BYTES = 25 * 1024 * 1024;
const extensionTypes = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", heic: "heic", heif: "heif", avif: "avif" };
export function photoType(file) {
  if (!file || file.size < 1 || file.size > MAX_BYTES) return null;
  const declared = file.type.toLowerCase().replace("image/jpg", "image/jpeg");
  if (declared && declared !== "application/octet-stream") return /^image\/(jpeg|png|webp|heic|heif|avif)$/.test(declared) ? declared : null;
  const ext = extensionTypes[file.name.split(".").pop().toLowerCase()];
  return ext ? "image/" + ext : null;
}

// Read encoded dimensions first. Unknown or malformed headers go directly to
// server-side conversion without asking a mobile decoder to expand them.
function jpegOrientation(view, start, end) {
  if (start + 14 > end || view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return 1;
  const tiff = start + 6;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const le = order === 0x4949;
  if (view.getUint16(tiff + 2, le) !== 42) return 1;
  const dir = tiff + view.getUint32(tiff + 4, le);
  if (dir + 2 > end) return 1;
  const count = view.getUint16(dir, le);
  for (let i = 0; i < count; i++) {
    const entry = dir + 2 + i * 12;
    if (entry + 12 > end) break;
    if (view.getUint16(entry, le) === 274 && view.getUint16(entry + 2, le) === 3 && view.getUint32(entry + 4, le) === 1) return view.getUint16(entry + 8, le);
  }
  return 1;
}

function dimensions(bytes) {
  const d = new DataView(bytes);
  if (d.byteLength < 24) return null;
  if (d.getUint32(0) === 0x89504e47 && d.getUint32(12) === 0x49484452) return [d.getUint32(16), d.getUint32(20)];
  if (d.getUint32(0) === 0x52494646 && d.getUint32(8) === 0x57454250) {
    if (d.getUint32(12) === 0x56503858 && d.byteLength >= 30) {
      const le24 = i => d.getUint8(i) + 256 * d.getUint16(i + 1, true);
      return [1 + le24(24), 1 + le24(27)];
    }
    if (d.getUint32(12) === 0x56503820 && d.byteLength >= 30) return [d.getUint16(26, true) & 16383, d.getUint16(28, true) & 16383];
    if (d.getUint32(12) === 0x5650384c && d.byteLength >= 25) {
      const bits = d.getUint32(21, true);
      return [1 + (bits & 16383), 1 + ((bits >>> 14) & 16383)];
    }
  }
  if (d.getUint16(0) !== 0xffd8) return null;
  let orientation = 1;
  for (let i = 2; i + 9 < d.byteLength && d.getUint8(i) === 255;) {
    const marker = d.getUint8(i + 1);
    if (marker === 255) { i++; continue; }
    if ([192,193,194,195].includes(marker)) {
      const w = d.getUint16(i + 7), h = d.getUint16(i + 5);
      return orientation >= 5 && orientation <= 8 ? [h,w] : [w,h];
    }
    const size = d.getUint16(i + 2);
    if (size < 2 || marker === 218) break;
    if (marker === 225 && i + size + 2 <= d.byteLength) orientation = jpegOrientation(d, i + 4, i + size + 2);
    i += size + 2;
  }
  return null;
}

export async function preparePhoto(file) {
  const raw = { file, previewBlob: null };
  let bitmap, canvas;
  try {
    const size = dimensions(await file.slice(0, 256 * 1024).arrayBuffer());
    if (!size || size.some(n => n < 1) || size[0] * size[1] > 64_000_000) return raw;
    const [width, height] = size;
    const scale = Math.min(1, 2000 / Math.max(...size), Math.sqrt(3_000_000 / (width * height)));
    if (scale === 1) return { file, previewBlob: file };
    if (typeof createImageBitmap !== "function") return raw;
    // One dimension lets the decoder preserve the oriented image's aspect ratio.
    // JPEG EXIF can swap width and height; use the smaller possible oriented
    // width, then honor the decoded aspect ratio on the canvas.
    bitmap = await createImageBitmap(file, { resizeWidth: Math.max(1, Math.round(width * scale)), imageOrientation: "from-image" });
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 3_100_000 || Math.max(bitmap.width, bitmap.height) > 2000) return raw;
    canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return raw;
    ctx.drawImage(bitmap, 0, 0);
    let first, varied = false;
    for (let x = 1; x <= 7 && !varied; x++) for (let y = 1; y <= 7 && !varied; y++) {
      const pixel = ctx.getImageData(Math.floor(canvas.width * x / 8), Math.floor(canvas.height * y / 8), 1, 1).data;
      const rgb = pixel[0] * 65536 + pixel[1] * 256 + pixel[2];
      if (first === undefined) first = rgb;
      else if (pixel[3] && rgb !== first) varied = true;
    }
    if (!varied) return raw;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || !blob.size || blob.size > MAX_BYTES || blob.type !== "image/jpeg") return raw;
    const converted = new File([blob], "reveal.jpg", { type: blob.type });
    return { file: converted, previewBlob: converted };
  } catch { return raw; }
  finally { bitmap?.close(); if (canvas) canvas.width = canvas.height = 0; }
}

export function safePreview(blob) {
  try { return blob ? URL.createObjectURL(blob) : null; } catch { return null; }
}

function put(ticket, file, signal, progress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open("PUT", ticket.uploadUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.timeout = Math.max(90_000, Math.ceil(file.size / 32768) * 1000);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(100 * event.loaded / event.total)); };
    xhr.onerror = () => reject(new Error("Your photo did not finish uploading."));
    xhr.ontimeout = () => reject(new Error("The photo upload timed out."));
    xhr.onabort = () => reject(new DOMException("Cancelled", "AbortError"));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() :
      reject(Object.assign(new Error("Your photo did not finish uploading."), { status: xhr.status }));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true });
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file.slice(0, file.size, photoType(file)), file.name);
    xhr.send(body);
  });
}

export async function attachPhoto(urls, identity, file, signal, events) {
  let ticket;
  try {
    ticket = await deadline(15_000, s => jsonRequest(urls.ticket, { ...identity, contentType: photoType(file), byteSize: file.size }, s), signal);
  } catch (error) {
    if (error.status === 503) events.refreshPolicy();
    throw error;
  }
  if (!ticket?.uploadId || !ticket.uploadUrl || !Number.isFinite(Date.parse(ticket.createdAt || ticket.created_at))) throw new Error("The upload ticket is incomplete.");
  events.ticket(ticket);
  events.progress("Uploading 0%");
  await put(ticket, file, signal, n => events.progress("Uploading " + n + "%"));
  events.progress("Checking photo…");
  const confirm = s => jsonRequest(urls.confirm, { ...identity, uploadId: ticket.uploadId }, s);
  let result;
  try { result = await deadline(65_000, confirm, signal); }
  catch (error) {
    // Re-read the guarded confirm once before abandoning an uncertain write.
    if (signal.aborted || error.status && error.status < 500) throw error;
    result = await deadline(65_000, confirm, signal);
  }
  if (!result?.ready) throw new Error("The photo could not be confirmed.");
  return ticket;
}
