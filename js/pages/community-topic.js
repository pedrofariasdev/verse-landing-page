console.log("community-topic.js carregado!");

const topicParams = new URLSearchParams(window.location.search);
const topicId = topicParams.get("id");

let currentUser = null;
let currentTopic = null;
let currentCommunity = null;


document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  await loadTopic();
  await loadReplies();

  setupBackButtons();
  setupReplyForm();
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

  currentTopic.communities = community || null;
  currentTopic.profiles = author || null;

  renderTopic(currentTopic);

  await incrementTopicViews(currentTopic.id, currentTopic.views_count || 0);
}

/* =========================
   RENDERIZAR TÓPICO
========================= */

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
      created_at,
      profiles:author_id (
        id,
        full_name,
        username,
        avatar_url
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

    const firstLetter = authorName.charAt(0).toUpperCase();

    const avatar = reply.profiles?.avatar_url
      ? `<img src="${reply.profiles.avatar_url}" alt="${authorName}">`
      : firstLetter;

    return `
      <article class="reply-card">
        <div class="reply-author">

          <div class="reply-avatar">
            ${avatar}
          </div>

          <div class="reply-author-info">
            <strong>${authorName}</strong>

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
      </article>
    `;
  }).join("");
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