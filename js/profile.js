console.log("Profile.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;
let tagsSelecionadas = [];
let generosSelecionados = [];

async function carregarPerfil() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não autenticado");
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", usuarioLogado.id)
    .single();

  if (profileError) {
    console.error("Erro ao carregar profile:", profileError.message);
    return;
  }

  perfilLogado = profile;

  console.log("Perfil carregado:", perfilLogado);

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const username = perfilLogado.username || "usuario";
  const bio = perfilLogado.bio || "Este usuário ainda não adicionou uma bio.";
  const firstLetter = fullName.charAt(0).toUpperCase();

  const navAvatar = document.getElementById("navAvatar");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileUsername = document.getElementById("profileUsername");
  const profileBio = document.getElementById("profileBio");
  const profileTags = document.getElementById("profileTags");
  const profileGenres = document.getElementById("profileGenres");
  const profileLocation = document.getElementById("profileLocation");
  const profileMemberSince = document.getElementById("profileMemberSince");

  if (navAvatar) navAvatar.textContent = firstLetter;

  if (profileAvatar) {
    profileAvatar.childNodes[0].nodeValue = firstLetter;
  }

  if (profileName) profileName.textContent = fullName;
  if (profileUsername) profileUsername.textContent = `@${username}`;
  if (profileBio) profileBio.textContent = bio;

  if (profileTags) {
    profileTags.innerHTML = "";

    if (perfilLogado.tags && perfilLogado.tags.length > 0) {
      perfilLogado.tags.forEach(function (tag) {
        const tagElement = document.createElement("span");
        tagElement.classList.add("profile-tag");
        tagElement.textContent = tag;
        profileTags.appendChild(tagElement);
      });
    }
  }

  if (profileGenres) {
    if (perfilLogado.favorite_genres && perfilLogado.favorite_genres.length > 0) {
      profileGenres.textContent = perfilLogado.favorite_genres.join(" · ");
    } else {
      profileGenres.textContent = "Não informado";
    }
  }

  if (profileLocation) {
    profileLocation.textContent = perfilLogado.location || "Não informado";
  }

  if (profileMemberSince && perfilLogado.created_at) {
    const dataCriacao = new Date(perfilLogado.created_at);

    profileMemberSince.textContent = dataCriacao.toLocaleDateString("pt-PT", {
      month: "long",
      year: "numeric"
    });
  }

  if (perfilLogado.avatar_url) {
    mostrarAvatarNaTela(perfilLogado.avatar_url);
  }

  if (perfilLogado.banner_url) {
    mostrarBannerNaTela(perfilLogado.banner_url);
  }
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

async function carregarPostsDoPerfil() {
  const profilePostsContainer = document.getElementById("profilePostsContainer");
  const profilePostsCount = document.getElementById("profilePostsCount");

  if (!profilePostsContainer) return;

  profilePostsContainer.innerHTML = "";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("user_id", usuarioLogado.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts do perfil:", error.message);
    profilePostsContainer.innerHTML =
      "<p>Não foi possível carregar as publicações.</p>";
    return;
  }

  if (profilePostsCount) {
    profilePostsCount.textContent = posts ? posts.length : 0;
  }

  if (!posts || posts.length === 0) {
    profilePostsContainer.innerHTML =
      "<p>Você ainda não tem publicações.</p>";
    return;
  }

  posts.forEach(function (post) {
    const fullName = perfilLogado.full_name || "Usuário Verse";
    const username = perfilLogado.username || "usuario";
    const firstLetter = fullName.charAt(0).toUpperCase();

    const avatarStyle = perfilLogado.avatar_url
      ? "background-image: url('" + perfilLogado.avatar_url + "'); background-size: cover; background-position: center; color: transparent;"
      : "";

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar" style="${avatarStyle}">
          ${firstLetter}
        </div>

        <div class="post-user-info">
          <h3>${fullName}</h3>
          <span>@${username} · ${formatarTempo(post.created_at)}</span>
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

    profilePostsContainer.appendChild(postCard);
  });
}

function configurarModalPerfil() {
  const editBtn = document.getElementById("editProfileBtn");
  const modal = document.getElementById("editProfileModal");
  const closeBtn = document.getElementById("closeModalBtn");
  const closeBtn2 = document.getElementById("closeModalBtn2");
  const bioInput = document.getElementById("editBio");
  const bioCounter = document.getElementById("bioCounter");
  const tagButtons = document.querySelectorAll(".tag-option");
  const genreButtons = document.querySelectorAll(".genre-option");

  if (editBtn) {
    editBtn.addEventListener("click", function () {
      document.getElementById("editFullName").value =
        perfilLogado.full_name || "";

      document.getElementById("editUsername").value =
        perfilLogado.username || "";

      document.getElementById("editBio").value =
        perfilLogado.bio || "";

      document.getElementById("editLocation").value =
        perfilLogado.location || "";

      tagsSelecionadas = perfilLogado.tags || [];
      generosSelecionados = perfilLogado.favorite_genres || [];

      tagButtons.forEach(function (button) {
        const tag = button.dataset.tag;

        if (tagsSelecionadas.includes(tag)) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });

      genreButtons.forEach(function (button) {
        const genre = button.dataset.genre;

        if (generosSelecionados.includes(genre)) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });

      if (bioCounter && bioInput) {
        bioCounter.textContent = bioInput.value.length;
      }

      modal.classList.add("show");
    });
  }

  tagButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const tag = button.dataset.tag;

      if (tagsSelecionadas.includes(tag)) {
        tagsSelecionadas = tagsSelecionadas.filter(function (item) {
          return item !== tag;
        });

        button.classList.remove("active");
        return;
      }

      if (tagsSelecionadas.length >= 3) {
        alert("Você pode escolher no máximo 3 tags.");
        return;
      }

      tagsSelecionadas.push(tag);
      button.classList.add("active");
    });
  });

  genreButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const genre = button.dataset.genre;

      if (generosSelecionados.includes(genre)) {
        generosSelecionados = generosSelecionados.filter(function (item) {
          return item !== genre;
        });

        button.classList.remove("active");
        return;
      }

      if (generosSelecionados.length >= 3) {
        alert("Você pode escolher no máximo 3 gêneros.");
        return;
      }

      generosSelecionados.push(genre);
      button.classList.add("active");
    });
  });

  if (bioInput && bioCounter) {
    bioInput.addEventListener("input", function () {
      bioCounter.textContent = bioInput.value.length;
    });
  }

  function fecharModal() {
    modal.classList.remove("show");
  }

  if (closeBtn) closeBtn.addEventListener("click", fecharModal);
  if (closeBtn2) closeBtn2.addEventListener("click", fecharModal);
}

