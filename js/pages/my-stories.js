console.log("my-stories.js carregado!");

let storyCoverFile = null;

function abrirModalNovaHistoria() {
  const modal = document.getElementById("createStoryModal");

  if (modal) {
    modal.classList.add("active");
  }
}

function fecharModalNovaHistoria() {
  const modal = document.getElementById("createStoryModal");
  const form = document.getElementById("createStoryForm");
  const previewBox = document.getElementById("storyCoverPreviewBox");
  const preview = document.getElementById("storyCoverPreview");

  storyCoverFile = null;

  if (form) form.reset();
  if (preview) preview.src = "";

  if (previewBox) {
    previewBox.style.display = "none";
  }

  if (modal) {
    modal.classList.remove("active");
  }
}

function configurarPreviewCapaHistoria() {
  const input = document.getElementById("storyCoverInput");
  const previewBox = document.getElementById("storyCoverPreviewBox");
  const preview = document.getElementById("storyCoverPreview");

  if (!input || !previewBox || !preview) return;

  input.addEventListener("change", function (event) {
    const file = event.target.files[0];

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Use uma imagem em JPG, PNG ou WEBP.");
      input.value = "";
      return;
    }

    if (!file) return;

    storyCoverFile = file;

    const imageUrl = URL.createObjectURL(file);

    preview.src = imageUrl;
    previewBox.style.display = "block";
  });
}

function configurarModalNovaHistoria() {
  const openBtn = document.getElementById("openCreateStoryModalBtn");
  const cancelBtn = document.getElementById("cancelCreateStoryBtn");
  const modal = document.getElementById("createStoryModal");

  if (openBtn) {
    openBtn.addEventListener("click", abrirModalNovaHistoria);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", fecharModalNovaHistoria);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalNovaHistoria();
      }
    });
  }
}

