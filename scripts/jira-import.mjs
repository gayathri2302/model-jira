#!/usr/bin/env node
/**
 * Jira → model-jira importer
 *
 * Reads credentials from scripts/.env (copy scripts/.env.example and fill in values).
 *
 * Usage:
 *   node scripts/jira-import.mjs --jql 'status = "QA Defect" and ...'
 *
 * Optional overrides:
 *   --jira-url      Jira base URL
 *   --user          Jira username
 *   --pass          Jira password
 *   --project       Project key (e.g. NGSB)
 *   --project-name  Project display name
 *   --db-url        DB connection string
 *   --owner-id      UUID of the user to own the project (defaults to first user in DB)
 *
 * What it does:
 *   1. Fetches all tickets matching the JQL (handles pagination)
 *   2. Fetches epic titles for every epic key referenced
 *   3. Creates (or reuses) a project in model-jira DB
 *   4. Creates default statuses for the project
 *   5. Creates epics
 *   6. Creates tickets linked to their epics
 *   7. Prints a summary
 */

import sql from 'mssql';
import https from 'https';
import { URL } from 'url';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── LOAD .env ────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

// Load scripts/.env first, fall back to server/.env
const env = {
  ...loadEnv(resolve(__dir, '../server/.env')),
  ...loadEnv(resolve(__dir, '.env')),
};

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const config = {
  jiraUrl:     getArg('--jira-url')     || env.JIRA_URL     || '',
  user:        getArg('--user')         || env.JIRA_USER    || '',
  pass:        getArg('--pass')         || env.JIRA_PASS    || '',
  projectKey:  getArg('--project')      || env.JIRA_PROJECT_KEY  || 'IMPORT',
  projectName: getArg('--project-name') || env.JIRA_PROJECT_NAME || 'Imported Project',
  dbUrl:       getArg('--db-url')       || env.DATABASE_URL || '',
  ownerId:     getArg('--owner-id')     || env.IMPORT_OWNER_ID || null,
  jql:         getArg('--jql')          || null,
};

if (!config.jiraUrl) { console.error('ERROR: JIRA_URL missing from .env or --jira-url flag'); process.exit(1); }
if (!config.user)    { console.error('ERROR: JIRA_USER missing from .env or --user flag'); process.exit(1); }
if (!config.pass)    { console.error('ERROR: JIRA_PASS missing from .env or --pass flag'); process.exit(1); }
if (!config.dbUrl)   { console.error('ERROR: DATABASE_URL missing from .env or --db-url flag'); process.exit(1); }
if (!config.jql) {
  console.error('ERROR: --jql is required. Example:');
  console.error('  node scripts/jira-import.mjs --jql \'status = "QA Defect" and ...\'');
  process.exit(1);
}

// ─── JIRA API ─────────────────────────────────────────────────────────────────

function jiraFetch(path, params = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, config.jiraUrl);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const auth = Buffer.from(`${config.user}:${config.pass}`).toString('base64');
    const req = https.get(u.toString(), { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse error: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
  });
}

async function fetchAllTickets(jql) {
  const fields = 'summary,status,priority,issuetype,assignee,reporter,description,customfield_11240';
  let startAt = 0, all = [];
  while (true) {
    console.log(`  Fetching tickets ${startAt}–${startAt + 100}…`);
    const data = await jiraFetch('/rest/api/2/search', { jql, fields, maxResults: 100, startAt });
    if (data.errorMessages) throw new Error(data.errorMessages.join(', '));
    all = all.concat(data.issues || []);
    if (all.length >= data.total) break;
    startAt += 100;
  }
  console.log(`  Total tickets fetched: ${all.length}`);
  return all;
}

async function fetchEpicTitles(epicKeys) {
  if (!epicKeys.length) return {};
  const jql = `key in (${epicKeys.join(',')})`;
  const data = await jiraFetch('/rest/api/2/search', { jql, fields: 'summary,customfield_10011', maxResults: 100 });
  const map = {};
  for (const issue of data.issues || []) {
    map[issue.key] = issue.fields.customfield_10011 || issue.fields.summary || issue.key;
  }
  return map;
}

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

function parseDbUrl(url) {
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const [hostPort, ...paramParts] = withoutScheme.split(';');
  const [server, portStr] = hostPort.split(':');
  const params = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq !== -1) params[part.slice(0, eq).toLowerCase()] = part.slice(eq + 1);
  }
  return {
    server, port: portStr ? parseInt(portStr) : 1433,
    database: params['database'], user: params['user'], password: params['password'],
    options: { encrypt: params['encrypt'] !== 'false', trustServerCertificate: params['trustservercertificate'] === 'true' },
  };
}

