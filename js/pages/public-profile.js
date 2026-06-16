console.log("Public Profile carregado!");


let usuarioPerfil = null;
let jaSegue = false;

function formatarHashtags(texto) {
  if (!texto) return "";

  return texto.replace(/#([\wÀ-ÿ]+)/g, function (match, tag) {
    return `<a href="../html/hashtag.html?tag=${encodeURIComponent(tag.toLowerCase())}" class="hashtag-link">#${tag}</a>`;
  });
}

function obterIdDaUrl() {
  const params = new URLSearchParams(window.location.search);

  return params.get("id");
}

async function carregarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  const { data: meuPerfil, error: meuPerfilError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", usuarioLogado.id)
    .single();

  if (meuPerfilError) {
    console.error("Erro ao carregar meu perfil:", meuPerfilError.message);
    return;
  }

  const navAvatar = document.getElementById("navAvatar");
  const firstLetter = (meuPerfil.full_name || "U").charAt(0).toUpperCase();

  if (navAvatar) {
    navAvatar.textContent = firstLetter;
  }

  if (meuPerfil.avatar_url && navAvatar) {
    navAvatar.style.backgroundImage = `url(${meuPerfil.avatar_url})`;
    navAvatar.style.backgroundSize = "cover";
    navAvatar.style.backgroundPosition = "center";
    navAvatar.style.color = "transparent";
  }
}

async function carregarPerfilPublico() {

  const userId = obterIdDaUrl();

  if (!userId) {
    alert("Usuário não encontrado.");
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error(error);
    alert("Perfil não encontrado.");
    return;
  }

  usuarioPerfil = profile;

  preencherPerfil();
  carregarPosts();
}

function preencherPerfil() {

  const profileName =
    document.getElementById("publicProfileName");

  const profileUsername =
    document.getElementById("publicProfileUsername");

  const profileBio =
    document.getElementById("publicProfileBio");

  const profileGenres =
    document.getElementById("publicProfileGenres");

  const profileLocation =
    document.getElementById("publicProfileLocation");

  const profileMemberSince =
    document.getElementById("publicProfileMemberSince");

  const profileAvatar =
    document.getElementById("publicProfileAvatar");

  const profileBanner =
    document.getElementById("publicProfileBanner");

  const profileTags =
    document.getElementById("publicProfileTags");

  profileName.textContent =
    usuarioPerfil.full_name || "Usuário Verse";

  profileUsername.textContent =
    "@" + (usuarioPerfil.username || "usuario");

  profileBio.textContent =
    usuarioPerfil.bio ||
    "Este usuário ainda não adicionou uma bio.";

  profileLocation.textContent =
    usuarioPerfil.location ||
    "Não informado";

  profileGenres.textContent =
    usuarioPerfil.favorite_genres?.join(" • ") ||
    "Não informado";

    const messageBtn =
  document.getElementById("messageBtn");

    if (messageBtn) {

  messageBtn.onclick = function () {

    window.location.href =
      `../html/messages.html?receiver=${usuarioPerfil.id}`;

  };

    }

  if (usuarioPerfil.created_at) {

    const data = new Date(usuarioPerfil.created_at);

    profileMemberSince.textContent =
      data.toLocaleDateString("pt-PT");
  }

  if (usuarioPerfil.avatar_url) {

    profileAvatar.style.backgroundImage =
      `url(${usuarioPerfil.avatar_url})`;

    profileAvatar.style.backgroundSize = "cover";
    profileAvatar.style.backgroundPosition = "center";
    profileAvatar.style.color = "transparent";

  } else {

    profileAvatar.textContent =
      usuarioPerfil.full_name
      .charAt(0)
      .toUpperCase();

  }

  if (usuarioPerfil.banner_url) {

    profileBanner.style.backgroundImage =
      `url(${usuarioPerfil.banner_url})`;

    profileBanner.style.backgroundSize = "cover";
    profileBanner.style.backgroundPosition = "center";
  }

  profileTags.innerHTML = "";

  if (
    usuarioPerfil.tags &&
    usuarioPerfil.tags.length > 0
  ) {

    usuarioPerfil.tags.forEach(tag => {

      const span =
        document.createElement("span");

      span.classList.add("profile-tag");

      span.textContent = tag;

      profileTags.appendChild(span);

    });

  }

}

