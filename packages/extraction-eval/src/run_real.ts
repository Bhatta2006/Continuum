import fs from 'fs';
import path from 'path';
import { createOpenAI } from '@ai-sdk/openai';
import { MemoryExtractor, CostTracker } from './extractor';
import { EvalHarness, GroundTruthSession } from './eval_harness';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function main() {
  const dataDir = path.join(__dirname, '../data/transcripts');
  const labelsFile = path.join(__dirname, '../data/labels.json');

  if (!fs.existsSync(dataDir) || !fs.existsSync(labelsFile)) {
    console.log(`Data not found.`);
    return;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
  const groundTruth: GroundTruthSession[] = JSON.parse(fs.readFileSync(labelsFile, 'utf8'));
  const harness = new EvalHarness(groundTruth);
  const tracker = new CostTracker(5.0);
  
  const extractor = new MemoryExtractor(null, tracker);

  console.log("=========================================================");
  console.log("WARNING: RESULTS ON THIS DATA ARE FOR HARNESS VALIDATION ONLY.");
  console.log("THEY MUST NOT BE REPORTED AS THE FINAL M4 GATE RESULTS.");
  console.log("=========================================================\n");

  const scores: any[] = [];
  const tuneScores: any[] = [];

  for (const file of files) {
    const sessionId = file.replace('.txt', '');
    const split = harness.getSplit(sessionId);
    
    console.log(`\nSession: ${sessionId} (${split} set)`);

    const transcriptPath = path.join(dataDir, file);
    const transcript = fs.readFileSync(transcriptPath, 'utf8');

    try {
      const { facts, metadata, redactedText } = await extractor.extract(transcript, sessionId, false);
      
      console.log(`Extracted ${facts.length} facts. Token usage: ${metadata.usage?.promptTokens} in / ${metadata.usage?.completionTokens} out`);
      console.log(`Redaction replacements: ${Object.values(metadata.stats || {}).reduce((a: any,b: any)=>a+b, 0)}`);
      
      const score = harness.score(sessionId, facts);
      console.log(`Score: TP=${score.truePositives}, FP=${score.falsePositives}, FN=${score.falseNegatives}`);
      if (score.injectionFailures > 0) console.log(`[!] Injection Failures: ${score.injectionFailures}`);
      if (score.reversedExtracted > 0) console.log(`[!] Reversed Facts Extracted: ${score.reversedExtracted}`);
      
      if (split === 'holdout') scores.push(score);
      if (split === 'tune') tuneScores.push(score);

    } catch (e: any) {
      console.error(`Error processing ${sessionId}:`, e.message);
      if (e.name === 'CircuitBreakerError') break;
    }
  }

  if (tuneScores.length > 0) {
    const agg = harness.aggregate(tuneScores);
    console.log("\n=== TUNE SET RESULTS ===");
    console.log(`Precision: ${(agg.precision * 100).toFixed(1)}%, Recall: ${(agg.recall * 100).toFixed(1)}%`);
    console.log(`Reversed Extracted: ${agg.reversedExtracted}, Injection Failures: ${agg.injectionFailures}`);
  }

  if (scores.length > 0) {
    const agg = harness.aggregate(scores);
    console.log("\n=== HOLDOUT SET RESULTS (VALIDATION ONLY) ===");
    console.log(`Precision: ${(agg.precision * 100).toFixed(1)}% (Target: >80%)`);
    console.log(`Recall: ${(agg.recall * 100).toFixed(1)}% (Target: >60%)`);
    console.log(`Reversed Extracted: ${agg.reversedExtracted}`);
    console.log(`Injection Failures: ${agg.injectionFailures}`);
  }
  
  console.log(`\nTotal Execution Cost: $${tracker.getCost().toFixed(4)}`);
}

main().catch(console.error);
