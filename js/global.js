console.log("Global.js carregado!");

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

async function carregarBadgeMensagens() {
  const sidebarBadge = document.getElementById("sidebarMessagesBadge");
  const dropdownBadge = document.getElementById("dropdownMessagesBadge");

  if (!usuarioLogado) return;

  const { count, error } = await supabaseClient
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", usuarioLogado.id)
    .eq("is_read", false);

  if (error) {
    console.error("Erro ao carregar badge de mensagens:", error.message);
    return;
  }

  const temMensagem = count && count > 0;

  if (sidebarBadge) {
    sidebarBadge.style.display = temMensagem ? "block" : "none";
  }

  if (dropdownBadge) {
    dropdownBadge.style.display = temMensagem ? "block" : "none";
  }
}

