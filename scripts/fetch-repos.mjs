// Genera data/repos-list.json con los repositorios públicos de las cuentas de data/repos.json.
// Se ejecuta en el CI antes de publicar; no tiene dependencias (usa fetch de Node 18+).
import { readFile, writeFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../data/repos.json', import.meta.url), 'utf8'));
const token = process.env.GITHUB_TOKEN;

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'portfolio-build',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function fetchAll(user) {
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed&page=${page}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`GitHub respondió ${response.status} para ${user}`);
    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

const lists = await Promise.all(config.users.map(fetchAll));
const repos = lists.flat()
  .filter((repo) => !(config.excludeForks && repo.fork))
  .map((repo) => ({
    name: repo.name,
    owner: repo.owner.login,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    pushed: repo.pushed_at,
  }))
  .sort((a, b) => b.pushed.localeCompare(a.pushed));

const output = { generatedAt: new Date().toISOString(), users: config.users, excludeForks: config.excludeForks, repos };
await writeFile(new URL('../data/repos-list.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`${repos.length} repositorios de ${config.users.join(', ')}`);
