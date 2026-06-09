console.log("Feed.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;

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

      <p class="post-text">${post.content}</p>

      <div class="post-actions">
        <button>♡ Curtir</button>
        <button>💬 Comentar</button>
        <button>↻ Repostar</button>
        <button>❝ Citar</button>
        <button>↗ Compartilhar</button>
      </div>
    `;

    postsContainer.appendChild(postCard);
  });
}

async function criarPost() {
  const postContent = document.getElementById("postContent");
  const publishBtn = document.getElementById("publishBtn");

  const content = postContent.value.trim();

  if (!content) {
    alert("Escreva algo antes de publicar.");
    return;
  }

  if (!usuarioLogado) {
    alert("Você precisa estar logado para publicar.");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publicando...";

  const { data, error } = await supabaseClient
    .from("posts")
    .insert([
      {
        user_id: usuarioLogado.id,
        content: content,
        post_type: "text"
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
async function iniciarFeed() {
  await carregarUsuarioLogado();
  await carregarPosts();
  await carregarNotificacoes();

  const publishBtn = document.getElementById("publishBtn");

  if (publishBtn) {
    publishBtn.addEventListener("click", criarPost);
  }

  configurarMenuPerfil();
  configurarNotificacoes();
}

iniciarFeed();