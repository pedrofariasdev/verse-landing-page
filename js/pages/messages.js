console.log("Messages.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;
let conversaSelecionada = null;
let mensagensAtuais = [];

async function carregarUsuarioLogado() {
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
    console.error("Erro ao carregar perfil:", profileError.message);
    return;
  }

  perfilLogado = profile;

  const navAvatar = document.getElementById("navAvatar");
  const firstLetter =
    (perfilLogado.full_name || "U").charAt(0).toUpperCase();

  if (navAvatar) {
    navAvatar.textContent = firstLetter;
  }

  if (perfilLogado.avatar_url && navAvatar) {
    navAvatar.style.backgroundImage = `url(${perfilLogado.avatar_url})`;
    navAvatar.style.backgroundSize = "cover";
    navAvatar.style.backgroundPosition = "center";
    navAvatar.style.color = "transparent";
  }
}

function obterReceiverDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("receiver");
}

async function carregarConversas() {
  const conversationsList = document.getElementById("conversationsList");

  if (!conversationsList) return;

  conversationsList.innerHTML = "";

  const { data: messages, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${usuarioLogado.id},receiver_id.eq.${usuarioLogado.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar conversas:", error.message);
    conversationsList.innerHTML =
      "<div class='empty-conversations'>Não foi possível carregar as conversas.</div>";
    return;
  }

  if (!messages || messages.length === 0) {
    conversationsList.innerHTML =
      "<div class='empty-conversations'>Nenhuma conversa ainda.</div>";
    return;
  }

  const otherUserIds = [];

  messages.forEach(message => {
    const otherId =
      message.sender_id === usuarioLogado.id
        ? message.receiver_id
        : message.sender_id;

    if (!otherUserIds.includes(otherId)) {
      otherUserIds.push(otherId);
    }
  });

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", otherUserIds);

  if (profilesError) {
    console.error("Erro ao carregar perfis:", profilesError.message);
    return;
  }

  otherUserIds.forEach(userId => {
    const userProfile = profiles.find(profile => profile.id === userId);

    const lastMessage = messages.find(message => {
      return (
        message.sender_id === userId ||
        message.receiver_id === userId
      );
    });

    const unreadCount = messages.filter(message => {
      return (
        message.sender_id === userId &&
        message.receiver_id === usuarioLogado.id &&
        message.is_read === false
      );
    }).length;

    if (!userProfile) return;

    criarItemConversa(userProfile, lastMessage, unreadCount);
  });
}

function criarItemConversa(userProfile, lastMessage, unreadCount = 0) {
  const conversationsList = document.getElementById("conversationsList");

  const firstLetter =
    (userProfile.full_name || "U").charAt(0).toUpperCase();

  const avatarStyle = userProfile.avatar_url
    ? `background-image: url('${userProfile.avatar_url}'); background-size: cover; background-position: center; color: transparent;`
    : "";

  const item = document.createElement("div");
  item.classList.add("conversation-item");
  item.dataset.userId = userProfile.id;

  item.innerHTML = `
    <div class="conversation-avatar" style="${avatarStyle}">
      ${firstLetter}
    </div>

    <div class="conversation-info">
      <strong>${userProfile.full_name || "Usuário Verse"}</strong>
      <span>${lastMessage?.content || "Nova conversa"}</span>
    </div>

    ${unreadCount > 0 ? `
    <span class="conversation-unread-badge">
      ${unreadCount}
    </span>
    ` : ""}
  `;

  item.addEventListener("click", function () {
    abrirConversa(userProfile);
  });

  conversationsList.appendChild(item);
}

async function abrirConversa(userProfile) {
  conversaSelecionada = userProfile;

  await marcarMensagensComoLidas(conversaSelecionada.id);
  await carregarConversas();
  await carregarBadgeMensagens();

  document.querySelectorAll(".conversation-item").forEach(item => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".conversation-item").forEach(item => {
    if (item.dataset.userId === userProfile.id) {
      item.classList.add("active");
    }
  });

  const chatUserAvatar = document.getElementById("chatUserAvatar");
  const chatUserName = document.getElementById("chatUserName");
  const chatUserUsername = document.getElementById("chatUserUsername");
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");

  const firstLetter =
    (userProfile.full_name || "U").charAt(0).toUpperCase();

  if (chatUserAvatar) {
    chatUserAvatar.textContent = firstLetter;

    if (userProfile.avatar_url) {
      chatUserAvatar.style.backgroundImage = `url(${userProfile.avatar_url})`;
      chatUserAvatar.style.backgroundSize = "cover";
      chatUserAvatar.style.backgroundPosition = "center";
      chatUserAvatar.style.color = "transparent";
    } else {
      chatUserAvatar.style.backgroundImage = "none";
      chatUserAvatar.style.color = "white";
    }
  }

  if (chatUserName) {
    chatUserName.textContent =
      userProfile.full_name || "Usuário Verse";
  }

  if (chatUserUsername) {
    chatUserUsername.textContent =
      "@" + (userProfile.username || "usuario");
  }

  if (messageInput) {
    messageInput.disabled = false;
  }

  if (sendMessageBtn) {
    sendMessageBtn.disabled = false;
  }

  await carregarMensagensDaConversa(userProfile.id);
}

async function carregarMensagensDaConversa(otherUserId) {
  const chatMessages = document.getElementById("chatMessages");

  if (!chatMessages) return;

  chatMessages.innerHTML = "";

  const { data: messages, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${usuarioLogado.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${usuarioLogado.id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error.message);
    chatMessages.innerHTML =
      "<div class='empty-chat'>Não foi possível carregar as mensagens.</div>";
    return;
  }

  mensagensAtuais = messages || [];

  if (!messages || messages.length === 0) {
    chatMessages.innerHTML =
      "<div class='empty-chat'><strong>Nova conversa</strong><p>Envie a primeira mensagem.</p></div>";
    return;
  }

  messages.forEach(message => {
    criarBolhaMensagem(message);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function criarBolhaMensagem(message) {
  const chatMessages = document.getElementById("chatMessages");

  const bubble = document.createElement("div");

  const isSent = message.sender_id === usuarioLogado.id;

  bubble.classList.add("message-bubble");
  bubble.classList.add(isSent ? "sent" : "received");

  const data = new Date(message.created_at);

  bubble.innerHTML = `
    ${message.content}
    <span class="message-time">
      ${data.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </span>
  `;

  chatMessages.appendChild(bubble);
}

async function enviarMensagem() {
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");

  if (!conversaSelecionada) {
    alert("Selecione uma conversa.");
    return;
  }

  const content = messageInput.value.trim();

  if (!content) return;

  sendMessageBtn.disabled = true;
  sendMessageBtn.textContent = "Enviando...";

  const { error } = await supabaseClient
    .from("messages")
    .insert([
      {
        sender_id: usuarioLogado.id,
        receiver_id: conversaSelecionada.id,
        content: content
      }
    ]);

  sendMessageBtn.disabled = false;
  sendMessageBtn.textContent = "Enviar";

  if (error) {
    console.error("Erro ao enviar mensagem:", error.message);
    alert("Não foi possível enviar a mensagem.");
    return;
  }

  messageInput.value = "";

  await carregarMensagensDaConversa(conversaSelecionada.id);
  await carregarConversas();
}

async function abrirConversaPelaUrl() {
  const receiverId = obterReceiverDaUrl();

  if (!receiverId) return;

  if (receiverId === usuarioLogado.id) {
    return;
  }

  const { data: receiverProfile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", receiverId)
    .single();

  if (error || !receiverProfile) {
    console.error("Usuário da conversa não encontrado:", error?.message);
    return;
  }

  abrirConversa(receiverProfile);
}

function configurarEventos() {
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const messageInput = document.getElementById("messageInput");

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", enviarMensagem);
  }

  if (messageInput) {
    messageInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarMensagem();
      }
    });
  }
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

async function marcarMensagensComoLidas(usuarioId) {
  if (!usuarioId || !usuarioLogado) return;

  const { error } = await supabaseClient
    .from("messages")
    .update({
      is_read: true
    })
    .eq("sender_id", usuarioId)
    .eq("receiver_id", usuarioLogado.id)
    .eq("is_read", false);

  if (error) {
    console.error("Erro ao marcar mensagens como lidas:", error.message);
  }

  await carregarBadgeMensagens();
}

async function iniciarMessages() {
  await carregarUsuarioLogado();
  await carregarConversas();
  await abrirConversaPelaUrl();
  await carregarNotificacoes();
  await carregarBadgeMensagens();


  configurarEventos();
  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();
}

iniciarMessages();