async function salvarPerfil() {
  const fullName = document.getElementById("editFullName").value.trim();
  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  const locationValue = document.getElementById("editLocation").value.trim();

  if (!fullName) {
    alert("O nome completo é obrigatório.");
    return;
  }

  if (!username) {
    alert("O username é obrigatório.");
    return;
  }

  if (bio.length > 160) {
    alert("A bio deve ter no máximo 160 caracteres.");
    return;
  }

  const usernameRegex = /^[a-zA-Z0-9._]+$/;

  if (!usernameRegex.test(username)) {
    alert("O username só pode ter letras, números, ponto e underline.");
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      full_name: fullName,
      username: username.toLowerCase(),
      bio: bio,
      tags: tagsSelecionadas,
      favorite_genres: generosSelecionados,
      location: locationValue
    })
    .eq("id", usuarioLogado.id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar perfil.");
    return;
  }

  alert("Perfil atualizado!");
  window.location.reload();
}

async function atualizarAvatar(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (!usuarioLogado || !perfilLogado) {
    alert("Usuário não carregado.");
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${usuarioLogado.id}.${fileExt}`;
  const filePath = `profile/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true
    });

  if (uploadError) {
    console.error("Erro ao enviar avatar:", uploadError.message);
    alert("Não foi possível enviar a imagem.");
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      avatar_url: avatarUrl
    })
    .eq("id", usuarioLogado.id);

  if (updateError) {
    console.error("Erro ao salvar avatar:", updateError.message);
    alert("Imagem enviada, mas não foi possível salvar no perfil.");
    return;
  }

  perfilLogado.avatar_url = avatarUrl;

  mostrarAvatarNaTela(avatarUrl);

  alert("Foto de perfil atualizada!");
}

