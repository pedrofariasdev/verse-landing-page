function configurarUploadImagemPost() {
  const photoPostBtn = document.getElementById("photoPostBtn");
  const postImageInput = document.getElementById("postImageInput");
  const imagePreviewBox = document.getElementById("imagePreviewBox");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");

  if (photoPostBtn && postImageInput) {
    photoPostBtn.addEventListener("click", function () {
      postImageInput.click();
    });
  }

  if (postImageInput) {
    postImageInput.addEventListener("change", function (event) {
      const file = event.target.files[0];

      if (!file) return;

      imagemSelecionada = file;

      const imageUrl = URL.createObjectURL(file);

      if (imagePreview) {
        imagePreview.src = imageUrl;
      }

      if (imagePreviewBox) {
        imagePreviewBox.style.display = "block";
      }
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", function () {
      imagemSelecionada = null;

      if (postImageInput) {
        postImageInput.value = "";
      }

      if (imagePreview) {
        imagePreview.src = "";
      }

      if (imagePreviewBox) {
        imagePreviewBox.style.display = "none";
      }
    });
  }
}

async function uploadImagemPost() {
  if (!imagemSelecionada || !usuarioLogado) return null;

  const fileExt = imagemSelecionada.name.split(".").pop();

  const fileName =
    `${usuarioLogado.id}-${Date.now()}.${fileExt}`;

  const filePath =
    `posts/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("post-images")
    .upload(filePath, imagemSelecionada, {
      upsert: false
    });

  if (uploadError) {
    console.error("Erro ao enviar imagem:", uploadError.message);
    alert("Não foi possível enviar a imagem.");
    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

function limparImagemSelecionada() {
  const postImageInput = document.getElementById("postImageInput");
  const imagePreviewBox = document.getElementById("imagePreviewBox");
  const imagePreview = document.getElementById("imagePreview");

  imagemSelecionada = null;

  if (postImageInput) {
    postImageInput.value = "";
  }

  if (imagePreview) {
    imagePreview.src = "";
  }

  if (imagePreviewBox) {
    imagePreviewBox.style.display = "none";
  }
}

async function criarPost() {
  const postContent = document.getElementById("postContent");
  const publishBtn = document.getElementById("publishBtn");

  const content = postContent.value.trim();

  if (!content && !imagemSelecionada) {
    alert("Escreva algo ou selecione uma imagem antes de publicar.");
    return;
  }

  if (!usuarioLogado) {
    alert("Você precisa estar logado para publicar.");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publicando...";

  let imageUrl = null;

  if (imagemSelecionada) {
    imageUrl = await uploadImagemPost();

    if (!imageUrl) {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publicar";
      return;
    }
  }

  const { data, error } = await supabaseClient
    .from("posts")
    .insert([
      {
        user_id: usuarioLogado.id,
        content: content || "", 
        post_type: imageUrl ? "image" : "text",
        image_url: imageUrl
      }
    ])
    .select();

  publishBtn.disabled = false;
  publishBtn.textContent = "Publicar";

  if (error) {
    console.error("Erro ao criar post:", error.message);
    alert("Não foi possível publicar. Tente novamente.");
    return;
  }

  console.log("Post criado:", data);

  if (data && data.length > 0) {
    await salvarHashtagsDoPost(data[0].id, content);
  }

  postContent.value = "";

  limparImagemSelecionada();

  await carregarPosts();
  await carregarHashtagsEmAlta();
  
}

async function carregarPosts() {
  const postsContainer = document.getElementById("postsContainer");

  if (!postsContainer) {
    console.log("postsContainer não encontrado");
    return;
  }

  postsContainer.innerHTML = "";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os posts.</p>";
    return;
  }

  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = "<p>Ainda não há publicações.</p>";
    return;
  }

  const userIds = [...new Set(posts.map(post => post.user_id))];

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error("Erro ao carregar profiles dos posts:", profilesError.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os autores dos posts.</p>";
    return;
  }

  posts.forEach(function (post) {
    const authorProfile = profiles.find(profile => profile.id === post.user_id);

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

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    postCard.innerHTML = `
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

      ${post.content ? `<p class="post-text">${transformarHashtagsEmLinks(post.content)}</p>` : ""}

      ${post.image_url ? `<img src="${post.image_url}" class="post-images" alt="Imagem da publicação">` : ""}

      <div class="post-actions">
        <button class="like-btn" data-post-id="${post.id}">
          ♡ Curtir
        </button>
        <button class="comment-btn" data-post-id="${post.id}">
          💬 Comentar
        </button>
        <button>↻ Repostar</button>
        <button>❝ Citar</button>
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

    configurarAcoesDoPost(post.id);
  });
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