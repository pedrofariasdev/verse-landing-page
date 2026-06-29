console.log("community-topic.js carregado!");

const topicParams = new URLSearchParams(window.location.search);
const topicId = topicParams.get("id");

let currentUser = null;
let currentTopic = null;
let currentCommunity = null;
let currentUserRole = null;
let allCommunityMembers = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  await loadTopic();
  await loadReplies();

  setupBackButtons();
  setupReplyForm();
  setupReplyLikeButtons();
});

/* =========================
   USUÁRIO
========================= */

async function loadCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Erro ao buscar usuário:", error);
    return;
  }

  currentUser = data.user;
}

/* =========================
   CARREGAR TÓPICO
========================= */

async function loadTopic() {
  if (!topicId) {
    console.error("Nenhum ID de tópico encontrado na URL.");
    return;
  }

  const { data: topic, error } = await supabaseClient
    .from("community_topics")
    .select(`
          id,
          community_id,
          author_id,
          title,
          content,
          replies_count,
          views_count,
          likes_count,
          created_at
        `)
    .eq("id", topicId)
    .single();

  if (error) {
    console.error("Erro ao carregar tópico:", error);
    return;
  }

  currentTopic = topic;

  const { data: community, error: communityError } = await supabaseClient
    .from("communities")
    .select("id, name, slug, description")
    .eq("id", topic.community_id)
    .single();

  if (communityError) {
    console.error("Erro ao carregar comunidade do tópico:", communityError);
  }

  const { data: author, error: authorError } = await supabaseClient
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", topic.author_id)
    .single();

  if (authorError) {
    console.error("Erro ao carregar autor do tópico:", authorError);
  }

  currentCommunity = community || null;

  await loadCurrentUserRole();

  currentTopic.communities = community || null;

  await loadCommunityMembersRoles();

  currentTopic.profiles = author || null;

  renderTopic(currentTopic);

  await incrementTopicViews(currentTopic.id, currentTopic.views_count || 0);
}

/* =========================
   RENDERIZAR TÓPICO
========================= */

async function loadCurrentUserRole() {
  if (!currentUser || !currentCommunity?.id) {
    currentUserRole = null;
    return;
  }

  const { data: membership, error } = await supabaseClient
    .from("community_members")
    .select("role")
    .eq("community_id", currentCommunity.id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar cargo do usuário:", error);
    currentUserRole = null;
    return;
  }

  currentUserRole = membership?.role || null;
}

function renderTopic(topic) {
  const authorName =
    topic.profiles?.full_name ||
    topic.profiles?.username ||
    "Usuário";

  const communityName =
    topic.communities?.name ||
    "Comunidade";

  const topicCommunityEl = document.getElementById("topicCommunityName");
  const topicTitleEl = document.getElementById("topicTitle");
  const topicAuthorEl = document.getElementById("topicAuthor");
  const topicDateEl = document.getElementById("topicDate");
  const topicViewsEl = document.getElementById("topicViews");
  const topicContentEl = document.getElementById("topicContent");
  const repliesCountEl = document.getElementById("repliesCount");

  if (topicCommunityEl) {
    topicCommunityEl.textContent = communityName;
  }

  if (topicTitleEl) {
    topicTitleEl.textContent = topic.title;
  }

  if (topicAuthorEl) {
    topicAuthorEl.textContent = `Por ${authorName}`;
  }

  if (topicDateEl) {
    topicDateEl.textContent = formatDate(topic.created_at);
  }

  if (topicViewsEl) {
    topicViewsEl.textContent =
      formatCount(topic.views_count || 0, "visualização", "visualizações");
  }

  if (topicContentEl) {
    topicContentEl.textContent = topic.content;
  }

  const topicLikeArea = document.getElementById("topicLikeArea");

  if (topicLikeArea) {
    topicLikeArea.innerHTML = `
      <button
        id="topicLikeBtn"
        class="topic-like-btn"
        type="button">
        ♡ ${topic.likes_count || 0} curtidas
      </button>
    `;

    setupTopicLikeButton();
  }

  if (repliesCountEl) {
    repliesCountEl.textContent =
      formatCount(topic.replies_count || 0, "resposta", "respostas");
  }

  document.title = `${topic.title} | Verse`;
}

/* =========================
   VISUALIZAÇÕES
========================= */

async function incrementTopicViews(topicId, currentViews) {
  const { error } = await supabaseClient.rpc("increment_topic_views", {
    topic_id: topicId
  });

  if (error) {
    console.error("Erro ao atualizar visualizações:", error);
    return;
  }

  const newViews = Number(currentViews || 0) + 1;

  const viewsEl = document.getElementById("topicViews");

  if (viewsEl) {
    viewsEl.textContent =
      formatCount(newViews, "visualização", "visualizações");
  }

  if (currentTopic) {
    currentTopic.views_count = newViews;
  }
}