async function verificarSeSegue() {
  const followBtn = document.getElementById("followBtn");

  if (!followBtn || !usuarioLogado || !usuarioPerfil) return;

  if (usuarioLogado.id === usuarioPerfil.id) {
    followBtn.style.display = "none";

    const messageBtn = document.getElementById("messageBtn");
    if (messageBtn) messageBtn.style.display = "none";

    return;
  }

  const { data, error } = await supabaseClient
    .from("followers")
    .select("*")
    .eq("follower_id", usuarioLogado.id)
    .eq("following_id", usuarioPerfil.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar follow:", error.message);
    return;
  }

  jaSegue = !!data;

  atualizarBotaoFollow();

  followBtn.onclick = alternarFollow;
}

function atualizarBotaoFollow() {
  const followBtn = document.getElementById("followBtn");

  if (!followBtn) return;

  if (jaSegue) {
    followBtn.textContent = "Seguindo";
    followBtn.classList.add("following");
  } else {
    followBtn.textContent = "Seguir";
    followBtn.classList.remove("following");
  }
}

async function alternarFollow() {
  const followBtn = document.getElementById("followBtn");

  if (!usuarioLogado || !usuarioPerfil) return;

  followBtn.disabled = true;

  if (jaSegue) {
    const { error } = await supabaseClient
      .from("followers")
      .delete()
      .eq("follower_id", usuarioLogado.id)
      .eq("following_id", usuarioPerfil.id);

    if (error) {
      console.error("Erro ao deixar de seguir:", error.message);
      alert("Não foi possível deixar de seguir.");
      followBtn.disabled = false;
      return;
    }

    jaSegue = false;
  } else {
    const { error } = await supabaseClient
      .from("followers")
      .insert([
        {
          follower_id: usuarioLogado.id,
          following_id: usuarioPerfil.id
        }
      ]);

    if (error) {
      console.error("Erro ao seguir:", error.message);
      alert("Não foi possível seguir este usuário.");
      followBtn.disabled = false;
      return;
    }

    jaSegue = true;
  }

  atualizarBotaoFollow();
  await carregarContadoresFollow();
  await criarNotificacaoFollow();

  followBtn.disabled = false;
}

async function criarNotificacaoFollow() {
  if (!usuarioLogado || !usuarioPerfil) return;

  if (usuarioLogado.id === usuarioPerfil.id) return;

  const { data: meuPerfil } = await supabaseClient
    .from("profiles")
    .select("full_name")
    .eq("id", usuarioLogado.id)
    .single();

  const nome =
    meuPerfil?.full_name || "Alguém";

  const { error } = await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: usuarioPerfil.id,
        sender_id: usuarioLogado.id,
        type: "follow",
        message: `${nome} começou a seguir você.`,
        link: `../html/public-profile.html?id=${usuarioLogado.id}`
      }
    ]);

  if (error) {
    console.error("Erro ao criar notificação:", error.message);
  }
}

async function carregarContadoresFollow() {
  if (!usuarioPerfil) return;

  const followersCountEl =
    document.getElementById("publicProfileFollowersCount");

  const followingCountEl =
    document.getElementById("publicProfileFollowingCount");

  const { count: followersCount, error: followersError } = await supabaseClient
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("following_id", usuarioPerfil.id);

  const { count: followingCount, error: followingError } = await supabaseClient
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", usuarioPerfil.id);

  if (!followersError && followersCountEl) {
    followersCountEl.textContent = followersCount || 0;
  }

  if (!followingError && followingCountEl) {
    followingCountEl.textContent = followingCount || 0;
  }
}

