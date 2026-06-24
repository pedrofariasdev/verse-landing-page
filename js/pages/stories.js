console.log("stories.js carregado!");

let historiasPublicas = [];
let ordenacaoAtual = "recent";

async function iniciarStoriesPage() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  configurarOrdenacaoHistorias();

  await carregarHistoriasPublicas();
}

async function carregarHistoriasPublicas() {
  const storiesGrid = document.getElementById("storiesGrid");

  if (!storiesGrid) return;

  storiesGrid.innerHTML = "<p>Carregando histórias...</p>";

  const { data: stories, error } = await supabaseClient
    .from("stories")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar histórias:", error.message);
    storiesGrid.innerHTML = "<p>Não foi possível carregar as histórias.</p>";
    return;
  }

  historiasPublicas = stories || [];

  renderizarHistoriasPublicas();
}

function renderizarHistoriasPublicas() {
  const storiesGrid = document.getElementById("storiesGrid");

  if (!storiesGrid) return;

  const stories = ordenarHistorias([...historiasPublicas]);

  if (!stories || stories.length === 0) {
    storiesGrid.innerHTML = `
      <div class="stories-empty">
        <h3>Nenhuma história publicada ainda.</h3>
        <p>Quando autores publicarem histórias, elas aparecerão aqui.</p>
      </div>
    `;
    return;
  }

  storiesGrid.innerHTML = "";

  stories.forEach(function (story) {
    const card = document.createElement("article");
    card.classList.add("story-card");

    const firstLetter = story.title
      ? story.title.charAt(0).toUpperCase()
      : "V";

    const coverHTML = story.cover_url
      ? `<img class="story-cover-img" src="${story.cover_url}" alt="Capa de ${story.title}">`
      : firstLetter;

    card.innerHTML = `
      <div class="story-cover">
        ${coverHTML}

        <div class="story-overlay">
          <button
            type="button"
            class="story-read-btn"
            data-story-id="${story.id}">
            Ler História
          </button>
        </div>
      </div>

      <div class="story-card-body">
        <h3>${story.title || "História sem título"}</h3>

        <span class="story-author">
          Autor Verse
        </span>

        <div class="story-meta">
          <span>👁 ${story.views_count || 0}</span>
          <span>❤️ ${story.favorites_count || 0}</span>
          <span>💬 ${story.comments_count || 0}</span>
          <span>⭐ ${story.rating_average || "0.0"}</span>
        </div>

        <span class="story-status">
          ${formatarStatusHistoria(story.status)}
        </span>
      </div>
    `;

    storiesGrid.appendChild(card);
  });

  configurarAcoesHistoriasPublicas();
}

function ordenarHistorias(stories) {
  if (ordenacaoAtual === "views") {
    return stories.sort(function (a, b) {
      return (b.views_count || 0) - (a.views_count || 0);
    });
  }

  if (ordenacaoAtual === "rating") {
    return stories.sort(function (a, b) {
      return Number(b.rating_average || 0) - Number(a.rating_average || 0);
    });
  }

  return stories.sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function configurarOrdenacaoHistorias() {
  const sortButtons = document.querySelectorAll(".story-sort-btn");

  sortButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      sortButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      ordenacaoAtual = button.dataset.sort || "recent";

      renderizarHistoriasPublicas();
    });
  });
}

function configurarAcoesHistoriasPublicas() {
  const readBtns = document.querySelectorAll(".story-read-btn");

  readBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const storyId = btn.dataset.storyId;

      window.location.href =
        `../html/story-view.html?id=${storyId}`;
    });
  });
}

function formatarStatusHistoria(status) {
  if (status === "published") return "Publicada";
  if (status === "completed") return "Concluída";
  if (status === "draft") return "Rascunho";

  return "Em andamento";
}

iniciarStoriesPage();