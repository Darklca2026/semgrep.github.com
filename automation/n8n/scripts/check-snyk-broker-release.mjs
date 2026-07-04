const feedUrl = process.env.SNYK_BROKER_RELEASES_FEED || 'https://github.com/snyk/broker/releases.atom';
const currentVersion = (process.env.SNYK_BROKER_CURRENT_VERSION || '').replace(/^v/, '');
const brokerImageTag = process.env.SNYK_BROKER_IMAGE_TAG || 'github-enterprise';

function pick(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : null;
}

function parseLatestEntry(atom) {
  const entry = pick(atom, /<entry>([\s\S]*?)<\/entry>/);
  if (!entry) throw new Error('No release entries found in Atom feed.');

  const title = pick(entry, /<title>([\s\S]*?)<\/title>/)?.trim();
  const updated = pick(entry, /<updated>([\s\S]*?)<\/updated>/)?.trim();
  const link = pick(entry, /<link[^>]*href="([^"]+)"/);
  const version = title?.match(/v?(\d+\.\d+\.\d+)/)?.[1] || null;

  if (!version) throw new Error(`Could not parse version from latest release title: ${title || 'unknown'}`);
  return { title, version, updated, link };
}

function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const response = await fetch(feedUrl, {
  headers: { 'User-Agent': 'n8n-snyk-broker-release-monitor' }
});

if (!response.ok) {
  throw new Error(`Failed to fetch ${feedUrl}: ${response.status} ${response.statusText}`);
}

const latest = parseLatestEntry(await response.text());
const updateAvailable = currentVersion ? compareVersions(latest.version, currentVersion) > 0 : true;

const report = {
  checkedAt: new Date().toISOString(),
  feedUrl,
  latest,
  currentVersion: currentVersion || null,
  updateAvailable,
  brokerImageTag,
  classicBrokerUpdateCommands: [
    `docker pull snyk/broker:${brokerImageTag}`,
    'docker compose pull snyk-broker',
    'docker compose up -d snyk-broker'
  ],
  universalBrokerNote: 'For Universal Broker, use snyk-broker-config workflows connections update / deployments update according to your Snyk tenant setup.'
};

console.log(JSON.stringify(report, null, 2));

if (updateAvailable) {
  process.exitCode = 2;
}