async function getPool() {
  const pool = new sql.ConnectionPool(parseDbUrl(config.dbUrl));
  await pool.connect();
  return pool;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Map Jira priority → our priority enum
function mapPriority(jiraPriority) {
  const p = (jiraPriority || '').toLowerCase();
  if (p === 'critical' || p === 'blocker') return 'critical';
  if (p === 'high' || p === 'major') return 'high';
  if (p === 'low' || p === 'minor' || p === 'trivial') return 'low';
  return 'medium';
}

// Map Jira issue type → our type enum
function mapType(jiraType) {
  const t = (jiraType || '').toLowerCase();
  if (t === 'bug' || t === 'defect') return 'bug';
  if (t === 'story' || t === 'user story') return 'story';
  return 'task';
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══ Jira → model-jira Importer ═══\n');
  console.log(`JQL: ${config.jql}\n`);

  // 1. Fetch Jira data
  console.log('Step 1: Fetching tickets from Jira…');
  const tickets = await fetchAllTickets(config.jql);

  // Collect unique epic keys
  const epicKeys = [...new Set(tickets.map(t => t.fields.customfield_11240).filter(Boolean))];
  console.log(`\nStep 2: Fetching ${epicKeys.length} epic titles…`);
  const epicTitles = await fetchEpicTitles(epicKeys);
  for (const [k, v] of Object.entries(epicTitles)) console.log(`  ${k} → ${v.slice(0, 60)}`);

  // 2. Connect to DB
  console.log('\nStep 3: Connecting to database…');
  const pool = await getPool();
  console.log('  Connected.');

  // 3. Get or create owner user
  let ownerId = config.ownerId;
  if (!ownerId) {
    const res = await pool.request().query('SELECT TOP 1 id FROM mj_users WHERE deleted_at IS NULL ORDER BY created_at');
    if (!res.recordset.length) throw new Error('No users in DB — create a user first via /register');
    ownerId = res.recordset[0].id;
    console.log(`\n  Using owner: ${ownerId}`);
  }

  // 4. Create or reuse project
  console.log(`\nStep 4: Creating project "${config.projectName}" (${config.projectKey})…`);
  let projectId;
  const existingProj = await pool.request()
    .input('key', sql.NVarChar, config.projectKey)
    .query('SELECT id FROM mj_projects WHERE project_key = @key AND deleted_at IS NULL');
  if (existingProj.recordset.length) {
    projectId = existingProj.recordset[0].id;
    console.log(`  Reusing existing project: ${projectId}`);
  } else {
    const res = await pool.request()
      .input('id', sql.UniqueIdentifier, uuid())
      .input('key', sql.NVarChar, config.projectKey)
      .input('name', sql.NVarChar, config.projectName)
      .input('ownerId', sql.UniqueIdentifier, ownerId)
      .query(`INSERT INTO mj_projects (id, project_key, project_name, owner_id)
              OUTPUT INSERTED.id VALUES (@id, @key, @name, @ownerId)`);
    projectId = res.recordset[0].id;
    console.log(`  Created project: ${projectId}`);
  }

  // 5. Create default statuses (if not exist)
  console.log('\nStep 5: Setting up statuses…');
  const statusDefs = [
    { name: 'To Do',      color: '#DFE1E6', position: 1, category: 'todo' },
    { name: 'In Progress',color: '#0052CC', position: 2, category: 'in_progress' },
    { name: 'QA Defect',  color: '#DE350B', position: 3, category: 'in_progress' },
    { name: 'Done',       color: '#36B37E', position: 4, category: 'done' },
  ];
  const existingStatuses = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query('SELECT name, id FROM mj_statuses WHERE project_id = @projectId');
  const statusMap = {};
  for (const s of existingStatuses.recordset) statusMap[s.name] = s.id;

  for (const def of statusDefs) {
    if (!statusMap[def.name]) {
      const id = uuid();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('projectId', sql.UniqueIdentifier, projectId)
        .input('name', sql.NVarChar, def.name)
        .input('color', sql.NVarChar, def.color)
        .input('position', sql.Int, def.position)
        .input('category', sql.NVarChar, def.category)
        .query('INSERT INTO mj_statuses (id, project_id, name, color, position, category) VALUES (@id, @projectId, @name, @color, @position, @category)');
      statusMap[def.name] = id;
      console.log(`  Created status: ${def.name}`);
    } else {
      console.log(`  Reusing status: ${def.name}`);
    }
  }

  const qaDefectStatusId = statusMap['QA Defect'] || statusMap['To Do'];

  // 6. Create epics
  console.log('\nStep 6: Creating epics…');
  const epicColors = ['#0052CC', '#36B37E', '#FF991F', '#DE350B', '#6554C0', '#00B8D9', '#57D9A3'];
  const epicIdMap = {}; // jiraEpicKey → our DB epic id
  let colorIdx = 0;

  for (const [jiraKey, title] of Object.entries(epicTitles)) {
    const existing = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .input('title', sql.NVarChar, title)
      .query('SELECT id FROM mj_epics WHERE project_id = @projectId AND title = @title AND deleted_at IS NULL');
    if (existing.recordset.length) {
      epicIdMap[jiraKey] = existing.recordset[0].id;
      console.log(`  Reusing epic: ${title.slice(0, 60)}`);
    } else {
      const id = uuid();
      const color = epicColors[colorIdx++ % epicColors.length];
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('projectId', sql.UniqueIdentifier, projectId)
        .input('title', sql.NVarChar, title)
        .input('color', sql.NVarChar, color)
        .query(`INSERT INTO mj_epics (id, project_id, title, color) VALUES (@id, @projectId, @title, @color)`);
      epicIdMap[jiraKey] = id;
      console.log(`  Created epic: ${title.slice(0, 60)}`);
    }
  }

  // 7. Find or create users for assignees/reporters
  console.log('\nStep 7: Mapping users…');
  const userMap = {}; // displayName → our DB user id
  const allUsers = await pool.request().query('SELECT id, name FROM mj_users WHERE deleted_at IS NULL');
  for (const u of allUsers.recordset) userMap[u.name] = u.id;

  // 7.5 Create an active sprint (or reuse existing active sprint)
  console.log('\nStep 7.5: Setting up active sprint…');
  let sprintId;
  const existingSprint = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query(`SELECT TOP 1 id FROM mj_sprints WHERE project_id = @projectId AND status = 'active'`);
  if (existingSprint.recordset.length) {
    sprintId = existingSprint.recordset[0].id;
    console.log(`  Reusing active sprint: ${sprintId}`);
  } else {
    sprintId = uuid();
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    await pool.request()
      .input('id',        sql.UniqueIdentifier, sprintId)
      .input('projectId', sql.UniqueIdentifier, projectId)
      .input('name',      sql.NVarChar, `${config.projectKey} Sprint 1`)
      .input('goal',      sql.NVarChar, 'QA Defect resolution')
      .input('startDate', sql.Date, today)
      .input('endDate',   sql.Date, endDate)
      .input('createdBy', sql.UniqueIdentifier, ownerId)
      .query(`INSERT INTO mj_sprints (id, project_id, name, goal, start_date, end_date, status, created_by)
              VALUES (@id, @projectId, @name, @goal, @startDate, @endDate, 'active', @createdBy)`);
    console.log(`  Created active sprint: ${config.projectKey} Sprint 1 (${today} → ${endDate})`);
  }

  // 8. Create tickets
  console.log('\nStep 8: Creating tickets…');
  let created = 0, skipped = 0;

  for (const issue of tickets) {
    const f = issue.fields;

    // skip if already imported (match on ticket_number)
    const exists = await pool.request()
      .input('num', sql.NVarChar, issue.key)
      .query('SELECT id FROM mj_tickets WHERE ticket_number = @num AND deleted_at IS NULL');
    if (exists.recordset.length) { console.log(`  Skip (exists): ${issue.key}`); skipped++; continue; }

    const epicKey = f.customfield_11240;
    const epicId  = epicKey ? (epicIdMap[epicKey] || null) : null;
    const assigneeId = f.assignee ? (userMap[f.assignee.displayName] || null) : null;
    const reporterId = f.reporter ? (userMap[f.reporter.displayName] || ownerId) : ownerId;

    await pool.request()
      .input('id',          sql.UniqueIdentifier, uuid())
      .input('ticketNum',   sql.NVarChar,         issue.key)
      .input('projectId',   sql.UniqueIdentifier, projectId)
      .input('title',       sql.NVarChar,         f.summary)
      .input('description', sql.NVarChar,         f.description || null)
      .input('type',        sql.NVarChar,         mapType(f.issuetype?.name))
      .input('priority',    sql.NVarChar,         mapPriority(f.priority?.name))
      .input('statusId',    sql.UniqueIdentifier, qaDefectStatusId)
      .input('epicId',      epicId ? sql.UniqueIdentifier : sql.NVarChar, epicId)
      .input('assigneeId',  assigneeId ? sql.UniqueIdentifier : sql.NVarChar, assigneeId)
      .input('reporterId',  sql.UniqueIdentifier, reporterId)
      .input('sprintId',    sql.UniqueIdentifier, sprintId)
      .query(`INSERT INTO mj_tickets
                (id, ticket_number, project_id, title, description, type, priority, status_id, epic_id, assignee_id, reporter_id, sprint_id)
              VALUES
                (@id, @ticketNum, @projectId, @title, @description, @type, @priority, @statusId, @epicId, @assigneeId, @reporterId, @sprintId)`);

    console.log(`  Created: ${issue.key} — ${f.summary.slice(0, 60)}`);
    created++;
  }

  await pool.close();

  console.log(`
═══ Import Complete ═══
  Project:  ${config.projectName} (${config.projectKey})
  Epics:    ${Object.keys(epicIdMap).length}
  Sprint:   ${config.projectKey} Sprint 1 (active)
  Tickets:  ${created} created, ${skipped} already existed
═══════════════════════
`);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
