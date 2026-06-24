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
  await registrarLeitura();
  await carregarCapitulos();

  configurarBotoesStoryView();
  configurarAvaliacaoHistoria();
  

  await carregarAvaliacaoUsuario();
  await carregarEstadoFavorito();

  configurarFormularioComentario();
  await carregarComentariosHistoria();  
}

async function registrarLeitura() {
  if (!storyId) return;

  const chave = `story_view_${storyId}`;

  const jaContabilizada = localStorage.getItem(chave);

  if (jaContabilizada) return;

  const novoTotal = (historiaAtual.views_count || 0) + 1;

  const { error } = await supabaseClient
    .from("stories")
    .update({
      views_count: novoTotal
    })
    .eq("id", storyId);

  if (error) {
    console.error("Erro ao registrar leitura:", error.message);
    return;
  }

  localStorage.setItem(chave, "true");

  historiaAtual.views_count = novoTotal;

  const storyViews = document.getElementById("storyViews");

  if (storyViews) {
    storyViews.textContent = novoTotal;
  }
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

document.getElementById("storyFavorites").textContent =
  data.favorites_count || 0;

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

function configurarAvaliacaoHistoria() {
  const stars = document.querySelectorAll(".rating-star");

  stars.forEach(function (star) {
    star.addEventListener("click", async function () {
      const rating = Number(star.dataset.rating);
      await salvarAvaliacaoHistoria(rating);
    });
  });
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

  await atualizarMediaAvaliacoes();
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

async function atualizarMediaAvaliacoes() {
  const { data, error } = await supabaseClient
    .from("story_ratings")
    .select("rating")
    .eq("story_id", storyId);

  if (error) {
    console.error("Erro ao calcular média:", error.message);
    return;
  }

  const ratings = data || [];
  const count = ratings.length;

  const average =
    count > 0
      ? (
          ratings.reduce(function (total, item) {
            return total + Number(item.rating);
          }, 0) / count
        ).toFixed(1)
      : "0.0";

  const { error: updateError } = await supabaseClient
    .from("stories")
    .update({
      rating_average: average,
      ratings_count: count
    })
    .eq("id", storyId);

  if (updateError) {
    console.error("Erro ao atualizar média:", updateError.message);
    return;
  }

  const storyRating = document.getElementById("storyRating");

  if (storyRating) {
    storyRating.textContent = average;
  }
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
    favoriteStoryBtn.addEventListener("click", alternarFavoritoHistoria);
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

    favoriteBtn.disabled = false;

    if (error) {
      console.error("Erro ao remover favorito:", error.message);
      alert("Não foi possível remover dos favoritos.");
      return;
    }

    favoriteBtn.classList.remove("favorited");
    favoriteBtn.textContent = "Favoritar";
    return;
  }

  const { error } = await supabaseClient
    .from("story_favorites")
    .insert([
      {
        story_id: storyId,
        user_id: usuarioLogado.id
      }
    ]);

  favoriteBtn.disabled = false;

  if (error) {
    console.error("Erro ao favoritar:", error.message);
    alert("Não foi possível favoritar esta história.");
    return;
  }

  favoriteBtn.classList.add("favorited");
  favoriteBtn.textContent = "Favoritado";
}

async function atualizarContadorFavoritos() {
  const { count, error } = await supabaseClient
    .from("story_favorites")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("story_id", storyId);

  if (error) {
    console.error("Erro ao contar favoritos:", error.message);
    return;
  }

  const total = count || 0;

  const { error: updateError } = await supabaseClient
    .from("stories")
    .update({
      favorites_count: total
    })
    .eq("id", storyId);

  if (updateError) {
    console.error("Erro ao atualizar favorites_count:", updateError.message);
    return;
  }

  const storyFavorites = document.getElementById("storyFavorites");

  if (storyFavorites) {
    storyFavorites.textContent = total;
  }
}

async function carregarComentariosHistoria() {
  const commentsList = document.getElementById("storyCommentsList");
  const commentsCount = document.getElementById("commentsCount");

  if (!commentsList || !storyId) return;

  commentsList.innerHTML = "<p>Carregando comentários...</p>";

  const { data, error } = await supabaseClient
    .from("story_comments")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    commentsList.innerHTML = "<p>Não foi possível carregar os comentários.</p>";
    return;
  }

  const comments = data || [];

  if (commentsCount) {
    commentsCount.textContent =
      `${comments.length} comentário${comments.length === 1 ? "" : "s"}`;
  }

  await atualizarContadorComentarios(comments.length);

  if (comments.length === 0) {
    commentsList.innerHTML = `
      <div class="story-comments-empty">
        Nenhum comentário ainda. Seja o primeiro a comentar.
      </div>
    `;
    return;
  }

  commentsList.innerHTML = "";

  comments.forEach(function (comment) {
    const commentCard = document.createElement("article");
    commentCard.classList.add("story-comment");

    commentCard.innerHTML = `
      <div class="story-comment-author">
        Usuário Verse
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
}

async function atualizarContadorComentarios(total) {
  const { error } = await supabaseClient
    .from("stories")
    .update({
      comments_count: total
    })
    .eq("id", storyId);

  if (error) {
    console.error("Erro ao atualizar contador de comentários:", error.message);
  }

  const storyComments = document.getElementById("storyComments");

  if (storyComments) {
    storyComments.textContent = total;
  }
}

function formatarDataComentario(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

iniciarStoryView();