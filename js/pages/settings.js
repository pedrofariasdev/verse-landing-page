console.log("Settings.js carregado!");

async function carregarUsuario() {
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

  if (profileError) {
    console.error("Erro ao carregar profile:", profileError.message);
    return;
  }

  perfilLogado = profile;

  const userEmail = document.getElementById("userEmail");
  const navAvatar = document.getElementById("navAvatar");

  if (userEmail) {
    userEmail.value = usuarioLogado.email || "";
    userEmail.disabled = true;
  }

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const firstLetter = fullName.charAt(0).toUpperCase();

  if (navAvatar) {
    navAvatar.textContent = firstLetter;

    if (perfilLogado.avatar_url) {
      navAvatar.style.backgroundImage = `url(${perfilLogado.avatar_url})`;
      navAvatar.style.backgroundSize = "cover";
      navAvatar.style.backgroundPosition = "center";
      navAvatar.style.color = "transparent";
    } else {
      navAvatar.style.backgroundImage = "none";
      navAvatar.style.color = "#ffffff";
    }
  }

  carregarConfiguracoesNaTela();
}

function carregarConfiguracoesNaTela() {
  const privateProfile = document.getElementById("privateProfile");
  const showLocation = document.getElementById("showLocation");
  const showGenres = document.getElementById("showGenres");
  const showMemberSince = document.getElementById("showMemberSince");

  const notifyLikes = document.getElementById("notifyLikes");
  const notifyComments = document.getElementById("notifyComments");
  const notifyFollowers = document.getElementById("notifyFollowers");
  const notifyMessages = document.getElementById("notifyMessages");

  const themeSelect = document.getElementById("themeSelect");

  if (privateProfile) {
    privateProfile.checked = perfilLogado.private_profile || false;
  }

  if (showLocation) {
    showLocation.checked = perfilLogado.show_location !== false;
  }

  if (showGenres) {
    showGenres.checked = perfilLogado.show_genres !== false;
  }

  if (showMemberSince) {
    showMemberSince.checked = perfilLogado.show_member_since !== false;
  }

  if (notifyLikes) {
    notifyLikes.checked = perfilLogado.notify_likes !== false;
  }

  if (notifyComments) {
    notifyComments.checked = perfilLogado.notify_comments !== false;
  }

  if (notifyFollowers) {
    notifyFollowers.checked = perfilLogado.notify_followers !== false;
  }

  if (notifyMessages) {
    notifyMessages.checked = perfilLogado.notify_messages !== false;
  }

  if (themeSelect) {
    themeSelect.value = perfilLogado.theme || "light";
  }
}

async function salvarConfiguracoes() {
  const privateProfile = document.getElementById("privateProfile");
  const showLocation = document.getElementById("showLocation");
  const showGenres = document.getElementById("showGenres");
  const showMemberSince = document.getElementById("showMemberSince");

  const notifyLikes = document.getElementById("notifyLikes");
  const notifyComments = document.getElementById("notifyComments");
  const notifyFollowers = document.getElementById("notifyFollowers");
  const notifyMessages = document.getElementById("notifyMessages");

  const themeSelect = document.getElementById("themeSelect");

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      private_profile: privateProfile ? privateProfile.checked : false,
      show_location: showLocation ? showLocation.checked : true,
      show_genres: showGenres ? showGenres.checked : true,
      show_member_since: showMemberSince ? showMemberSince.checked : true,

      notify_likes: notifyLikes ? notifyLikes.checked : true,
      notify_comments: notifyComments ? notifyComments.checked : true,
      notify_followers: notifyFollowers ? notifyFollowers.checked : true,
      notify_messages: notifyMessages ? notifyMessages.checked : true,

      theme: themeSelect ? themeSelect.value : "light"
    })
    .eq("id", usuarioLogado.id);

  if (error) {
    console.error("Erro ao salvar configurações:", error.message);
    alert("Não foi possível salvar as configurações.");
    return;
  }

  alert("Configurações salvas com sucesso!");
}

function configurarBotoes() {
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", salvarConfiguracoes);
  }
}

async function iniciarSettings() {
  await carregarUsuario();

  await carregarNotificacoes();

  configurarBotoes();
  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();
}

iniciarSettings();