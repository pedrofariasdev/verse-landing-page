console.log("Profile.js carregado!");



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

      ${post.content ? `
      <p class="post-text">
        ${transformarHashtagsEmLinks(post.content || "")}
      </p>
    ` : ""}

    ${post.image_url ? `
      <img
        src="${post.image_url}"
        class="post-image"
        alt="Imagem da publicação"
      >
    ` : ""}

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

    profilePostsContainer.appendChild(postCard);
    configurarAcoesDoPost(post.id);
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

async function carregarContadorHistoriasPerfil() {
  const storiesCounter = document.getElementById("profileStoriesCount");

  if (!storiesCounter || !usuarioLogado) return;

  const { count, error } = await supabaseClient
    .from("stories")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("user_id", usuarioLogado.id);

  if (error) {
    console.error("Erro ao contar histórias:", error.message);
    storiesCounter.textContent = "0";
    return;
  }

  storiesCounter.textContent = count || 0;
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
    commentsList.innerHTML =
      "<p class='empty-comments'>Nenhum comentário ainda.</p>";
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



async function iniciarPerfil() {
  await carregarPerfil();
  await carregarPostsDoPerfil();
  await carregarSugestoes();
  await carregarContadoresFollowPerfil();
  await carregarNotificacoes();
  await carregarContadorHistoriasPerfil();
  //await carregarBadgeMensagens();
  configurarPesquisaGlobal();
  

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
  configurarPesquisaGlobal();
  configurarCompartilhamentoPost();
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

async function carregarContadoresFollowPerfil() {
  const followersCountEl = document.getElementById("profileFollowersCount");
  const followingCountEl = document.getElementById("profileFollowingCount");

  if (!usuarioLogado) return;

  const { count: followersCount, error: followersError } = await supabaseClient
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("following_id", usuarioLogado.id);

  const { count: followingCount, error: followingError } = await supabaseClient
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", usuarioLogado.id);

  if (!followersError && followersCountEl) {
    followersCountEl.textContent = followersCount || 0;
  }

  if (!followingError && followingCountEl) {
    followingCountEl.textContent = followingCount || 0;
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

iniciarPerfil();