function setupReplyLikeButtons() {
  document.querySelectorAll(".reply-like-btn").forEach((button) => {
    button.onclick = async () => {
      const replyId = button.dataset.replyId;

      await toggleReplyLike(replyId);
    };
  });
}

async function toggleReplyLike(replyId) {
  if (!currentUser) {
    alert("Você precisa estar logado.");
    return;
  }

  const { error } = await supabaseClient.rpc("toggle_reply_like", {
    target_reply_id: replyId
  });

  if (error) {
    console.error("Erro ao curtir:", error);
    alert("Não foi possível curtir esta resposta.");
    return;
  }

  await createReplyLikeNotification(replyId);

  await loadReplies();
}

async function createReplyLikeNotification(replyId) {
  const { data: reply, error } = await supabaseClient
    .from("community_replies")
    .select(`
      id,
      author_id,
      content
    `)
    .eq("id", replyId)
    .single();

  if (error || !reply) {
    console.error("Erro ao buscar resposta para notificação:", error);
    return;
  }

  if (reply.author_id === currentUser.id) {
    return;
  }

  const senderName =
    currentUser.user_metadata?.full_name ||
    currentUser.email ||
    "Alguém";

  const { error: notificationError } = await supabaseClient
    .from("notifications")
    .insert({
      user_id: reply.author_id,
      sender_id: currentUser.id,
      type: "reply_like",
      message: `${senderName} curtiu sua resposta.`,
      link: `/html/community-topic.html?id=${topicId}`,
      is_read: false
    });

  if (notificationError) {
    console.error("Erro ao criar notificação de curtida:", notificationError);
  }
}

/* =========================
   BOTÕES DE VOLTAR
========================= */

function setupBackButtons() {
  const backBtn = document.getElementById("backToCommunityBtn");

  backBtn?.addEventListener("click", () => {
    if (!currentCommunity?.id) {
      window.location.href = "../html/communities.html";
      return;
    }

    window.location.href =
      `../html/community.html?id=${currentCommunity.id}`;
  });
}

/* =========================
   CARREGAR RESPOSTAS
========================= */

