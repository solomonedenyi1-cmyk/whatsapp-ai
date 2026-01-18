#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const defaultPatterns = [
    { name: 'mistral api key assignment', re: /\bMISTRAL_API_KEY\s*=\s*[^\s]+/i },
    { name: 'openai api key assignment', re: /\bOPENAI_API_KEY\s*=\s*[^\s]+/i },
    { name: 'generic sk- token', re: /\bsk-[A-Za-z0-9]{10,}\b/ },
    { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const allowlistPatterns = [
    /\bMISTRAL_API_KEY\s*=\s*your_mistral_api_key\b/i,
    /\bOPENAI_API_KEY\s*=\s*your_openai_api_key\b/i,
];

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function safeExec(cmd) {
    try {
        return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
    } catch {
        return null;
    }
}

function isProbablyText(buffer) {
    const max = Math.min(buffer.length, 1024);
    let zeros = 0;
    for (let i = 0; i < max; i += 1) {
        if (buffer[i] === 0) zeros += 1;
    }
    return zeros === 0;
}

function readStagedFile(filePath) {
    const staged = safeExec(`git show :"${filePath.replace(/"/g, '\\"')}"`);
    if (staged !== null) return staged;

    const abs = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    if (!isProbablyText(buf)) return null;
    return buf.toString('utf8');
}

function getStagedFiles() {
    const output = safeExec('git diff --cached --name-only --diff-filter=ACM');
    if (!output) return [];
    return output
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
}

function isIgnoredPath(filePath) {
    const normalized = filePath.replace(/\\/g, '/');

    if (normalized.startsWith('node_modules/')) return true;
    if (normalized.startsWith('.git/')) return true;
    if (normalized.startsWith('.wwebjs_auth/')) return true;
    if (normalized.startsWith('.wwebjs_cache/')) return true;
    if (normalized.startsWith('session/')) return true;
    if (normalized.startsWith('logs/')) return true;
    if (normalized.startsWith('data/')) return true;

    return false;
}

function findSecrets(content) {
    const matches = [];

    for (const p of defaultPatterns) {
        if (p.re.test(content) && !allowlistPatterns.some((a) => a.test(content))) {
            matches.push(p.name);
        }
    }

    return matches;
}

function main() {
    const stagedOnly = hasFlag('--staged');

    const files = stagedOnly ? getStagedFiles() : [];

    if (stagedOnly && files.length === 0) {
        process.exit(0);
    }

    const findings = [];

    for (const filePath of files) {
        if (isIgnoredPath(filePath)) continue;

        const content = readStagedFile(filePath);
        if (typeof content !== 'string') continue;

        const hits = findSecrets(content);
        if (hits.length > 0) {
            findings.push({ filePath, hits: Array.from(new Set(hits)) });
        }
    }

    if (findings.length > 0) {
        console.error('❌ Secret scan failed. Potential secrets detected in staged files:');
        for (const f of findings) {
            console.error(`- ${f.filePath}: ${f.hits.join(', ')}`);
        }
        console.error('\nFix: remove the secret, rotate the key if needed, and try committing again.');
        process.exit(1);
    }

    process.exit(0);
}

main();
