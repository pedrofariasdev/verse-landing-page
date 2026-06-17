async function carregarPosts() {
  const postsContainer = document.getElementById("postsContainer");

  if (!postsContainer) {
    console.log("postsContainer não encontrado");
    return;
  }

  postsContainer.innerHTML = "";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*");

  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os posts.</p>";
    return;
  }

  const { data: reposts, error: repostsError } = await supabaseClient
    .from("reposts")
    .select("*");

  if (repostsError) {
    console.error("Erro ao carregar reposts:", repostsError.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os reposts.</p>";
    return;
  }

  if ((!posts || posts.length === 0) && (!reposts || reposts.length === 0)) {
    postsContainer.innerHTML = "<p>Ainda não há publicações.</p>";
    return;
  }

  const quotedPostIds = posts
    .filter(post => post.quoted_post_id)
    .map(post => post.quoted_post_id);

  let quotedPosts = [];

  if (quotedPostIds.length > 0) {
    const { data, error: quotedError } = await supabaseClient
      .from("posts")
      .select("*")
      .in("id", quotedPostIds);

    if (quotedError) {
      console.error("Erro ao carregar posts citados:", quotedError.message);
    } else {
      quotedPosts = data || [];
    }
  }

  const feedItems = [];

  posts.forEach(function (post) {
    feedItems.push({
      type: "post",
      created_at: post.created_at,
      post: post,
      repostUserId: null
    });
  });

  reposts.forEach(function (repost) {
    const originalPost = posts.find(post => post.id === repost.post_id);

    if (originalPost) {
      feedItems.push({
        type: "repost",
        created_at: repost.created_at,
        post: originalPost,
        repostUserId: repost.user_id
      });
    }
  });

  feedItems.sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const authorIds = feedItems.map(item => item.post.user_id);

  const repostUserIds = feedItems
    .filter(item => item.type === "repost")
    .map(item => item.repostUserId);

  const quotedAuthorIds = quotedPosts.map(post => post.user_id);

  const userIds = [
    ...new Set([
      ...authorIds,
      ...repostUserIds,
      ...quotedAuthorIds
    ])
  ];

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error("Erro ao carregar profiles dos posts:", profilesError.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os autores dos posts.</p>";
    return;
  }

  feedItems.forEach(function (item) {
    const post = item.post;
    const targetPostId = post.id;

    const authorProfile = profiles.find(profile => profile.id === post.user_id);
    const repostProfile = profiles.find(profile => profile.id === item.repostUserId);

    const postAuthorName =
      authorProfile?.full_name || "Usuário Verse";

    const postAuthorUsername =
      authorProfile?.username || "usuario";

    const avatarUrl =
      authorProfile?.avatar_url || null;

    const postAuthorInitial =
      postAuthorName.charAt(0).toUpperCase();

    const avatarStyle = avatarUrl
      ? "background-image: url('" + avatarUrl + "'); background-size: cover; background-position: center; color: transparent;"
      : "";

    const profileLink = `../html/public-profile.html?id=${post.user_id}`;

    const repostLabel = item.type === "repost"
      ? `<div class="repost-label">↻ ${repostProfile?.full_name || "Usuário Verse"} repostou</div>`
      : "";

    const quotedPost = post.quoted_post_id
      ? quotedPosts.find(original => original.id === post.quoted_post_id)
      : null;

    let quotedPostHtml = "";

    if (quotedPost) {
      const quotedAuthor = profiles.find(profile => profile.id === quotedPost.user_id);

      quotedPostHtml = `
        <a href="../html/post.html?id=${quotedPost.id}" class="quoted-post-card quoted-post-link">

          <div class="quoted-post-label">
            💬 Publicação citada
          </div>

          <strong>${quotedAuthor?.full_name || "Usuário Verse"}</strong>

          <span>@${quotedAuthor?.username || "usuario"}</span>

          ${quotedPost.content
            ? `<p>${transformarHashtagsEmLinks(quotedPost.content)}</p>`
            : ""
          }

          ${quotedPost.image_url
            ? `<img src="${quotedPost.image_url}" alt="Imagem da publicação citada">`
            : ""
          }

        </a>
      `;
    }

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    if (item.type === "repost") {
      postCard.classList.add("post-card-reposted");
    }

    const postContentLinkStart = item.type === "repost"
      ? `<a href="../html/post.html?id=${post.id}" class="repost-content-link">`
      : "";

    const postContentLinkEnd = item.type === "repost"
      ? `</a>`
      : "";

    postCard.innerHTML = `
      ${repostLabel}

      <div class="post-header">

        <a href="${profileLink}" class="post-avatar-link">
          <div class="post-avatar" style="${avatarStyle}">
            ${postAuthorInitial}
          </div>
        </a>

        <div class="post-user-info">
          <h3>
            <a href="${profileLink}" class="post-user-link">
              ${postAuthorName}
            </a>
          </h3>

          <span>
            <a href="${profileLink}" class="post-user-link muted">
              @${postAuthorUsername}
            </a>
            · ${formatarTempo(post.created_at)}
          </span>
        </div>

      </div>

      ${postContentLinkStart}

      ${post.content ? `<p class="post-text">${transformarHashtagsEmLinks(post.content)}</p>` : ""}

      ${post.image_url ? `<img src="${post.image_url}" class="post-images" alt="Imagem da publicação">` : ""}

      ${quotedPostHtml}

      ${postContentLinkEnd}

      <div class="post-actions">
        <button class="like-btn" data-post-id="${post.id}">
          ♡ Curtir
        </button>

        <button class="comment-btn" data-post-id="${post.id}">
          💬 Comentar
        </button>

        <button class="repost-btn" data-post-id="${targetPostId}">
          ↻ Repostar
        </button>

        <button class="quote-btn" data-post-id="${targetPostId}">
          ❝ Citar
        </button>

        <button class="share-btn" data-post-id="${post.id}">
          ↗ Compartilhar
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

    postsContainer.appendChild(postCard);

    configurarAcoesDoPost(targetPostId);
  });
}

async function configurarAcoesDoPost(postId) {
  const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
  const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
  const repostBtn = document.querySelector(`.repost-btn[data-post-id="${postId}"]`);
  const quoteBtn = document.querySelector(`.quote-btn[data-post-id="${postId}"]`);
  const sendCommentBtn = document.querySelector(`.send-comment-btn[data-post-id="${postId}"]`);
  const commentsBox = document.getElementById(`comments-${postId}`);

  if (likeBtn) {
    likeBtn.addEventListener("click", async function () {
      await alternarCurtida(postId, likeBtn);
    });

    await carregarEstadoCurtida(postId, likeBtn);
  }

  if (repostBtn) {
    repostBtn.addEventListener("click", async function () {
      await alternarRepost(postId, repostBtn);
    });

    await carregarEstadoRepost(postId, repostBtn);
  }

  if (quoteBtn) {
    quoteBtn.addEventListener("click", async function () {
      await alternarQuote(postId);
    });
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