async function loadReplies() {
  const container = document.getElementById("repliesContainer");

  if (!container) return;

  const { data: replies, error } = await supabaseClient
    .from("community_replies")
    .select(`
      id,
      content,
      likes_count,
      created_at,
      profiles:author_id (
        id,
        full_name,
        username,
        avatar_url
      ),
      community_reply_likes (
        user_id
      )
    `)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar respostas:", error);
    return;
  }

  if (!replies || replies.length === 0) {
    container.innerHTML = `
      <div class="empty-replies">
        <h3>Nenhuma resposta ainda</h3>
        <p>Seja o primeiro a responder esta discussão.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = replies.map((reply) => {
    const authorName =
      reply.profiles?.full_name ||
      reply.profiles?.username ||
      "Usuário";

    const username =
      reply.profiles?.username ||
      "usuario";

    const authorRole = getReplyAuthorRole(
      reply.profiles?.id
    );

    const roleIcon = getRoleIcon(authorRole);

    const firstLetter = authorName.charAt(0).toUpperCase();

    const avatar = reply.profiles?.avatar_url
      ? `<img src="${reply.profiles.avatar_url}" alt="${authorName}">`
      : firstLetter;

    const canModerate =
      currentUserRole === "owner" ||
      currentUserRole === "moderator";

    const isLiked =
      reply.community_reply_likes?.some(
        (like) => like.user_id === currentUser?.id
      ) || false;

    return `
      <article class="reply-card">
        <div class="reply-author">

          <div class="reply-avatar">
            ${avatar}
          </div>

          <div class="reply-author-info">
            <strong>
              ${authorName} ${roleIcon}
            </strong>

            <span class="reply-username">
              @${username}
            </span>

            <span>
              ${formatDate(reply.created_at)}
            </span>
          </div>

        </div>

        <div class="reply-content">
          ${escapeHtml(reply.content)}
        </div>

        <div class="reply-footer">
          <button
            class="reply-like-btn ${isLiked ? "liked" : ""}"
            data-reply-id="${reply.id}">
            ${isLiked ? "♥" : "♡"} ${reply.likes_count || 0}
          </button>
        </div>

        ${
          canModerate
            ? `
              <div class="reply-actions">
                <button
                  class="delete-reply-btn"
                  data-reply-id="${reply.id}">
                  Excluir resposta
                </button>
              </div>
            `
            : ""
        }

      </article>
    `;
  }).join("");

  setupReplyModerationButtons();
  setupReplyLikeButtons();
}

/* =========================
   RESPONDER TÓPICO
========================= */

function setupReplyForm() {
  const form = document.getElementById("replyForm");

  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();

    await createReply();
  };
}

async function createReply() {
  if (!currentUser) {
    alert("Você precisa estar logado para responder.");
    return;
  }

  const replyInput = document.getElementById("replyContent");
  const content = replyInput.value.trim();

  if (!content) {
    alert("Escreva uma resposta.");
    return;
  }

  const { error } = await supabaseClient
    .from("community_replies")
    .insert({
      topic_id: topicId,
      author_id: currentUser.id,
      content
    });

    await createReplyNotification();

  if (error) {
    console.error("Erro ao criar resposta:", error);
    alert("Não foi possível publicar a resposta.");
    return;
  }

  replyInput.value = "";

  updateRepliesCount(1);
  await loadReplies();
}

/* =========================
   CONTADOR DE RESPOSTAS
========================= */

function updateRepliesCount(change) {
  const repliesEl = document.getElementById("repliesCount");

  if (!repliesEl) return;

  const currentNumber = parseInt(repliesEl.textContent, 10) || 0;
  const newNumber = Math.max(currentNumber + change, 0);

  repliesEl.textContent = formatCount(newNumber, "resposta", "respostas");
}

function setupReplyModerationButtons() {
  document.querySelectorAll(".delete-reply-btn").forEach((button) => {
    button.onclick = async () => {
      const replyId = button.dataset.replyId;

      await deleteReply(replyId);
    };
  });
}

async function deleteReply(replyId) {
  const canModerate =
    currentUserRole === "owner" ||
    currentUserRole === "moderator";

  if (!canModerate) {
    alert("Você não tem permissão para excluir respostas.");
    return;
  }

  const confirmDelete = confirm("Tem certeza que deseja excluir esta resposta?");

  if (!confirmDelete) return;

  const { error } = await supabaseClient.rpc("delete_community_reply", {
    target_reply_id: replyId
  });

  if (error) {
    console.error("Erro ao excluir resposta:", error);
    alert("Não foi possível excluir a resposta.");
    return;
  }

  updateRepliesCount(-1);
  await loadReplies();
}

async function createReplyNotification() {
  if (!currentTopic) return;

  // não notificar a si mesmo
  if (currentTopic.author_id === currentUser.id) {
    return;
  }

  const { error } = await supabaseClient
    .from("notifications")
    .insert({
      user_id: currentTopic.author_id,
      sender_id: currentUser.id,

      type: "topic_reply",

      message: `${currentUser.user_metadata?.full_name || "Alguém"} respondeu sua discussão "${currentTopic.title}"`,

      link: `/html/community-topic.html?id=${currentTopic.id}`,

      is_read: false
    });

  if (error) {
    console.error("Erro ao criar notificação:", error);
  }
}

function setupTopicLikeButton() {
  const likeBtn = document.getElementById("topicLikeBtn");

  if (!likeBtn) return;

  likeBtn.onclick = async () => {
    await toggleTopicLike();
  };
}

async function toggleTopicLike() {
  if (!currentUser) {
    alert("Você precisa estar logado para curtir.");
    return;
  }

  if (!currentTopic?.id) return;

  const { data, error } = await supabaseClient.rpc("toggle_topic_like", {
    target_topic_id: currentTopic.id
  });

  if (error) {
    console.error("Erro ao curtir tópico:", error);
    alert("Não foi possível curtir esta discussão.");
    return;
  }

  const newCount = data ?? 0;

  currentTopic.likes_count = newCount;

  const likeBtn = document.getElementById("topicLikeBtn");

  if (likeBtn) {
    likeBtn.textContent = `♡ ${newCount} curtidas`;
  }
}

function getReplyAuthorRole(authorId) {
  if (!authorId) return "member";

  const member = allCommunityMembers.find(
    member => member.user_id === authorId
  );

  return member?.role || "member";
}


async function loadCommunityMembersRoles() {
  if (!currentTopic?.community_id) return;

  const { data, error } = await supabaseClient
    .from("community_members")
    .select(`
      user_id,
      role
    `)
    .eq("community_id", currentTopic.community_id);

  if (error) {
    console.error(
      "Erro ao carregar cargos:",
      error
    );
    return;
  }

  allCommunityMembers = data || [];
}

function getRoleIcon(role) {
  switch (role) {
    case "owner":
      return "👑";

    case "moderator":
      return "🛡️";

    case "member":
      return "👤";

    default:
      return "";
  }
}

/* =========================
   UTILS
========================= */

function formatCount(number, singular, plural) {
  return number === 1 ? `1 ${singular}` : `${number} ${plural}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}