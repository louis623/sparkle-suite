const fs = require('node:fs');
const crypto = require('node:crypto');

// Intentionally no whitespace, content, tenant-path, or timestamp normalization.
function normalizeRepResponse(value) {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>\r?\n?/gi, tag => {
      const ga = /id=["']sparkle-rep-ga4["']|src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?|gtag\(['"]config['"]/.test(tag);
      return ga ? '' : tag;
    })
    .replace(/\bdpl_[A-Za-z0-9]+\b/g, '<DEPLOYMENT_ID>')
    .replace(/https?:\/\/(?:\[[a-f0-9:]+\]|[a-z0-9.-]+)(?::\d+)?/gi, '<ORIGIN>')
    .replace(/\b[a-f0-9]{8,64}(?=\.(?:js|css)\b)/gi, '<BUILD_HASH>')
    .replace(/(\/_next\/static\/)[A-Za-z0-9_-]{10,}(\/_(?:build|ssg)Manifest\.js)/g, '$1<BUILD_HASH>$2')
    .replace(/("(?:buildId|b)":")[A-Za-z0-9_-]{10,}(")/g, '$1<BUILD_HASH>$2')
    .replace(/(\\"(?:buildId|b)\\":\\")[A-Za-z0-9_-]{10,}(\\")/g, '$1<BUILD_HASH>$2');
}

function garbledSequences(value) {
  const decoded = String(value).replace(/\\u(?:\{([0-9a-f]{1,6})\}|([0-9a-f]{4}))/gi,
    (_, braced, fixed) => String.fromCodePoint(parseInt(braced || fixed, 16)));
  const bad = [[0xe2,0x20ac],[0xc2,0xb7],[0xc2,0xa9],[0xe2,0x153],[0xe2,0x2020],[0xe2,0x2013],[0xc3,0x2014]];
  return bad.map(codes => String.fromCodePoint(...codes)).flatMap(sequence => {
    const matches = [...decoded.matchAll(new RegExp(sequence, 'g'))];
    return matches.map(match => ({ sequence, offset: match.index }));
  });
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
module.exports = { normalizeRepResponse, garbledSequences, hash };
if (require.main === module) {
  for (const file of process.argv.slice(2)) console.log(JSON.stringify({ file,
    normalizedSha256: hash(normalizeRepResponse(fs.readFileSync(file, 'utf8'))),
    garbled: garbledSequences(fs.readFileSync(file, 'utf8')) }));
}
