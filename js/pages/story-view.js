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
  await sincronizarMetricasHistoria();
  await recarregarMetricasDaHistoria();
  await carregarCapitulos();

  configurarBotoesStoryView();
  configurarAvaliacaoHistoria();

  await carregarAvaliacaoUsuario();
  await carregarEstadoFavorito();

  configurarFormularioComentario();
  await carregarComentariosHistoria();

  await recarregarMetricasDaHistoria();
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

  const storyTitle = document.getElementById("storyTitle");
  const storyGenre = document.getElementById("storyGenre");
  const storyDescription = document.getElementById("storyDescription");
  const storyViews = document.getElementById("storyViews");
  const storyFavorites = document.getElementById("storyFavorites");
  const storyComments = document.getElementById("storyComments");
  const storyRating = document.getElementById("storyRating");
  const storyAuthor = document.getElementById("storyAuthor");
  const cover = document.getElementById("storyCover");

  if (storyTitle) {
    storyTitle.textContent = data.title || "História sem título";
  }

  if (storyGenre) {
    storyGenre.textContent = data.genre || "Sem gênero";
  }

  if (storyDescription) {
    storyDescription.textContent =
      data.description || "Esta história ainda não possui sinopse.";
  }

  if (storyViews) {
    storyViews.textContent = data.views_count || 0;
  }

  if (storyFavorites) {
    storyFavorites.textContent = data.favorites_count || 0;
  }

  if (storyComments) {
    storyComments.textContent = data.comments_count || 0;
  }

  if (storyRating) {
    storyRating.textContent = data.rating_average || "0.0";
  }

  if (storyAuthor) {
    storyAuthor.textContent = "Autor Verse";
  }

  await carregarAutorHistoria(data.user_id);

  if (cover) {
    cover.innerHTML = "";

    if (data.cover_url) {
      const img = document.createElement("img");
      img.src = data.cover_url;
      img.alt = `Capa de ${data.title || "história"}`;

      cover.appendChild(img);
    } else {
      cover.textContent = data.title
        ? data.title.charAt(0).toUpperCase()
        : "V";
    }
  }
}

async function carregarAutorHistoria(authorId) {
  const storyAuthor = document.getElementById("storyAuthor");

  if (!storyAuthor || !authorId) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("full_name, username")
    .eq("id", authorId)
    .single();

  if (error) {
    console.error("Erro ao carregar autor:", error.message);
    storyAuthor.textContent = "Autor Verse";
    return;
  }

  storyAuthor.textContent =
    data?.full_name || data?.username || "Autor Verse";
}

async function sincronizarMetricasHistoria() {
  const { error } = await supabaseClient.rpc("sync_story_metrics", {
    target_story_id: storyId
  });

  if (error) {
    console.error("Erro ao sincronizar métricas:", error.message);
    return;
  }

  await recarregarMetricasDaHistoria();
}

async function carregarCapitulos() {
  const chaptersList = document.getElementById("storyChaptersList");
  const chaptersCount = document.getElementById("chaptersCount");

  if (!chaptersList) return;

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

  if (chaptersCount) {
    chaptersCount.textContent =
      `${capitulosHistoria.length} capítulo${capitulosHistoria.length === 1 ? "" : "s"}`;
  }

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
      window.location.href = `../html/chapter-view.html?id=${chapterId}`;
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

      window.location.href = `../html/chapter-view.html?id=${firstChapter.id}`;
    });
  }

  if (favoriteStoryBtn) {
    favoriteStoryBtn.addEventListener("click", alternarFavoritoHistoria);
  }
}

async function carregarEstadoFavorito() {
  if (!usuarioLogado || !storyId) return;

  const favoriteBtn = document.getElementById("favoriteStoryBtn");

  if (!favoriteBtn) return;

  const { data, error } = await supabaseClient
    .from("story_favorites")
    .select("*")
    .eq("story_id", storyId)
    .eq("user_id", usuarioLogado.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar favorito:", error.message);
    return;
  }

  if (data) {
    favoriteBtn.classList.add("favorited");
    favoriteBtn.textContent = "Favoritado";
  } else {
    favoriteBtn.classList.remove("favorited");
    favoriteBtn.textContent = "Favoritar";
  }
}

async function alternarFavoritoHistoria() {
  if (!usuarioLogado) {
    alert("Você precisa estar logado para favoritar.");
    return;
  }

  const favoriteBtn = document.getElementById("favoriteStoryBtn");
  if (!favoriteBtn) return;

  const estaFavoritado = favoriteBtn.classList.contains("favorited");

  favoriteBtn.disabled = true;

  if (estaFavoritado) {
    const { error } = await supabaseClient
      .from("story_favorites")
      .delete()
      .eq("story_id", storyId)
      .eq("user_id", usuarioLogado.id);

    if (error) {
      console.error("Erro ao remover favorito:", error.message);
      alert("Não foi possível remover dos favoritos.");
      favoriteBtn.disabled = false;
      return;
    }

    favoriteBtn.classList.remove("favorited");
    favoriteBtn.textContent = "Favoritar";
  } else {
    const { error } = await supabaseClient
      .from("story_favorites")
      .insert([
        {
          story_id: storyId,
          user_id: usuarioLogado.id
        }
      ]);

    if (error) {
      console.error("Erro ao favoritar:", error.message);
      alert("Não foi possível favoritar esta história.");
      favoriteBtn.disabled = false;
      return;
    }

    favoriteBtn.classList.add("favorited");
    favoriteBtn.textContent = "Favoritado";
  }

  await sincronizarMetricasHistoria();
  await carregarEstadoFavorito();

  favoriteBtn.disabled = false;
}

