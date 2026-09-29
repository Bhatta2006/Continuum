export const REDACTION_PATTERNS = [
  // AWS Access Key ID
  { name: 'AWS_KEY', regex: /\b(AKIA[0-9A-Z]{16})\b/g },
  // OpenAI / Anthropic Keys
  { name: 'API_KEY', regex: /\b(?:sk-[a-zA-Z0-9]{48}|sk-ant-api[a-zA-Z0-9\-_]{20,})\b/g },
  // Generic Bearer Token
  { name: 'BEARER_TOKEN', regex: /Bearer\s+([A-Za-z0-9\-\._~\+\/]+=*)/g },
  // Private Keys (PEM)
  { name: 'PRIVATE_KEY', regex: /-----BEGIN(?: RSA| DSA| EC| OPENSSH|)? PRIVATE KEY-----[\s\S]+?-----END(?: RSA| DSA| EC| OPENSSH|)? PRIVATE KEY-----/g },
  // Database Connection Strings (credentials part)
  { name: 'CONNECTION_STRING', regex: /(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^:]+:([^@]+)@/g },
  // Emails
  { name: 'EMAIL', regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  // SSN (US)
  { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Phone numbers (E.164-ish, at least 7 digits to avoid small numbers)
  { name: 'PHONE', regex: /(?:\b|\+)[1-9]\d{6,14}\b/g },
  // Generic secrets looking like high-entropy base64 (e.g. JWT)
  { name: 'JWT', regex: /eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g },
];

// Helper to decode URL-encoded text safely
function tryDecodeURIComponent(str: string): string | null {
  try {
    const decoded = decodeURIComponent(str);
    return decoded !== str ? decoded : null;
  } catch (e) {
    return null;
  }
}

// Helper to decode Base64 safely (rudimentary check to avoid false positives on random strings)
// We only attempt to decode if it looks like a continuous block of base64 chars
function tryDecodeBase64(str: string): string | null {
  if (str.length < 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(str)) {
    return null;
  }
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    // Basic heuristic: if decoded string contains printable ASCII and some structure
    if (/^[\x20-\x7E\r\n\t]+$/.test(decoded) && decoded.length > 5) {
      return decoded;
    }
  } catch (e) {}
  return null;
}

export type RedactionResult = {
  redactedText: string;
  stats: Record<string, number>;
};

export function redact(text: string): RedactionResult {
  if (!text) return { redactedText: text, stats: {} };

  let currentText = text;
  const stats: Record<string, number> = {};

  const recordStat = (name: string) => {
    stats[name] = (stats[name] || 0) + 1;
  };

  // Phase 1: Direct Regex Replacements
  for (const { name, regex } of REDACTION_PATTERNS) {
    let match;
    // reset regex index
    regex.lastIndex = 0;
    while ((match = regex.exec(currentText)) !== null) {
      recordStat(name);
    }
    // Replace depending on if it has a capture group (like connection string or bearer)
    if (name === 'CONNECTION_STRING') {
      currentText = currentText.replace(regex, (fullMatch, p1) => {
        return fullMatch.replace(p1, '[REDACTED_PASSWORD]');
      });
    } else if (name === 'BEARER_TOKEN') {
      currentText = currentText.replace(regex, (fullMatch, p1) => {
        return fullMatch.replace(p1, '[REDACTED_TOKEN]');
      });
    } else {
      currentText = currentText.replace(regex, `[REDACTED_${name}]`);
    }
  }

  // Phase 2: Encoded blobs (URL Encoding)
  // Match contiguous chunks of non-whitespace that contain at least one %-encoded triplet
  const urlEncodedRegex = /\b(?:[A-Za-z0-9\-_.~]*%[0-9A-Fa-f]{2}[A-Za-z0-9\-_.~%]*)+\b/g;
  currentText = currentText.replace(urlEncodedRegex, (match) => {
    const decoded = tryDecodeURIComponent(match);
    if (decoded) {
      const { redactedText, stats: innerStats } = redact(decoded); // recursive
      if (Object.keys(innerStats).length > 0) {
        for (const [k, v] of Object.entries(innerStats)) recordStat(k);
        return encodeURIComponent(redactedText); // Re-encode redacted version
      }
    }
    return match; // no secrets found inside
  });

  // Phase 3: Base64 blobs
  // Find words that are purely base64
  const base64Regex = /\b[A-Za-z0-9+/]{16,}={0,2}\b/g;
  currentText = currentText.replace(base64Regex, (match) => {
    const decoded = tryDecodeBase64(match);
    if (decoded) {
      const { redactedText, stats: innerStats } = redact(decoded);
      if (Object.keys(innerStats).length > 0) {
        for (const [k, v] of Object.entries(innerStats)) recordStat(k);
        // It's safer to just wipe the whole base64 block if a secret was inside it
        return `[REDACTED_B64_SECRET]`;
      }
    }
    return match;
  });

  return { redactedText: currentText, stats };
}