function mostrarAvatarNaTela(avatarUrl) {
  const profileAvatar = document.getElementById("profileAvatar");
  const navAvatar = document.getElementById("navAvatar");

  if (profileAvatar) {
    profileAvatar.style.backgroundImage = `url(${avatarUrl})`;
    profileAvatar.style.backgroundSize = "cover";
    profileAvatar.style.backgroundPosition = "center";
    profileAvatar.style.color = "transparent";
  }

  if (navAvatar) {
    navAvatar.style.backgroundImage = `url(${avatarUrl})`;
    navAvatar.style.backgroundSize = "cover";
    navAvatar.style.backgroundPosition = "center";
    navAvatar.style.color = "transparent";
  }
}

async function atualizarBanner(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (!usuarioLogado || !perfilLogado) {
    alert("Usuário não carregado.");
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${usuarioLogado.id}.${fileExt}`;
  const filePath = `profile/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("banners")
    .upload(filePath, file, {
      upsert: true
    });

  if (uploadError) {
    console.error("Erro ao enviar banner:", uploadError.message);
    alert("Não foi possível enviar o banner.");
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("banners")
    .getPublicUrl(filePath);

  const bannerUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      banner_url: bannerUrl
    })
    .eq("id", usuarioLogado.id);

  if (updateError) {
    console.error("Erro ao salvar banner:", updateError.message);
    alert("Banner enviado, mas não foi possível salvar no perfil.");
    return;
  }

  perfilLogado.banner_url = bannerUrl;

  mostrarBannerNaTela(bannerUrl);

  alert("Banner atualizado!");
}

function mostrarBannerNaTela(bannerUrl) {
  const profileBanner = document.getElementById("profileBanner");

  if (profileBanner) {
    profileBanner.style.backgroundImage = `url(${bannerUrl})`;
    profileBanner.style.backgroundSize = "cover";
    profileBanner.style.backgroundPosition = "center";
  }
}

async function carregarSugestoes() {
  const suggestionsContainer =
    document.getElementById("suggestionsContainer");

  if (!suggestionsContainer) return;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .neq("id", usuarioLogado.id)
    .limit(5);

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

  users.forEach(function (user) {
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

    <button class="follow-btn">
        Seguir
    </button>
    `;

    suggestionsContainer.appendChild(card);
  });
}

async function iniciarPerfil() {
  await carregarPerfil();
  await carregarPostsDoPerfil();
  await carregarSugestoes();
  await carregarNotificacoes();

  const editAvatarBtn = document.getElementById("editAvatarBtn");
  const avatarInput = document.getElementById("avatarInput");

  if (editAvatarBtn && avatarInput) {
    editAvatarBtn.addEventListener("click", function () {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", atualizarAvatar);
  }

  const editBannerBtn = document.getElementById("editBannerBtn");
  const bannerInput = document.getElementById("bannerInput");

  if (editBannerBtn && bannerInput) {
    editBannerBtn.addEventListener("click", function () {
      bannerInput.click();
    });

    bannerInput.addEventListener("change", atualizarBanner);
  }

  configurarModalPerfil();

  const saveProfileBtn = document.getElementById("saveProfileBtn");

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", salvarPerfil);
  }

  configurarMenuPerfil();
  configurarNotificacoes();
}

  const saveProfileBtn = document.getElementById("saveProfileBtn");

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", salvarPerfil);
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

iniciarPerfil();