function configurarAvaliacaoHistoria() {
  const stars = document.querySelectorAll(".rating-star");

  stars.forEach(function (star) {
    star.addEventListener("click", async function () {
      const rating = Number(star.dataset.rating);
      await salvarAvaliacaoHistoria(rating);
    });
  });
}

async function carregarAvaliacaoUsuario() {
  if (!usuarioLogado || !storyId) return;

  const { data, error } = await supabaseClient
    .from("story_ratings")
    .select("*")
    .eq("story_id", storyId)
    .eq("user_id", usuarioLogado.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar avaliação:", error.message);
    return;
  }

  if (data) {
    atualizarEstrelas(data.rating);

    const userRatingText = document.getElementById("userRatingText");

    if (userRatingText) {
      userRatingText.textContent =
        `Você avaliou esta história com ${data.rating} estrela${data.rating > 1 ? "s" : ""}.`;
    }
  }
}

async function salvarAvaliacaoHistoria(rating) {
  if (!usuarioLogado) {
    alert("Você precisa estar logado para avaliar.");
    return;
  }

  const { error } = await supabaseClient
    .from("story_ratings")
    .upsert(
      {
        story_id: storyId,
        user_id: usuarioLogado.id,
        rating: rating,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "story_id,user_id"
      }
    );

  if (error) {
    console.error("Erro ao salvar avaliação:", error.message);
    alert("Não foi possível salvar sua avaliação.");
    return;
  }

  atualizarEstrelas(rating);

  const userRatingText = document.getElementById("userRatingText");

  if (userRatingText) {
    userRatingText.textContent =
      `Você avaliou esta história com ${rating} estrela${rating > 1 ? "s" : ""}.`;
  }

  await sincronizarMetricasHistoria();
}

function atualizarEstrelas(rating) {
  const stars = document.querySelectorAll(".rating-star");

  stars.forEach(function (star) {
    const starValue = Number(star.dataset.rating);

    if (starValue <= rating) {
      star.textContent = "★";
      star.classList.add("active");
    } else {
      star.textContent = "☆";
      star.classList.remove("active");
    }
  });
}

function configurarFormularioComentario() {
  const form = document.getElementById("storyCommentForm");

  if (form) {
    form.addEventListener("submit", enviarComentarioHistoria);
  }
}

async function enviarComentarioHistoria(event) {
  event.preventDefault();

  if (!usuarioLogado) {
    alert("Você precisa estar logado para comentar.");
    return;
  }

  const input = document.getElementById("storyCommentInput");
  const sendBtn = document.getElementById("sendStoryCommentBtn");

  if (!input || !sendBtn) return;

  const comment = input.value.trim();

  if (!comment) {
    alert("Escreva um comentário antes de enviar.");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Enviando...";

  const { error } = await supabaseClient
    .from("story_comments")
    .insert([
      {
        story_id: storyId,
        user_id: usuarioLogado.id,
        comment: comment
      }
    ]);

  sendBtn.disabled = false;
  sendBtn.textContent = "Comentar";

  if (error) {
    console.error("Erro ao comentar:", error.message);
    alert("Não foi possível enviar o comentário.");
    return;
  }

  input.value = "";

  await carregarComentariosHistoria();
  await sincronizarMetricasHistoria();
}

async function carregarComentariosHistoria() {
  const commentsList = document.getElementById("storyCommentsList");
  const commentsCount = document.getElementById("commentsCount");

  if (!commentsList || !storyId) return;

  commentsList.innerHTML = "<p>Carregando comentários...</p>";

  const { data: comments, error } = await supabaseClient
    .from("story_comments")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    commentsList.innerHTML = "<p>Não foi possível carregar os comentários.</p>";
    return;
  }

  const comentarios = comments || [];

  if (commentsCount) {
    commentsCount.textContent =
      `${comentarios.length} comentário${comentarios.length === 1 ? "" : "s"}`;
  }

  if (comentarios.length === 0) {
    commentsList.innerHTML = `
      <div class="story-comments-empty">
        Nenhum comentário ainda. Seja o primeiro a comentar.
      </div>
    `;
    return;
  }

  const userIds = [...new Set(comentarios.map(comment => comment.user_id))];

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Erro ao carregar perfis dos comentários:", profilesError.message);
  }

  commentsList.innerHTML = "";

  comentarios.forEach(function (comment) {
    const profile = profiles?.find(function (item) {
      return item.id === comment.user_id;
    });

    const nomeAutor =
      profile?.full_name ||
      profile?.username ||
      "Usuário Verse";

    const commentCard = document.createElement("article");
    commentCard.classList.add("story-comment");

    commentCard.innerHTML = `
      <div class="story-comment-author">
        ${nomeAutor}
      </div>

      <div class="story-comment-date">
        ${formatarDataComentario(comment.created_at)}
      </div>

      <p class="story-comment-text">
        ${comment.comment}
      </p>
    `;

    commentsList.appendChild(commentCard);
  });
}

function formatarDataHistoria(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatarDataComentario(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

async function recarregarMetricasDaHistoria() {
  const { data, error } = await supabaseClient
    .from("stories")
    .select("views_count, favorites_count, comments_count, rating_average")
    .eq("id", storyId)
    .single();

  if (error) {
    console.error("Erro ao recarregar métricas:", error.message);
    return;
  }

  const storyViews = document.getElementById("storyViews");
  const storyFavorites = document.getElementById("storyFavorites");
  const storyComments = document.getElementById("storyComments");
  const storyRating = document.getElementById("storyRating");

  if (storyViews) storyViews.textContent = data.views_count || 0;
  if (storyFavorites) storyFavorites.textContent = data.favorites_count || 0;
  if (storyComments) storyComments.textContent = data.comments_count || 0;
  if (storyRating) storyRating.textContent = data.rating_average || "0.0";
}

iniciarStoryView();