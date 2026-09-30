#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const program = new Command();
program
  .name('ctx')
  .description('Continuum Context CLI for syncing AGENTS.md')
  .version('1.0.0');

// Load continuum settings from a local .continuumrc file or environment
function getSettings() {
  let settings: any = {
    projectId: process.env.CONTINUUM_PROJECT_ID,
    apiHost: process.env.CONTINUUM_API_HOST || 'http://localhost:3000',
    token: process.env.CONTINUUM_API_TOKEN || 'test_token'
  };

  const rcPath = path.join(process.cwd(), '.continuumrc.json');
  if (fs.existsSync(rcPath)) {
    const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    settings = { ...settings, ...rc };
  }
  return settings;
}

program
  .command('init')
  .description('Initialize a continuum project in the current directory')
  .argument('<projectId>', 'The Project ID to bind to this directory')
  .action((projectId) => {
    const rcPath = path.join(process.cwd(), '.continuumrc.json');
    const settings = {
      projectId,
      apiHost: process.env.CONTINUUM_API_HOST || 'http://localhost:3000'
    };
    fs.writeFileSync(rcPath, JSON.stringify(settings, null, 2));
    console.log(`Initialized Continuum project config at ${rcPath}`);
    console.log(`Run 'ctx sync' to generate AGENTS.md.`);
  });

program
  .command('sync')
  .description('Fetch the latest project brief and write it to AGENTS.md')
  .action(async () => {
    const settings = getSettings();
    if (!settings.projectId) {
      console.error('Error: No projectId configured. Run `ctx init <projectId>` first.');
      process.exit(1);
    }

    try {
      console.log(`Fetching project brief for project ${settings.projectId}...`);
      
      const response = await fetch(`${settings.apiHost}/api/brief?projectId=${settings.projectId}`, {
        headers: {
          'Authorization': `Bearer ${settings.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${await response.text()}`);
      }

      const briefText = await response.text();
      const agentsMdPath = path.join(process.cwd(), 'AGENTS.md');
      fs.writeFileSync(agentsMdPath, briefText);

      console.log(`Successfully synced AGENTS.md`);
    } catch (err: any) {
      console.error('Sync failed:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
