import { describe, it, expect } from 'vitest';
import { redact } from '../src/redaction';

describe('Redaction Pipeline', () => {
  it('should redact AWS Access Keys', () => {
    const text = 'Here is my key: AKIAIOSFODNN7EXAMPLE and some other text';
    const { redactedText, stats } = redact(text);
    expect(redactedText).toBe('Here is my key: [REDACTED_AWS_KEY] and some other text');
    expect(stats['AWS_KEY']).toBe(1);
  });

  it('should redact OpenAI/Anthropic API keys', () => {
    const text = 'OPENAI_KEY=sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234';
    const { redactedText } = redact(text);
    expect(redactedText).toBe('OPENAI_KEY=[REDACTED_API_KEY]');

    const antText = 'Use sk-ant-api03-abcdefg1234567890-XYZ';
    const res = redact(antText);
    expect(res.redactedText).toBe('Use [REDACTED_API_KEY]');
  });

  it('should redact Bearer tokens', () => {
    const text = 'Authorization: Bearer abcdef12345.eyJh.bGc';
    const { redactedText } = redact(text);
    expect(redactedText).toBe('Authorization: Bearer [REDACTED_TOKEN]');
  });

  it('should redact Private Keys', () => {
    const text = 'Some text\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\nMore text';
    const { redactedText } = redact(text);
    expect(redactedText).toBe('Some text\n[REDACTED_PRIVATE_KEY]\nMore text');
  });

  it('should redact database connection string passwords', () => {
    const text = 'postgres://user:supersecretpass@localhost:5432/mydb';
    const { redactedText } = redact(text);
    expect(redactedText).toBe('postgres://user:[REDACTED_PASSWORD]@localhost:5432/mydb');
  });

  it('should redact emails, SSNs and phones', () => {
    const text = 'Contact john.doe@example.com or +14155552671. SSN is 123-45-6789.';
    const { redactedText, stats } = redact(text);
    expect(redactedText).toContain('[REDACTED_EMAIL]');
    expect(redactedText).toContain('[REDACTED_PHONE]');
    expect(redactedText).toContain('[REDACTED_SSN]');
  });

  it('should handle URL-encoded secrets', () => {
    const plain = 'AKIAIOSFODNN7EXAMPLE';
    const encoded = encodeURIComponent(`my key is ${plain}`);
    const text = `Look at this payload: ${encoded}`;
    
    const { redactedText, stats } = redact(text);
    // Should redact inside and re-encode
    expect(redactedText).toContain(encodeURIComponent('my key is [REDACTED_AWS_KEY]'));
    expect(stats['AWS_KEY']).toBe(1);
  });

  it('should handle Base64-encoded secrets', () => {
    const plain = 'AWS_KEY=AKIAIOSFODNN7EXAMPLE';
    const encoded = Buffer.from(plain).toString('base64');
    const text = `Payload: ${encoded}`;
    
    const { redactedText, stats } = redact(text);
    expect(redactedText).toContain('[REDACTED_B64_SECRET]');
    expect(stats['AWS_KEY']).toBe(1);
  });

  it('should not redact benign base64 that does not contain secrets', () => {
    const plain = 'just some normal text without secrets';
    const encoded = Buffer.from(plain).toString('base64');
    const text = `Payload: ${encoded}`;
    
    const { redactedText, stats } = redact(text);
    expect(redactedText).toBe(`Payload: ${encoded}`);
    expect(Object.keys(stats).length).toBe(0);
  });

  it('should not catastrophically backtrack on long strings (ReDoS check)', () => {
    const start = performance.now();
    const text = 'Bearer ' + 'A'.repeat(100000);
    redact(text);
    const time = performance.now() - start;
    expect(time).toBeLessThan(100); // Should be very fast
  });
});
