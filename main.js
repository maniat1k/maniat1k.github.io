const user = "maniat1k";
const cacheKey = "github_repo_cache";
const cacheTimeKey = "github_repo_cache_time";
const cacheDuration = 60 * 60 * 1000;

async function fetchCommitCount(repo) {
  const response = await fetch(`https://api.github.com/repos/${user}/${repo.name}/commits?per_page=1`);
  const linkHeader = response.headers.get('Link');
  if (linkHeader) {
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1]) : 1;
  }
  return 1;
}

async function renderRepoList(data) {
  const list = document.getElementById("repo-list");
  list.innerHTML = "<li>Cargando estadísticas...</li>";

  const publicRepos = data.filter(repo => !repo.private);
  const reposWithCommits = await Promise.all(publicRepos.map(async repo => {
    const commitCount = await fetchCommitCount(repo);
    return { ...repo, commitCount };
  }));

  reposWithCommits.sort((a, b) => b.commitCount - a.commitCount);

  list.innerHTML = "";
  reposWithCommits.forEach(repo => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = repo.html_url;
    link.textContent = `📦 ${repo.name} — ${repo.commitCount} commits`;
    link.target = "_blank";
    li.appendChild(link);
    list.appendChild(li);
  });
}

async function fetchAllRepos() {
  try {
    const response = await fetch(`https://api.github.com/users/${user}/repos?per_page=100`);
    const data = await response.json();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    renderRepoList(data);
  } catch (error) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) renderRepoList(JSON.parse(cached));
  }
}

const lastFetch = localStorage.getItem(cacheTimeKey);
if (!lastFetch || Date.now() - lastFetch > cacheDuration) {
  fetchAllRepos();
} else {
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    renderRepoList(JSON.parse(cached));
    fetchAllRepos();
  } else {
    fetchAllRepos();
  }
}

async function fetchRedditPosts() {
  try {
    const res = await fetch("https://www.reddit.com/user/maniat1k13/submitted.json");
    const data = await res.json();
    const posts = data.data.children.map(post => ({
      date: new Date(post.data.created_utc * 1000),
      title: post.data.title,
      url: `https://www.reddit.com${post.data.permalink}`,
      type: "Reddit",
      icon: "👽"
    }));

    renderEntries(posts);
  } catch (e) {
    document.getElementById("contenido-dinamico").innerText = "No se pudieron cargar entradas.";
  }
}

function renderEntries(entries) {
  const cont = document.getElementById("contenido-dinamico");
  entries.sort((a, b) => b.date - a.date);

  cont.innerHTML = entries.map(entry => \`
    <div style="margin-bottom: 1rem;">
      <strong>\${entry.icon}</strong>
      <a href="\${entry.url}" target="_blank">\${entry.title}</a><br>
      <small>\${entry.date.toLocaleDateString("es-UY")}</small>
    </div>
  \`).join("");
}

fetchRedditPosts();