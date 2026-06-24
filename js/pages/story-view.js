console.log("story-view.js carregado!");

let storyId = null;
let historiaAtual = null;
let capitulosHistoria = [];

async function iniciarStoryView() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  const params = new URLSearchParams(window.location.search);
  storyId = params.get("id");

  if (!storyId) {
    alert("História não encontrada.");
    window.location.href = "../html/stories.html";
    return;
  }

  await carregarHistoria();
  await carregarCapitulos();
  configurarBotoesStoryView();
}

async function carregarHistoria() {
  const { data, error } = await supabaseClient
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .single();

  if (error) {
    console.error("Erro ao carregar história:", error.message);
    alert("Não foi possível carregar a história.");
    return;
  }

  historiaAtual = data;

  document.getElementById("storyTitle").textContent =
    data.title || "História sem título";

  document.getElementById("storyGenre").textContent =
    data.genre || "Sem gênero";

  document.getElementById("storyDescription").textContent =
    data.description || "Esta história ainda não possui sinopse.";

  document.getElementById("storyViews").textContent =
    data.views_count || 0;

  document.getElementById("storyLikes").textContent =
    data.likes_count || 0;

  document.getElementById("storyComments").textContent =
    data.comments_count || 0;

  document.getElementById("storyRating").textContent =
    data.rating_average || "0.0";

  document.getElementById("storyAuthor").textContent =
    "Autor Verse";

  const cover = document.getElementById("storyCover");

  if (cover) {
    cover.innerHTML = "";

    if (data.cover_url) {
      const img = document.createElement("img");
      img.src = data.cover_url;
      img.alt = `Capa de ${data.title}`;

      cover.appendChild(img);
    } else {
      cover.textContent = data.title
        ? data.title.charAt(0).toUpperCase()
        : "V";
    }
  }
}

async function carregarCapitulos() {
  const chaptersList = document.getElementById("storyChaptersList");
  const chaptersCount = document.getElementById("chaptersCount");

  chaptersList.innerHTML = "<p>Carregando capítulos...</p>";

  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("chapter_number", { ascending: true });

  if (error) {
    console.error("Erro ao carregar capítulos:", error.message);
    chaptersList.innerHTML = "<p>Não foi possível carregar os capítulos.</p>";
    return;
  }

  capitulosHistoria = data || [];

  chaptersCount.textContent =
    `${capitulosHistoria.length} capítulo${capitulosHistoria.length === 1 ? "" : "s"}`;

  if (capitulosHistoria.length === 0) {
    chaptersList.innerHTML = `
      <div class="empty-chapters">
        <p>Esta história ainda não possui capítulos publicados.</p>
      </div>
    `;
    return;
  }

  chaptersList.innerHTML = "";

  capitulosHistoria.forEach(function (chapter) {
    const chapterItem = document.createElement("div");
    chapterItem.classList.add("chapter-item");

    chapterItem.innerHTML = `
      <div class="chapter-info">
        <h3>Capítulo ${chapter.chapter_number} — ${chapter.title}</h3>
        <span>${formatarDataHistoria(chapter.created_at)}</span>
      </div>

      <button
        type="button"
        class="chapter-read-btn"
        data-chapter-id="${chapter.id}">
        Ler
      </button>
    `;

    chaptersList.appendChild(chapterItem);
  });

  configurarBotoesCapitulos();
}

function configurarBotoesCapitulos() {
  const buttons = document.querySelectorAll(".chapter-read-btn");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const chapterId = button.dataset.chapterId;

      window.location.href =
        `../html/chapter-view.html?id=${chapterId}`;
    });
  });
}

function configurarBotoesStoryView() {
  const startReadingBtn = document.getElementById("startReadingBtn");
  const favoriteStoryBtn = document.getElementById("favoriteStoryBtn");

  if (startReadingBtn) {
    startReadingBtn.addEventListener("click", function () {
      if (!capitulosHistoria || capitulosHistoria.length === 0) {
        alert("Esta história ainda não possui capítulos.");
        return;
      }

      const firstChapter = capitulosHistoria[0];

      window.location.href =
        `../html/chapter-view.html?id=${firstChapter.id}`;
    });
  }

  if (favoriteStoryBtn) {
    favoriteStoryBtn.addEventListener("click", function () {
      alert("Favoritos será implementado em seguida.");
    });
  }
}

function formatarDataHistoria(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

iniciarStoryView();