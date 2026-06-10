console.log("Feed.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;
let imagemSelecionada = null;

async function carregarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não autenticado");
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  let { data: profiles, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", usuarioLogado.id)
    .limit(1);

  if (profileError) {
    console.error("Erro ao carregar profile:", profileError.message);
    return;
  }

  let profile = profiles && profiles.length > 0 ? profiles[0] : null;

  if (!profile) {
    const fullName =
      usuarioLogado.user_metadata?.full_name || "Usuário Verse";

    const username = fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, ".");

    const { data: newProfile, error: createProfileError } = await supabaseClient
      .from("profiles")
      .insert([
        {
          id: usuarioLogado.id,
          full_name: fullName,
          username: username || "usuario.verse",
          bio: "",
          avatar_url: ""
        }
      ])
      .select()
      .single();

    if (createProfileError) {
      console.error("Erro ao criar profile:", createProfileError.message);
      return;
    }

    profile = newProfile;
  }

  perfilLogado = profile;

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const username = perfilLogado.username || "usuario";
  const firstLetter = fullName.charAt(0).toUpperCase();

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  if (userName) userName.textContent = fullName;
  if (userEmail) userEmail.textContent = `@${username}`;

  if (userAvatar) userAvatar.textContent = firstLetter;
  if (navAvatar) navAvatar.textContent = firstLetter;
  if (createAvatar) createAvatar.textContent = firstLetter;

  if (perfilLogado.avatar_url) {
    mostrarAvatarNaTela(perfilLogado.avatar_url);
  }
}

function mostrarAvatarNaTela(avatarUrl) {
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  const elements = [userAvatar, navAvatar, createAvatar];

  elements.forEach(function (element) {
    if (element) {
      element.style.backgroundImage = `url(${avatarUrl})`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      element.style.color = "transparent";
    }
  });
}

function formatarTempo(dataPost) {
  const agora = new Date();
  const data = new Date(dataPost);

  const diferencaMs = agora - data;
  const segundos = Math.floor(diferencaMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (segundos < 60) return "há poucos segundos";
  if (minutos < 60) return `há ${minutos} min`;
  if (horas < 24) return `há ${horas} h`;

  return `há ${dias} d`;
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

      ${post.content ? `<p class="post-text">${post.content}</p>` : ""}

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
        <button>↗ Compartilhar</button>
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

  if (commentBtn && commentsBox) {
    commentBtn.addEventListener("click", async function () {
      commentsBox.style.display =
        commentsBox.style.display === "none" ? "block" : "none";

      await carregarComentarios(postId);
    });
  }

  if (sendCommentBtn) {
    sendCommentBtn.addEventListener("click", async function () {
      await enviarComentario(postId);
    });
  }
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
    await supabaseClient
      .from("likes")
      .insert([
        {
          post_id: postId,
          user_id: usuarioLogado.id
        }
      ]);
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

  input.value = "";

  await carregarComentarios(postId);
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
    .from("post-image")
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

  postContent.value = "";

  limparImagemSelecionada();

  await carregarPosts();
}

function configurarMenuPerfil() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      profileDropdown.classList.toggle("show");
    });

    profileDropdown.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    document.addEventListener("click", function () {
      profileDropdown.classList.remove("show");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await supabaseClient.auth.signOut();
      window.location.href = "../html/login.html";
    });
  }
}

async function carregarNotificacoes() {
  const notificationList = document.getElementById("notificationList");
  const notificationBadge = document.getElementById("notificationBadge");

  if (!notificationList || !notificationBadge || !usuarioLogado) return;

  const { data: notifications, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", usuarioLogado.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Erro ao carregar notificações:", error.message);
    return;
  }

  notificationList.innerHTML = "";

  if (!notifications || notifications.length === 0) {
    notificationList.innerHTML =
      `<p class="empty-notifications">Nenhuma notificação ainda.</p>`;

    notificationBadge.classList.remove("show");
    return;
  }

  const unreadCount = notifications.filter(item => !item.is_read).length;

  if (unreadCount > 0) {
    notificationBadge.textContent = unreadCount;
    notificationBadge.classList.add("show");
  } else {
    notificationBadge.classList.remove("show");
  }

  notifications.forEach(notification => {
    const item = document.createElement("div");

    item.classList.add("notification-item");

    if (!notification.is_read) {
      item.classList.add("unread");
    }

    item.innerHTML = `
      <strong>${notification.message}</strong>
      <span>${formatarTempo(notification.created_at)}</span>
    `;

    item.addEventListener("click", async function () {
      await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      if (notification.link) {
        window.location.href = notification.link;
      } else {
        carregarNotificacoes();
      }
    });

    notificationList.appendChild(item);
  });
}

