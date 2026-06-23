console.log("publications.js carregado!");

let editingPostId = null;

function abrirModalEdicao(postId, content) {
  editingPostId = postId;

  const modal = document.getElementById("editPostModal");
  const textarea = document.getElementById("editPostContent");

  if (textarea) {
    textarea.value = content || "";
  }

  if (modal) {
    modal.classList.add("active");
  }
}

function fecharModalEdicao() {
  editingPostId = null;

  const modal = document.getElementById("editPostModal");
  const textarea = document.getElementById("editPostContent");

  if (textarea) {
    textarea.value = "";
  }

  if (modal) {
    modal.classList.remove("active");
  }
}

async function salvarEdicaoPost() {
  if (!editingPostId) return;

  const textarea = document.getElementById("editPostContent");
  const saveBtn = document.getElementById("saveEditPostBtn");

  const content = textarea.value.trim();

  if (!content) {
    alert("A publicação não pode ficar vazia.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Salvando...";

  const { data, error } = await supabaseClient
    .from("posts")
    .update({ content: content })
    .eq("id", editingPostId)
    .eq("user_id", usuarioLogado.id)
    .select();

  saveBtn.disabled = false;
  saveBtn.textContent = "Salvar alterações";

  if (error) {
    console.error("Erro ao editar publicação:", error.message);
    alert("Não foi possível editar a publicação.");
    return;
  }

  fecharModalEdicao();
  await carregarMinhasPublicacoes();
}

function configurarModalEdicao() {
  const cancelBtn = document.getElementById("cancelEditPostBtn");
  const saveBtn = document.getElementById("saveEditPostBtn");
  const modal = document.getElementById("editPostModal");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", fecharModalEdicao);
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", salvarEdicaoPost);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalEdicao();
      }
    });
  }
}

async function iniciarPublicacoes() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();
  configurarCompartilhamentoPost();
  configurarModalEdicao();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  await carregarMinhasPublicacoes();
}

async function carregarMinhasPublicacoes() {
  const container = document.getElementById("myPublicationsContainer");
  const postsCount = document.getElementById("myPostsCount");

  if (!container || !usuarioLogado) return;

  container.innerHTML = "<p>Carregando suas publicações...</p>";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("user_id", usuarioLogado.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar minhas publicações:", error.message);
    container.innerHTML = "<p>Não foi possível carregar suas publicações.</p>";
    return;
  }

  postsCount.textContent = posts?.length || 0;

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-publications">
        <h3>Você ainda não publicou nada.</h3>
        <p>Vá até o feed e compartilhe sua primeira publicação.</p>
        <a href="../html/feed.html">Criar primeira publicação</a>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  posts.forEach(function (post) {
    const card = document.createElement("article");
    card.classList.add("post-card");

    card.innerHTML = `
      <div class="post-header">
        <div class="post-user-info">
          <h3>Minha publicação</h3>
          <span>${formatarTempo(post.created_at)}</span>
        </div>
      </div>

      ${post.content ? `<p class="post-text">${transformarHashtagsEmLinks(post.content)}</p>` : ""}

      ${
        post.image_url
          ? `<img src="${post.image_url}" class="post-images" alt="Imagem da publicação">`
          : ""
      }

      <div class="post-actions">
        <button class="like-btn" data-post-id="${post.id}">
          ♡ Curtir (0)
        </button>

        <button class="comment-btn" data-post-id="${post.id}">
          💬 Comentar (0)
        </button>

        <button class="repost-btn" data-post-id="${post.id}">
          ↻ Repostar (0)
        </button>

        <button class="quote-btn" data-post-id="${post.id}">
          ❝ Citar
        </button>

        <button class="share-btn" data-post-id="${post.id}">
          ↗ Compartilhar
        </button>

        <button class="view-post-btn" data-post-id="${post.id}">
          Ver
        </button>

        <button class="edit-post-btn" data-post-id="${post.id}">
          Editar
        </button>

        <button class="delete-post-btn" data-post-id="${post.id}">
          Excluir
        </button>
      </div>

      <div class="comments-box" id="comments-${post.id}" style="display:none;">
        <input
          type="text"
          class="comment-input"
          id="commentInput-${post.id}"
          placeholder="Escreva um comentário..."
        >

        <button
          class="send-comment-btn"
          data-post-id="${post.id}">
          Enviar
        </button>

        <div
          class="comments-list"
          id="commentsList-${post.id}">
        </div>
      </div>
    `;

    container.appendChild(card);

    configurarAcoesDaPublicacao(post.id, post);
  });
}

async function configurarAcoesDaPublicacao(postId, post) {
  const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
  const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
  const repostBtn = document.querySelector(`.repost-btn[data-post-id="${postId}"]`);
  const quoteBtn = document.querySelector(`.quote-btn[data-post-id="${postId}"]`);
  const shareBtn = document.querySelector(`.share-btn[data-post-id="${postId}"]`);

  if (likeBtn && typeof carregarEstadoCurtida === "function") {
    await carregarEstadoCurtida(postId, likeBtn);
  }

  if (likeBtn && typeof alternarCurtida === "function") {
    likeBtn.addEventListener("click", async function () { 
      await alternarCurtida(postId, likeBtn);
    });
  }
  if (repostBtn) {
    repostBtn.addEventListener("click", async function () {
      await alternarRepost(postId, repostBtn);
    });

    await carregarEstadoRepost(postId, repostBtn);
  }

  if (commentBtn && typeof carregarContadorComentarios === "function") {
    await carregarContadorComentarios(postId, commentBtn);
  }

  if (repostBtn && typeof carregarContadorReposts === "function") {
    await carregarContadorReposts(postId, repostBtn);
  }

  if (repostBtn && typeof abrirModalRepost === "function") {
    repostBtn.addEventListener("click", function () {
      abrirModalRepost(postId);
    });
  }

  if (quoteBtn && typeof abrirModalQuote === "function") {
    quoteBtn.addEventListener("click", function () {
      abrirModalQuote(postId);
    });
  }

  if (shareBtn && typeof configurarCompartilhamentoPost === "function") {
    // O share.js normalmente configura todos os botões globalmente.
  }

  const viewBtn = document.querySelector(`.view-post-btn[data-post-id="${postId}"]`);
  const editBtn = document.querySelector(`.edit-post-btn[data-post-id="${postId}"]`);
  const deleteBtn = document.querySelector(`.delete-post-btn[data-post-id="${postId}"]`);

  if (viewBtn) {
    viewBtn.addEventListener("click", function () {
      window.location.href = `../html/post.html?id=${postId}`;
    });
  }

  if (editBtn) {
    editBtn.addEventListener("click", function () {
      abrirModalEdicao(postId, post.content);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async function () {
      const confirmar = confirm("Tem certeza que deseja excluir esta publicação?");

      if (!confirmar) return;

      const { error } = await supabaseClient
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", usuarioLogado.id);

      if (error) {
        console.error("Erro ao excluir publicação:", error.message);
        alert("Não foi possível excluir a publicação.");
        return;
      }

      await carregarMinhasPublicacoes();
    });
  }
}

iniciarPublicacoes();