"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicConflictDetector = exports.LLMConflictDetector = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
class LLMConflictDetector {
    model;
    constructor(model) {
        this.model = model;
    }
    async checkConflict(factA, factB) {
        const { object } = await (0, ai_1.generateObject)({
            model: this.model,
            schema: zod_1.z.object({
                isConflict: zod_1.z.boolean().describe('True if the two facts directly contradict or cannot both be true simultaneously in the same context.'),
                reason: zod_1.z.string().describe('A short explanation of why they conflict or why they do not.')
            }),
            prompt: `Analyze the following two facts for contradictions.
Fact A: "${factA}"
Fact B: "${factB}"

Are these facts in direct conflict? Note: refinement (Fact B adds more detail to Fact A) is NOT a conflict. Only mutually exclusive statements are conflicts.`
        });
        return object;
    }
}
exports.LLMConflictDetector = LLMConflictDetector;
// For unit testing without an LLM
class HeuristicConflictDetector {
    async checkConflict(factA, factB) {
        const aLower = factA.toLowerCase();
        const bLower = factB.toLowerCase();
        // Naive heuristic: if one is exact negation of the other
        const negations = ['do not', 'dont', "don't", 'never', 'should not', 'cannot'];
        for (const neg of negations) {
            if (aLower.includes(neg) && !bLower.includes(neg) && aLower.replace(neg, '').trim() === bLower.trim()) {
                return { isConflict: true, reason: 'Exact negation detected' };
            }
            if (bLower.includes(neg) && !aLower.includes(neg) && bLower.replace(neg, '').trim() === aLower.trim()) {
                return { isConflict: true, reason: 'Exact negation detected' };
            }
        }
        // Specific hardcoded test cases
        if (aLower.includes('use postgres') && bLower.includes('do not use postgres'))
            return { isConflict: true, reason: 'Test conflict' };
        if (aLower.includes('do not use postgres') && bLower.includes('use postgres'))
            return { isConflict: true, reason: 'Test conflict' };
        return { isConflict: false };
    }
}
exports.HeuristicConflictDetector = HeuristicConflictDetector;
