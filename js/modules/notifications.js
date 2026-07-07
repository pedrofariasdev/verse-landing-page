async function carregarNotificacoes() {
  const notificationList = document.getElementById("notificationList");
  const notificationBadge = document.getElementById("notificationBadge");

  if (!notificationList || !notificationBadge) return;

  const { data: authData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !authData.user) return;

  const userId = authData.user.id;

  await carregarBadgeMensagens();

  const { data: notifications, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
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

  if (!notificationBtn || !notificationDropdown) {
    console.warn("Notificações não encontradas.");
    return;
  }

  notificationBtn.onclick = function (event) {
    event.preventDefault();
    event.stopPropagation();

    notificationDropdown.classList.toggle("show");

    const profileDropdown =
      document.getElementById("profileDropdown");

    if (profileDropdown) {
      profileDropdown.classList.remove("show");
    }

    carregarNotificacoes();
  };

  notificationDropdown.onclick = function (event) {
    event.stopPropagation();
  };

  document.addEventListener("click", function () {
    notificationDropdown.classList.remove("show");
  });
}

async function criarNotificacao(userId, senderId, type, message, link = null) {
  if (!userId || !senderId || !type || !message) {
    return;
  }

  if (userId === senderId) {
    return;
  }

  const { error } = await supabaseClient
    .from("notifications")
    .insert([
      {
        user_id: userId,
        sender_id: senderId,
        type: type,
        message: message,
        link: link,
        is_read: false
      }
    ]);

  if (error) {
    console.error("Erro ao criar notificação:", error.message);
  }
}

async function carregarBadgeMensagens() {
  const sidebarBadge = document.getElementById("sidebarMessagesBadge");
  const dropdownBadge = document.getElementById("dropdownMessagesBadge");

  const { data: authData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !authData.user) return;

  const userId = authData.user.id;

  const { count, error } = await supabaseClient
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Erro ao carregar badge de mensagens:", error.message);
    return;
  }

  const unreadCount = count || 0;

  [sidebarBadge, dropdownBadge].forEach((badge) => {
    if (!badge) return;

    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.add("show");
    } else {
      badge.textContent = "";
      badge.classList.remove("show");
    }
  });
}