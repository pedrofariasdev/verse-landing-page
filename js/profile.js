console.log("Profile.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;

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

    perfilLogado.tags.forEach(tag => {

      const tagElement = document.createElement("span");

      tagElement.classList.add("profile-tag");

      tagElement.textContent = tag;

      profileTags.appendChild(tagElement);
    });
  }
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

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");
    const avatarStyle = perfilLogado.avatar_url
        ? "background-image: url('" + perfilLogado.avatar_url + "'); background-size: cover; background-position: center; color: transparent;"
        : "";
    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar" style="${avatarStyle}">${firstLetter}</div>

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

let tagsSelecionadas = [];

function configurarModalPerfil() {
  const editBtn = document.getElementById("editProfileBtn");
  const modal = document.getElementById("editProfileModal");
  const closeBtn = document.getElementById("closeModalBtn");
  const closeBtn2 = document.getElementById("closeModalBtn2");
  const bioInput = document.getElementById("editBio");
  const bioCounter = document.getElementById("bioCounter");
  const tagButtons = document.querySelectorAll(".tag-option");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      document.getElementById("editFullName").value =
        perfilLogado.full_name || "";

      document.getElementById("editUsername").value =
        perfilLogado.username || "";

      document.getElementById("editBio").value =
        perfilLogado.bio || "";

      tagsSelecionadas = perfilLogado.tags || [];

      tagButtons.forEach(button => {
        const tag = button.dataset.tag;

        if (tagsSelecionadas.includes(tag)) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });

      if (bioCounter) {
        bioCounter.textContent = bioInput.value.length;
      }

      modal.classList.add("show");
    });
  }

  tagButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;

      if (tagsSelecionadas.includes(tag)) {
        tagsSelecionadas = tagsSelecionadas.filter(item => item !== tag);
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

  if (bioInput && bioCounter) {
    bioInput.addEventListener("input", () => {
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
      tags: tagsSelecionadas
    })
    .eq("id", usuarioLogado.id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar perfil.");
    return;
  }

  alert("Perfil atualizado!");

  location.reload();
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

  users.forEach(user => {
    const firstLetter =
      (user.full_name || "U").charAt(0).toUpperCase();

    const card = document.createElement("div");

    card.classList.add("suggestion-card");

    card.innerHTML = `
      <div class="suggestion-avatar">
        ${firstLetter}
      </div>

      <div class="suggestion-info">
        <strong>${user.full_name}</strong>
        <span>@${user.username}</span>
      </div>

      <button class="follow-btn">
        Adicionar
      </button>
    `;

    suggestionsContainer.appendChild(card);
  });
}

async function iniciarPerfil() {
  await carregarPerfil();
  await carregarPostsDoPerfil();
  await carregarSugestoes();

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
}

iniciarPerfil();