function configurarNotificacoes() {
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDropdown = document.getElementById("notificationDropdown");

  if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      notificationDropdown.classList.toggle("show");

      carregarNotificacoes();
    });

    notificationDropdown.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    document.addEventListener("click", function () {
      notificationDropdown.classList.remove("show");
    });
  }
}

async function carregarSugestoes() {
  console.log("Carregar sugestões chamado no Feed");

  const suggestionsContainer =
    document.getElementById("suggestionsContainer");

  if (!suggestionsContainer) {
    console.log("suggestionsContainer não encontrado");
    return;
  }

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .neq("id", usuarioLogado.id)
    .limit(5);

  console.log("Usuários encontrados:", users);

  if (error) {
    console.error("Erro ao carregar sugestões:", error.message);
    return;
  }

  suggestionsContainer.innerHTML = "";

  if (!users || users.length === 0) {
    suggestionsContainer.innerHTML =
      "<p>Nenhuma sugestão disponível.</p>";
    return;
  }

  const userIds = users.map(user => user.id);

  const { data: follows, error: followsError } = await supabaseClient
    .from("followers")
    .select("*")
    .eq("follower_id", usuarioLogado.id)
    .in("following_id", userIds);

  if (followsError) {
    console.error("Erro ao carregar follows:", followsError.message);
    return;
  }

  users.forEach(function (user) {
    const jaSegue = follows.some(
      follow => follow.following_id === user.id
    );

    const firstLetter =
      (user.full_name || "U").charAt(0).toUpperCase();

    const avatarStyle = user.avatar_url
      ? `background-image: url('${user.avatar_url}'); background-size: cover; background-position: center; color: transparent;`
      : "";

    const card = document.createElement("div");
    card.classList.add("suggestion-card");

    card.innerHTML = `
      <div class="suggestion-avatar" style="${avatarStyle}">
        ${firstLetter}
      </div>

      <div class="suggestion-info">
        <strong>${user.full_name || "Usuário Verse"}</strong>
        <span>@${user.username || "usuario"}</span>
      </div>

      <button
        class="follow-btn ${jaSegue ? "following" : ""}"
        data-user-id="${user.id}">
        ${jaSegue ? "Seguindo" : "Seguir"}
      </button>
    `;

    const followBtn = card.querySelector(".follow-btn");

    followBtn.addEventListener("click", async function () {
      await alternarFollowSugestao(user.id, followBtn);
    });

    suggestionsContainer.appendChild(card);
  });
}

async function alternarFollowSugestao(userId, button) {
  const jaSegue = button.classList.contains("following");

  button.disabled = true;

  if (jaSegue) {
    const { error } = await supabaseClient
      .from("followers")
      .delete()
      .eq("follower_id", usuarioLogado.id)
      .eq("following_id", userId);

    if (error) {
      console.error("Erro ao deixar de seguir:", error.message);
      alert("Não foi possível deixar de seguir.");
      button.disabled = false;
      return;
    }

    button.classList.remove("following");
    button.textContent = "Seguir";
  } else {
    const { error } = await supabaseClient
      .from("followers")
      .insert([
        {
          follower_id: usuarioLogado.id,
          following_id: userId
        }
      ]);

    if (error) {
      console.error("Erro ao seguir:", error.message);
      alert("Não foi possível seguir.");
      button.disabled = false;
      return;
    }

    button.classList.add("following");
    button.textContent = "Seguindo";
  }

  button.disabled = false;
}


async function iniciarFeed() {
  await carregarUsuarioLogado();
  await carregarPosts();
  await carregarSugestoes();
  await carregarNotificacoes();
  

  const publishBtn = document.getElementById("publishBtn");

  if (publishBtn) {
    publishBtn.addEventListener("click", criarPost);
  }

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarUploadImagemPost();
  
}

iniciarFeed();