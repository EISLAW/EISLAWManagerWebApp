import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { spawn } from 'child_process';
import { chromium } from 'playwright';

console.error('[mcp-local] starting server bootstrap');
const server = new McpServer({
  name: 'eislaw-mcp-local',
  version: '0.1.0'
}, { capabilities: { logging: {} } });

function ok(result){ return { content: [{ type: 'text', text: JSON.stringify(result) }] } }
function err(message){ return { isError: true, content: [{ type: 'text', text: message }] } }

server.registerTool('read_file', {
  title: 'Read File',
  description: 'Read a UTF-8 file from disk',
  inputSchema: { path: z.string().describe('Absolute or relative path') }
}, async ({ path: p }) => {
  try{ const data = await fs.readFile(p, 'utf-8'); return ok({ path: p, data }) } catch(e){ return err(String(e)) }
});
console.error('[mcp-local] registered: read_file');

server.registerTool('write_file', {
  title: 'Write File',
  description: 'Write UTF-8 content to file, creating parents',
  inputSchema: { path: z.string(), data: z.string() }
}, async ({ path: p, data }) => {
  try{ await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, data, 'utf-8'); return ok({ path: p, bytes: data.length }) } catch(e){ return err(String(e)) }
});
console.error('[mcp-local] registered: write_file');

server.registerTool('list_dir', {
  title: 'List Directory',
  description: 'List directory entries with basic stats',
  inputSchema: { path: z.string() }
}, async ({ path: p }) => {
  try{ const names = await fs.readdir(p, { withFileTypes: true });
    const entries = [];
    for(const d of names){ entries.push({ name: d.name, type: d.isDirectory()? 'dir':'file' }) }
    return ok({ path: p, entries })
  } catch(e){ return err(String(e)) }
});
console.error('[mcp-local] registered: list_dir');

server.registerTool('open_path', {
  title: 'Open Path',
  description: 'Open a path in the OS file explorer or default app.',
  inputSchema: { path: z.string() }
}, async ({ path: p }) => {
  try{
    if(!existsSync(p)) throw new Error('Path not found');
    if(process.platform === 'win32') spawn('explorer.exe', ['"' + p + '"'], { shell:true, detached:true });
    else if(process.platform === 'darwin') spawn('open', [p], { detached:true });
    else spawn('xdg-open', [p], { detached:true });
    return ok({ opened: p })
  } catch(e){ return err(String(e)) }
});
console.error('[mcp-local] registered: open_path');

server.registerTool('open_url', {
  title: 'Open URL',
  description: 'Open a URL in the default browser.',
  inputSchema: { url: z.string() }
}, async ({ url }) => {
  try{
    if(process.platform === 'win32') spawn('cmd', ['/c','start','',url], { detached:true });
    else if(process.platform === 'darwin') spawn('open', [url], { detached:true });
    else spawn('xdg-open', [url], { detached:true });
    return ok({ opened: url })
  } catch(e){ return err(String(e)) }
});
console.error('[mcp-local] registered: open_url');

server.registerTool('run_powershell', {
  title: 'Run PowerShell',
  description: 'Run a short PowerShell command and capture stdout (Windows only).',
  inputSchema: { command: z.string() }
}, async ({ command }) => {
  if(process.platform !== 'win32') return err('Windows only');
  return new Promise((resolve) => {
    const child = spawn('powershell', ['-NoProfile','-Command', command], { stdio:['ignore','pipe','pipe'] });
    let out=''; let errS='';
    child.stdout.on('data', d=> out += d.toString());
    child.stderr.on('data', d=> errS += d.toString());
    child.on('close', code => {
      if(code===0) resolve(ok({ stdout: out.trim() })); else resolve(err(errS || ('exit '+code)))
    });
  });
});
console.error('[mcp-local] registered: run_powershell');

server.registerTool('browser_probe', {
  title: 'Browser Probe',
  description: 'Open a page headless and return title, html length, and a screenshot path',
  inputSchema: { url: z.string() }
}, async ({ url }) => {
  try {
    const serverDir = path.dirname(fileURLToPath(import.meta.url));
    const outDir = path.resolve(serverDir, 'out');
    await fs.mkdir(outDir, { recursive: true });
    const shot = path.join(outDir, `snap-${Date.now()}.png`);
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    await page.screenshot({ path: shot, fullPage: true });
    const htmlLen = await page.evaluate(() => document.documentElement.outerHTML.length);
    await browser.close();
    return ok({ url, status: resp?.status?.(), title, htmlLen, screenshot: shot });
  } catch (e) { return err(String(e)) }
});
console.error('[mcp-local] registered: browser_probe');

// Simple web search via DuckDuckGo Instant Answer API
server.registerTool('ddg_search', {
  title: 'DuckDuckGo Search',
  description: 'Search DuckDuckGo Instant Answer API and return top related topics',
  inputSchema: { q: z.string() }
}, async ({ q }) => {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'eislaw-mcp-local/0.1' } });
    const j = await r.json();
    const out = {
      heading: j.Heading,
      abstract: j.AbstractText,
      results: (j.RelatedTopics || []).slice(0, 5).map(x => ({
        text: x.Text || (x.Topics && x.Topics[0]?.Text) || '',
        url: x.FirstURL || (x.Topics && x.Topics[0]?.FirstURL) || ''
      }))
    };
    return ok(out);
  } catch (e) { return err(String(e)) }
});
console.error('[mcp-local] registered: ddg_search');

function loadGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
    const secPath = path.join(repoRoot, 'secrets.local.json');
    if (existsSync(secPath)) {
      const j = JSON.parse(readFileSync(secPath, 'utf-8'));
      return j.github_pat || (j.github && j.github.pat) || null;
    }
  } catch {}
  return null;
}

async function ghFetch(pathname, init) {
  const token = loadGitHubToken();
  if (!token) throw new Error('Missing GitHub token (set GITHUB_TOKEN or secrets.local.json.github_pat)');
  const H = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'eislaw-mcp-local/0.1' };
  const res = await fetch(`https://api.github.com${pathname}`, { ...(init||{}), headers: { ...(init?.headers||{}), ...H } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub ${res.status}: ${t}`);
  }
  return res.json();
}

server.registerTool('github_list_issues', {
  title: 'GitHub List Issues',
  description: 'List open issues for a repo',
  inputSchema: { owner: z.string(), repo: z.string(), state: z.string().optional() }
}, async ({ owner, repo, state }) => {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/issues?state=${encodeURIComponent(state||'open')}&per_page=20`);
    const out = data.map(i => ({ number: i.number, title: i.title, state: i.state, url: i.html_url }));
    return ok(out);
  } catch (e) { return err(String(e)) }
});
console.error('[mcp-local] registered: github_list_issues');

server.registerTool('github_create_issue', {
  title: 'GitHub Create Issue',
  description: 'Create an issue in a repo',
  inputSchema: { owner: z.string(), repo: z.string(), title: z.string(), body: z.string().optional() }
}, async ({ owner, repo, title, body }) => {
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/issues`, { method: 'POST', body: JSON.stringify({ title, body }) });
    return ok({ number: data.number, url: data.html_url });
  } catch (e) { return err(String(e)) }
});
console.error('[mcp-local] registered: github_create_issue');

const transport = new StdioServerTransport();
console.error('[mcp-local] connecting transport (stdio)');
server.connect(transport).then(() => console.error('[mcp-local] server connected')).catch(e => console.error('[mcp-local] connect error', e));
