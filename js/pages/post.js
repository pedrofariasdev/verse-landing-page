


async function carregarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", usuarioLogado.id)
    .single();

  if (profileError || !profile) {
    console.error("Erro ao carregar profile:", profileError?.message);
    return;
  }

  perfilLogado = profile;

  const fullName = profile.full_name || "Usuário Verse";
  const username = profile.username || "usuario";
  const firstLetter = fullName.charAt(0).toUpperCase();

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");

  if (userName) userName.textContent = fullName;
  if (userEmail) userEmail.textContent = `@${username}`;

  if (userAvatar) userAvatar.textContent = firstLetter;
  if (navAvatar) navAvatar.textContent = firstLetter;

  if (profile.avatar_url) {
    mostrarAvatarNaTela(profile.avatar_url);
  }
}

async function carregarPost() {
  const params = new URLSearchParams(window.location.search);

  const postId = params.get("id");

  if (!postId) {
    document.getElementById("singlePostContainer").innerHTML = `
      <p>Publicação não encontrada.</p>
    `;
    return;
  }

  const { data: post, error } = await supabaseClient
    .from("posts")
    .select(`
      *,
      profiles(*)
    `)
    .eq("id", postId)
    .single();

  if (error || !post) {
    document.getElementById("singlePostContainer").innerHTML = `
      <p>Publicação não encontrada.</p>
    `;
    return;
  }

  const { data: autor } = await supabaseClient
  .from("profiles")
  .select("*")
  .eq("id", post.user_id)
  .single();

  renderizarPost(post, autor);
}

function renderizarPost(post, autor) {
  const container = document.getElementById("singlePostContainer");

  const avatar =
    autor?.avatar_url
      ? `<img src="${autor.avatar_url}" class="post-avatar">`
      : `<div class="post-avatar-placeholder">
          ${(autor?.full_name || "V")[0]}
        </div>`;

  const imagem = post.image_url
    ? `
      <img
        src="${post.image_url}"
        class="post-image"
        alt="Imagem da publicação">
    `
    : "";

  container.innerHTML = `
    <article class="single-post-card">

      <div class="post-header">

        ${avatar}

        <div>
          <h3>${autor?.full_name || "Usuário Verse"}</h3>

          <span>
            @${autor?.username || "usuario"}
          </span>
        </div>

      </div>

      <div class="post-content">
        ${transformarHashtagsEmLinks(post.content || "")}
      </div>

      ${imagem}

      <div class="post-meta">
        ${formatarTempo(post.created_at)}
      </div>

      <div class="post-actions">

      <button class="like-btn" data-post-id="${post.id}">
        ♡ Curtir
      </button>

      <button class="comment-btn" data-post-id="${post.id}">
        💬 Comentar
      </button>

      <button class="share-btn" data-post-id="${post.id}">
        ↗ Compartilhar
      </button>

    </div>

    <div class="comments-box" id="comments-${post.id}">
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

    </article>
  `;
  configurarAcoesDoPost(post.id);
}

async function configurarAcoesDoPost(postId) {
  const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
  const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
  const sendCommentBtn = document.querySelector(`.send-comment-btn[data-post-id="${postId}"]`);
  const commentsBox = document.getElementById(`comments-${postId}`);

  if (likeBtn) {
    likeBtn.addEventListener("click", async function () {
      await alternarCurtida(postId, likeBtn);
    });

    await carregarEstadoCurtida(postId, likeBtn);
  }

  if (commentBtn) {
  await carregarContadorComentarios(postId, commentBtn);
}

  if (commentBtn && commentsBox) {
    commentBtn.addEventListener("click", async function () {
      commentsBox.style.display =
        commentsBox.style.display === "none" ? "block" : "none";

      await carregarComentarios(postId);
      await carregarContadorComentarios(postId, commentBtn);
    });
  }

  if (sendCommentBtn) {
    sendCommentBtn.addEventListener("click", async function () {
      await enviarComentario(postId);
    });
  }
}

async function iniciarPost() {
  await carregarUsuarioLogado();
  await carregarPost();

  configurarCompartilhamentoPost();
  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();
}

iniciarPost();