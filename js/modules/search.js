function configurarPesquisaGlobal() {
  const searchInput = document.getElementById("globalSearchInput");
  const searchResults = document.getElementById("globalSearchResults");

  if (!searchInput || !searchResults) return;

  if (searchInput.dataset.searchConfigured === "true") {
    return;
  }

  searchInput.dataset.searchConfigured = "true";

  let searchTimeout = null;

  searchInput.addEventListener("input", function () {
    const term = searchInput.value.trim();

    clearTimeout(searchTimeout);

    if (term.length < 2) {
      searchResults.classList.remove("show");
      searchResults.innerHTML = "";
      return;
    }

    searchTimeout = setTimeout(function () {
      buscarGeral(term);
    }, 400);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".search-wrapper")) {
      searchResults.classList.remove("show");
    }
  });
}

async function buscarUsuarios(term) {
  const searchResults = document.getElementById("globalSearchResults");

  if (!searchResults) return;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(6);

  if (error) {
    console.error("Erro ao pesquisar usuários:", error.message);
    return;
  }

  return users || [];
}

async function buscarGeral(term) {
  const searchResults = document.getElementById("globalSearchResults");

  if (!searchResults) return;

  searchResults.innerHTML = "";

  const { data: users } = await supabaseClient
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(4);

  const { data: hashtags } = await supabaseClient
    .from("hashtags")
    .select("*")
    .ilike("name", `%${term}%`)
    .limit(4);

  const { data: posts } = await supabaseClient
    .from("posts")
    .select("*")
    .ilike("content", `%${term}%`)
    .limit(4);

  if (users && users.length > 0) {
    searchResults.innerHTML += `
      <div class="search-section-title">Usuários</div>
    `;

    users.forEach(user => {
      searchResults.innerHTML += `
        <div class="search-result-item"
          onclick="window.location.href='../html/public-profile.html?id=${user.id}'">
          <div class="search-result-info">
            <strong>${user.full_name || "Usuário Verse"}</strong>
            <span>@${user.username || "usuario"}</span>
          </div>
        </div>
      `;
    });
  }

  if (hashtags && hashtags.length > 0) {
    searchResults.innerHTML += `
      <div class="search-section-title">Hashtags</div>
    `;

    hashtags.forEach(tag => {
      searchResults.innerHTML += `
        <div class="search-result-item"
          onclick="window.location.href='../html/hashtag.html?tag=${tag.name}'">
          <div class="search-result-info">
            <strong>#${tag.name}</strong>
          </div>
        </div>
      `;
    });
  }

  if (posts && posts.length > 0) {
    searchResults.innerHTML += `
      <div class="search-section-title">Publicações</div>
    `;

    posts.forEach(post => {
      searchResults.innerHTML += `
        <div class="search-result-item"
          onclick="window.location.href='../html/post.html?id=${post.id}'">
          <div class="search-result-info">
            <strong>${(post.content || "").substring(0, 60)}</strong>
          </div>
        </div>
      `;
    });
  }

  if (
    (!users || users.length === 0) &&
    (!hashtags || hashtags.length === 0) &&
    (!posts || posts.length === 0)
  ) {
    searchResults.innerHTML = `
      <p class="search-empty">Nenhum resultado encontrado.</p>
    `;
  }

  searchResults.classList.add("show");
}