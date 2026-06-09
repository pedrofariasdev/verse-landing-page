console.log("Settings.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;

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
  }

  if (perfilLogado.avatar_url && navAvatar) {
    navAvatar.style.backgroundImage = `url(${perfilLogado.avatar_url})`;
    navAvatar.style.backgroundSize = "cover";
    navAvatar.style.backgroundPosition = "center";
    navAvatar.style.color = "transparent";
  }

  carregarConfiguracoesNaTela();
}

function aplicarTema(theme) {
  document.body.classList.remove(
    "theme-light",
    "theme-dark",
    "theme-auto"
  );

  document.body.classList.add(`theme-${theme}`);
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

  aplicarTema(
    perfilLogado.theme || "light"
  );
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
  const themeSelect = document.getElementById("themeSelect");

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", salvarConfiguracoes);
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      aplicarTema(this.value);
    });
  }
}

async function iniciarSettings() {
  await carregarNotificacoes();
  await carregarUsuario();
  configurarBotoes();
  configurarMenuPerfil();
  configurarNotificacoes();
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

iniciarSettings();