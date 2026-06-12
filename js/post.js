let usuarioLogado = null;
let perfilLogado = null;

async function carregarUsuarioLogado() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "../html/login.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  usuarioLogado = profile;
  perfilLogado = profile;
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
        ${post.content || ""}
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

async function carregarContadorComentarios(postId, button) {
  const { count, error } = await supabaseClient
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    console.error("Erro ao contar comentários:", error.message);
    return;
  }

  button.textContent = `💬 Comentar (${count || 0})`;
}

async function carregarEstadoCurtida(postId, button) {
  const { data: like } = await supabaseClient
    .from("likes")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", usuarioLogado.id)
    .maybeSingle();

  const { count } = await supabaseClient
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (like) {
    button.textContent = `❤️ Curtido (${count || 0})`;
    button.classList.add("liked");
  } else {
    button.textContent = `♡ Curtir (${count || 0})`;
    button.classList.remove("liked");
  }
}

async function alternarCurtida(postId, button) {
  const jaCurtiu = button.classList.contains("liked");

  button.disabled = true;

  if (jaCurtiu) {
    await supabaseClient
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", usuarioLogado.id);
  } else {
    const { error } = await supabaseClient
      .from("likes")
      .insert([
        {
          post_id: postId,
          user_id: usuarioLogado.id
        }
      ]);

    if (!error) {
      const { data: postData } = await supabaseClient
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postData && postData.user_id !== usuarioLogado.id) {
        await criarNotificacao(
          postData.user_id,
          usuarioLogado.id,
          "like",
          `${perfilLogado.full_name} curtiu sua publicação.`,
          `../html/public-profile.html?id=${usuarioLogado.id}`
        );
      }
    }
  }

  await carregarEstadoCurtida(postId, button);

  button.disabled = false;
}

async function enviarComentario(postId) {
  const input = document.getElementById(`commentInput-${postId}`);

  if (!input) return;

  const content = input.value.trim();

  if (!content) {
    alert("Escreva um comentário antes de enviar.");
    return;
  }

  const { error } = await supabaseClient
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: usuarioLogado.id,
        content: content
      }
    ]);

  if (error) {
    console.error("Erro ao comentar:", error.message);
    alert("Não foi possível comentar.");
    return;
  }

  const { data: postData } = await supabaseClient
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (postData && postData.user_id !== usuarioLogado.id) {
    await criarNotificacao(
      postData.user_id,
      usuarioLogado.id,
      "comment",
      `${perfilLogado.full_name} comentou sua publicação.`,
      `../html/public-profile.html?id=${usuarioLogado.id}`
    );
  }

  input.value = "";

  await carregarComentarios(postId);

  const commentBtn = document.querySelector(
    `.comment-btn[data-post-id="${postId}"]`
  );

  if (commentBtn) {
    await carregarContadorComentarios(postId, commentBtn);
  }
}

async function carregarComentarios(postId) {
  const commentsList = document.getElementById(`commentsList-${postId}`);

  if (!commentsList) return;

  const { data: comments, error } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    return;
  }

  commentsList.innerHTML = "";

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = "<p class='empty-comments'>Nenhum comentário ainda.</p>";
    return;
  }

  const userIds = [...new Set(comments.map(comment => comment.user_id))];

  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", userIds);

  comments.forEach(comment => {
    const author = profiles.find(profile => profile.id === comment.user_id);

    const div = document.createElement("div");
    div.classList.add("comment-item");

    div.innerHTML = `
      <strong>${author?.full_name || "Usuário Verse"}</strong>
      <span>@${author?.username || "usuario"}</span>
      <p>${comment.content}</p>
    `;

    commentsList.appendChild(div);
  });
}


async function iniciarPost() {
  await carregarUsuarioLogado();
  await carregarPost();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarUploadImagemPost();
  configurarPesquisaGlobal();
  configurarCompartilhamentoPost();


}

iniciarPost();