async function carregarPosts() {

  const container =
    document.getElementById(
      "publicProfilePostsContainer"
    );

  const count =
    document.getElementById(
      "publicProfilePostsCount"
    );

  if (!container) return;

  container.innerHTML = "";

  const { data: posts, error } =
    await supabaseClient
      .from("posts")
      .select("*")
      .eq("user_id", usuarioPerfil.id)
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    console.error(error);
    return;
  }

  count.textContent =
    posts ? posts.length : 0;

  if (!posts || posts.length === 0) {

    container.innerHTML =
      "<p>Este usuário ainda não publicou nada.</p>";

    return;
  }

  posts.forEach(post => {

    const card =
      document.createElement("article");

    card.classList.add("post-card");

    card.innerHTML = `
      <div class="post-header">

        <div class="post-user-info">

          <h3>
            ${usuarioPerfil.full_name}
          </h3>

          <span>
            @${usuarioPerfil.username}
          </span>

        </div>

      </div>

      <p class="post-text">
        ${formatarHashtags(post.content || "")}
      </p>

      ${
        post.image_url
          ? `
          <img
            src="${post.image_url}"
            class="post-image"
            alt="Imagem da publicação">
          `
          : ""
      }

      <div class="post-actions">

        <button
          class="like-btn"
          data-post-id="${post.id}">
          ♡ Curtir
        </button>

        <button
          class="comment-btn"
          data-post-id="${post.id}">
          💬 Comentar
        </button>

        <button>↻ Repostar</button>

        <button>❝ Citar</button>

        <button class="share-btn" data-post-id="${post.id}">
          ↗ Compartilhar
        </button>

      </div>

      <div
        class="comments-box"
        id="comments-${post.id}"
        style="display:none;">

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
    configurarAcoesDoPost(post.id);

  });

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
    const { error } = await supabaseClient
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", usuarioLogado.id);

    if (error) {
      console.error("Erro ao remover curtida:", error.message);
      alert("Não foi possível remover a curtida.");
      button.disabled = false;
      return;
    }
  } else {
    const { error } = await supabaseClient
      .from("likes")
      .insert([
        {
          post_id: postId,
          user_id: usuarioLogado.id
        }
      ]);

    if (error) {
      console.error("Erro ao curtir:", error.message);
      alert("Não foi possível curtir.");
      button.disabled = false;
      return;
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
    commentsList.innerHTML =
      "<p class='empty-comments'>Nenhum comentário ainda.</p>";
    return;
  }

  const userIds = [...new Set(comments.map(comment => comment.user_id))];

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error("Erro ao carregar autores dos comentários:", profilesError.message);
    return;
  }

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

function configurarPesquisaGlobal() {
  const searchInput = document.getElementById("globalSearchInput");
  const searchResults = document.getElementById("globalSearchResults");

  if (!searchInput || !searchResults) return;

  let searchTimeout = null;

  searchInput.addEventListener("input", function () {
    const term = searchInput.value.trim();

    clearTimeout(searchTimeout);

    if (term.length < 2) {
      searchResults.classList.remove("show");
      searchResults.innerHTML = "";
      return;
    }

    searchTimeout = setTimeout(function () {
      buscarUsuarios(term);
    }, 400);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".search-wrapper")) {
      searchResults.classList.remove("show");
    }
  });
}

async function buscarUsuarios(term) {
  const searchResults = document.getElementById("globalSearchResults");

  if (!searchResults) return;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(6);

  if (error) {
    console.error("Erro ao pesquisar usuários:", error.message);
    return;
  }

  searchResults.innerHTML = "";

  if (!users || users.length === 0) {
    searchResults.innerHTML = `
      <p class="search-empty">
        Nenhum usuário encontrado.
      </p>
    `;

    searchResults.classList.add("show");
    return;
  }

  searchResults.innerHTML = `
    <div class="search-section-title">
      Usuários
    </div>
  `;

  users.forEach(function (user) {
    const firstLetter =
      (user.full_name || "U").charAt(0).toUpperCase();

    const avatarStyle = user.avatar_url
      ? `background-image: url('${user.avatar_url}'); background-size: cover; background-position: center; color: transparent;`
      : "";

    const item = document.createElement("div");

    item.classList.add("search-result-item");

    item.innerHTML = `
      <div
        class="search-result-avatar"
        style="${avatarStyle}">
        ${firstLetter}
      </div>

      <div class="search-result-info">
        <strong>${user.full_name || "Usuário Verse"}</strong>
        <span>@${user.username || "usuario"}</span>
      </div>
    `;

    item.addEventListener("click", function () {
      window.location.href =
        `../html/public-profile.html?id=${user.id}`;
    });

    searchResults.appendChild(item);
  });

  searchResults.classList.add("show");
}



async function iniciarPerfilPublico() {
  await carregarUsuarioLogado();
  await carregarPerfilPublico();
  await verificarSeSegue();
  await carregarContadoresFollow();
  await carregarNotificacoes();
  //await carregarBadgeMensagens();

  configurarMenuPerfil();
  configurarNotificacoes();
  //configurarUploadImagemPost();
  configurarPesquisaGlobal();
  configurarCompartilhamentoPost();
}

iniciarPerfilPublico();