"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redaction_1 = require("../src/redaction");
(0, vitest_1.describe)('Redaction Pipeline', () => {
    (0, vitest_1.it)('should redact AWS Access Keys', () => {
        const text = 'Here is my key: AKIAIOSFODNN7EXAMPLE and some other text';
        const { redactedText, stats } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe('Here is my key: [REDACTED_AWS_KEY] and some other text');
        (0, vitest_1.expect)(stats['AWS_KEY']).toBe(1);
    });
    (0, vitest_1.it)('should redact OpenAI/Anthropic API keys', () => {
        const text = 'OPENAI_KEY=sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234';
        const { redactedText } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe('OPENAI_KEY=[REDACTED_API_KEY]');
        const antText = 'Use sk-ant-api03-abcdefg1234567890-XYZ';
        const res = (0, redaction_1.redact)(antText);
        (0, vitest_1.expect)(res.redactedText).toBe('Use [REDACTED_API_KEY]');
    });
    (0, vitest_1.it)('should redact Bearer tokens', () => {
        const text = 'Authorization: Bearer abcdef12345.eyJh.bGc';
        const { redactedText } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe('Authorization: Bearer [REDACTED_TOKEN]');
    });
    (0, vitest_1.it)('should redact Private Keys', () => {
        const text = 'Some text\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\nMore text';
        const { redactedText } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe('Some text\n[REDACTED_PRIVATE_KEY]\nMore text');
    });
    (0, vitest_1.it)('should redact database connection string passwords', () => {
        const text = 'postgres://user:supersecretpass@localhost:5432/mydb';
        const { redactedText } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe('postgres://user:[REDACTED_PASSWORD]@localhost:5432/mydb');
    });
    (0, vitest_1.it)('should redact emails, SSNs and phones', () => {
        const text = 'Contact john.doe@example.com or +14155552671. SSN is 123-45-6789.';
        const { redactedText, stats } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toContain('[REDACTED_EMAIL]');
        (0, vitest_1.expect)(redactedText).toContain('[REDACTED_PHONE]');
        (0, vitest_1.expect)(redactedText).toContain('[REDACTED_SSN]');
    });
    (0, vitest_1.it)('should handle URL-encoded secrets', () => {
        const plain = 'AKIAIOSFODNN7EXAMPLE';
        const encoded = encodeURIComponent(`my key is ${plain}`);
        const text = `Look at this payload: ${encoded}`;
        const { redactedText, stats } = (0, redaction_1.redact)(text);
        // Should redact inside and re-encode
        (0, vitest_1.expect)(redactedText).toContain(encodeURIComponent('my key is [REDACTED_AWS_KEY]'));
        (0, vitest_1.expect)(stats['AWS_KEY']).toBe(1);
    });
    (0, vitest_1.it)('should handle Base64-encoded secrets', () => {
        const plain = 'AWS_KEY=AKIAIOSFODNN7EXAMPLE';
        const encoded = Buffer.from(plain).toString('base64');
        const text = `Payload: ${encoded}`;
        const { redactedText, stats } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toContain('[REDACTED_B64_SECRET]');
        (0, vitest_1.expect)(stats['AWS_KEY']).toBe(1);
    });
    (0, vitest_1.it)('should not redact benign base64 that does not contain secrets', () => {
        const plain = 'just some normal text without secrets';
        const encoded = Buffer.from(plain).toString('base64');
        const text = `Payload: ${encoded}`;
        const { redactedText, stats } = (0, redaction_1.redact)(text);
        (0, vitest_1.expect)(redactedText).toBe(`Payload: ${encoded}`);
        (0, vitest_1.expect)(Object.keys(stats).length).toBe(0);
    });
    (0, vitest_1.it)('should not catastrophically backtrack on long strings (ReDoS check)', () => {
        const start = performance.now();
        const text = 'Bearer ' + 'A'.repeat(100000);
        (0, redaction_1.redact)(text);
        const time = performance.now() - start;
        (0, vitest_1.expect)(time).toBeLessThan(100); // Should be very fast
    });
});
