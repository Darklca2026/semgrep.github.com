const owner = process.env.GITHUB_OWNER || 'Darklca2026';
const token = process.env.GITHUB_TOKEN;
const minSeverity = (process.env.REPO_REVIEW_MIN_SEVERITY || 'high').toLowerCase();
const createIssues = String(process.env.REPO_REVIEW_CREATE_ISSUES || 'false').toLowerCase() === 'true';

const severityRank = { note: 0, low: 1, medium: 2, warning: 2, high: 3, error: 3, critical: 4 };
const minRank = severityRank[minSeverity] ?? severityRank.high;

if (!token) {
  console.error('GITHUB_TOKEN is required. Add it as a Codespaces secret or n8n environment variable.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'n8n-repo-security-review'
};

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message || response.statusText;
    throw new Error(`${response.status} ${message} for ${path}`);
  }

  return body;
}

async function githubPaginated(path) {
  const items = [];
  let page = 1;

  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const chunk = await github(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    items.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }

  return items;
}

function repoFullName(repo) {
  return repo.full_name || `${owner}/${repo.name}`;
}

function severityOf(alert) {
  return (
    alert.rule?.security_severity_level ||
    alert.rule?.severity ||
    alert.security_advisory?.cvss?.score && Number(alert.security_advisory.cvss.score) >= 9 ? 'critical' :
    alert.security_vulnerability?.severity ||
    alert.secret_type_display_name && 'critical' ||
    'medium'
  ).toLowerCase();
}

function shouldReport(alert) {
  const severity = severityOf(alert);
  return (severityRank[severity] ?? 2) >= minRank;
}

async function safeList(path) {
  try {
    return await githubPaginated(path);
  } catch (error) {
    return { error: error.message, items: [] };
  }
}

async function ensureIssue(repo, summary) {
  if (!createIssues || summary.total === 0) return null;

  const title = `Security review: ${summary.total} alert(s) require attention`;
  const existing = await githubPaginated(`/repos/${repoFullName(repo)}/issues?state=open`);
  const found = existing.find((issue) => issue.title === title && !issue.pull_request);
  if (found) return found.html_url;

  const body = [
    'Automated n8n security review found alerts that meet the configured severity threshold.',
    '',
    `Minimum severity: ${minSeverity}`,
    '',
    `- Code scanning: ${summary.codeScanning.length}`,
    `- Dependabot: ${summary.dependabot.length}`,
    `- Secret scanning: ${summary.secretScanning.length}`,
    '',
    'Review the repository Security tab and remediate or dismiss findings with justification.'
  ].join('\n');

  const issue = await github(`/repos/${repoFullName(repo)}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels: ['security', 'automated-review'] })
  });

  return issue.html_url;
}

async function reviewRepo(repo) {
  const fullName = repoFullName(repo);
  const codeScanningResult = await safeList(`/repos/${fullName}/code-scanning/alerts?state=open`);
  const dependabotResult = await safeList(`/repos/${fullName}/dependabot/alerts?state=open`);
  const secretScanningResult = await safeList(`/repos/${fullName}/secret-scanning/alerts?state=open`);

  const codeScanning = Array.isArray(codeScanningResult) ? codeScanningResult.filter(shouldReport) : [];
  const dependabot = Array.isArray(dependabotResult) ? dependabotResult.filter(shouldReport) : [];
  const secretScanning = Array.isArray(secretScanningResult) ? secretScanningResult.filter(shouldReport) : [];

  const summary = {
    repo: fullName,
    visibility: repo.visibility,
    archived: repo.archived,
    codeScanning,
    dependabot,
    secretScanning,
    errors: [codeScanningResult, dependabotResult, secretScanningResult]
      .filter((result) => !Array.isArray(result) && result?.error)
      .map((result) => result.error)
  };
  summary.total = codeScanning.length + dependabot.length + secretScanning.length;
  summary.issue = await ensureIssue(repo, summary);
  return summary;
}

const repos = await githubPaginated(`/users/${owner}/repos?type=owner&sort=updated`);
const activeRepos = repos.filter((repo) => !repo.archived);
const results = [];

for (const repo of activeRepos) {
  results.push(await reviewRepo(repo));
}

const report = {
  owner,
  reviewedAt: new Date().toISOString(),
  repositoryCount: activeRepos.length,
  alertCount: results.reduce((sum, item) => sum + item.total, 0),
  results: results.map((item) => ({
    repo: item.repo,
    total: item.total,
    codeScanning: item.codeScanning.length,
    dependabot: item.dependabot.length,
    secretScanning: item.secretScanning.length,
    issue: item.issue || null,
    errors: item.errors
  }))
};

console.log(JSON.stringify(report, null, 2));
