export declare const REDACTION_PATTERNS: {
    name: string;
    regex: RegExp;
}[];
export type RedactionResult = {
    redactedText: string;
    stats: Record<string, number>;
};
export declare function redact(text: string): RedactionResult;