async function uploadCapaHistoria() {
  if (!storyCoverFile) {
    console.log("Nenhuma capa selecionada.");
    return null;
  }

  if (!usuarioLogado) {
    console.error("Usuário não logado.");
    return null;
  }

  const fileExt = storyCoverFile.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${usuarioLogado.id}/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("story-covers")
    .upload(filePath, storyCoverFile);

  if (uploadError) {
    console.error("Erro completo no upload:", uploadError);

    alert(
      "Erro ao enviar capa: " +
      (uploadError.message || "Erro desconhecido")
    );

    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("story-covers")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

async function criarHistoria(event) {
  event.preventDefault();

  const titleInput = document.getElementById("storyTitle");
  const descriptionInput = document.getElementById("storyDescription");
  const genreInput = document.getElementById("storyGenre");
  const statusInput = document.getElementById("storyStatus");
  const createBtn = document.getElementById("createStoryBtn");

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const genre = genreInput.value;
  const status = statusInput.value;

  if (!title || !description) {
    alert("Preencha o título e a sinopse.");
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Criando...";

  const coverUrl = await uploadCapaHistoria();

  if (storyCoverFile && !coverUrl) {
    createBtn.disabled = false;
    createBtn.textContent = "Criar história";
    return;
  }

  const { data, error } = await supabaseClient
    .from("stories")
    .insert([
      {
        user_id: usuarioLogado.id,
        title: title,
        description: description,
        genre: genre,
        status: status,
        cover_url: coverUrl
      }
    ])
    .select();

  createBtn.disabled = false;
  createBtn.textContent = "Criar história";

  if (error) {
    console.error("Erro ao criar história:", error.message);
    alert("Não foi possível criar a história.");
    return;
  }

  if (!data || data.length === 0) {
    alert("História criada, mas não foi possível abrir o editor.");
    await carregarMinhasHistorias();
    fecharModalNovaHistoria();
    return;
  }

  fecharModalNovaHistoria();

  const story = data[0];

  window.location.href = `../html/story-editor.html?id=${story.id}`;
}

function configurarFormularioHistoria() {
  const form = document.getElementById("createStoryForm");

  if (form) {
    form.addEventListener("submit", criarHistoria);
  }
}

async function carregarMinhasHistorias() {
  const storiesGrid = document.getElementById("storiesGrid");

  if (!storiesGrid || !usuarioLogado) return;

  storiesGrid.innerHTML = "<p>Carregando suas histórias...</p>";

  const { data: stories, error } = await supabaseClient
    .from("stories")
    .select("*")
    .eq("user_id", usuarioLogado.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar histórias:", error.message);
    storiesGrid.innerHTML = "<p>Não foi possível carregar suas histórias.</p>";
    return;
  }

  atualizarResumoHistorias(stories);

  if (!stories || stories.length === 0) {
    storiesGrid.innerHTML = `
      <div class="stories-empty">
        <h3>Você ainda não criou nenhuma história.</h3>
        <p>Clique em "Nova história" para começar sua primeira obra.</p>
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
          ${usuarioLogado.user_metadata?.full_name || "Pedro Farias"}
        </span>

        <div class="story-meta">
          <span>👁 ${story.views_count || 0}</span>
          <span>❤️ ${story.likes_count || 0}</span>
          <span>💬 ${story.comments_count || 0}</span>
          <span>⭐ ${story.rating_average || "0.0"}</span>
        </div>

        <div class="story-card-actions">
          <button
            type="button"
            class="story-edit-btn"
            data-story-id="${story.id}">
            Editar
          </button>

          <button
            type="button"
            class="story-chapters-btn"
            data-story-id="${story.id}">
            Capítulos
          </button>
        </div>

        <span class="story-status">
          ${formatarStatusHistoria(story.status)}
        </span>
      </div>
    `;

    storiesGrid.appendChild(card);
  });

  configurarAcoesHistorias();
}

function atualizarResumoHistorias(stories) {
  const storiesCount = document.getElementById("storiesCount");
  const storiesViewsCount = document.getElementById("storiesViewsCount");
  const storiesLikesCount = document.getElementById("storiesLikesCount");
  const storiesRatingsAverage = document.getElementById("storiesRatingsAverage");

  if (!stories) return;

  const totalStories = stories.length;

  const totalViews = stories.reduce(function (total, story) {
    return total + (story.views_count || 0);
  }, 0);

  const totalLikes = stories.reduce(function (total, story) {
    return total + (story.likes_count || 0);
  }, 0);

  const ratings = stories
    .map(function (story) {
      return Number(story.rating_average || 0);
    })
    .filter(function (rating) {
      return rating > 0;
    });

  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce(function (total, rating) {
            return total + rating;
          }, 0) / ratings.length
        ).toFixed(1)
      : "0.0";

  if (storiesCount) storiesCount.textContent = totalStories;
  if (storiesViewsCount) storiesViewsCount.textContent = totalViews;
  if (storiesLikesCount) storiesLikesCount.textContent = totalLikes;
  if (storiesRatingsAverage) storiesRatingsAverage.textContent = averageRating;
}

function formatarStatusHistoria(status) {
  if (status === "draft") return "Rascunho";
  if (status === "published") return "Publicada";
  if (status === "completed") return "Concluída";

  return "Em andamento";
}

function configurarAcoesHistorias() {
  const readBtns = document.querySelectorAll(".story-read-btn");
  const editBtns = document.querySelectorAll(".story-edit-btn");
  const chaptersBtns = document.querySelectorAll(".story-chapters-btn");

  readBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const storyId = btn.dataset.storyId;
      window.location.href = `../html/story-view.html?id=${storyId}`;
    });
  });

  editBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const storyId = btn.dataset.storyId;
      window.location.href = `../html/story-editor.html?id=${storyId}`;
    });
  });

  chaptersBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const storyId = btn.dataset.storyId;
      window.location.href = `../html/story-editor.html?id=${storyId}`;
    });
  });
}

async function iniciarMinhasHistorias() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarNotificacoes === "function") {
    await carregarNotificacoes();
  }

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  configurarModalNovaHistoria();
  configurarPreviewCapaHistoria();
  configurarFormularioHistoria();

  await carregarMinhasHistorias();
}

iniciarMinhasHistorias();