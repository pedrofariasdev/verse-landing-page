console.log("community.js carregado!");

const communityParams = new URLSearchParams(window.location.search);
const communityId = communityParams.get("id");

let currentUser = null;
let isMember = false;
let currentCommunity = null;
let currentUserRole = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  await loadCommunity();

  setupJoinButton();
  setupCommunityMenu();

  setupTopicModal();
  setupTopicForm();

  setupEditCommunityModal();
  setupManageMembersModal();

  await loadTopics();
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
   CARREGAR COMUNIDADE
========================= */

async function loadCommunity() {
  if (!communityId) {
    console.error("Nenhum ID de comunidade encontrado na URL.");
    return;
  }

  const { data: community, error } = await supabaseClient
    .from("communities")
    .select("id, name, slug, description, avatar_url, banner_url, members_count, topics_count")
    .eq("id", communityId)
    .single();

  if (error) {
    console.error("Erro ao carregar comunidade:", error);
    return;
  }

  currentCommunity = community;

  renderCommunity(community);

  await checkUserMembership();

  setupOwnerActions();
  setupImageEditors();
}

function renderCommunity(community) {
  const nameEl = document.getElementById("communityName");
  const slugEl = document.getElementById("communitySlug");
  const descriptionEl = document.getElementById("communityDescription");
  const membersEl = document.getElementById("communityMembers");
  const topicsEl = document.getElementById("communityTopics");
  const avatarEl = document.getElementById("communityAvatar");
  const bannerEl = document.getElementById("communityBanner");

  if (nameEl) nameEl.textContent = community.name;

  if (slugEl) slugEl.textContent = `@${community.slug}`;

  if (descriptionEl) {
    descriptionEl.textContent =
      community.description || "Comunidade da Verse.";
  }

  if (membersEl) {
    membersEl.textContent =
      formatCount(community.members_count || 0, "membro", "membros");
  }

  if (topicsEl) {
    topicsEl.textContent =
      formatCount(community.topics_count || 0, "discussão", "discussões");
  }

  if (avatarEl) {
    const avatarButton = `
      <button
        id="changeAvatarBtn"
        class="community-image-edit"
        type="button"
        title="Alterar avatar">
        ✎
      </button>
    `;

    if (community.avatar_url) {
      avatarEl.innerHTML = `
        <img src="${community.avatar_url}" alt="${community.name}">
        ${avatarButton}
      `;
    } else {
      avatarEl.innerHTML = `
        ${community.name.charAt(0).toUpperCase()}
        ${avatarButton}
      `;
    }
  }

  if (bannerEl) {
    if (community.banner_url) {
      bannerEl.style.backgroundImage = `url("${community.banner_url}")`;
      bannerEl.style.backgroundSize = "cover";
      bannerEl.style.backgroundPosition = "center";
      bannerEl.style.backgroundRepeat = "no-repeat";
    } else {
      bannerEl.style.backgroundImage =
        "linear-gradient(135deg, #79B4A9, #D7F2BA)";
    }

    if (!document.getElementById("changeBannerBtn")) {
      bannerEl.insertAdjacentHTML(
        "beforeend",
        `
        <button
          id="changeBannerBtn"
          class="community-banner-edit"
          type="button">
          Alterar banner
        </button>
        `
      );
    }
  }

  document.title = `${community.name} | Verse`;
}

/* =========================
   PARTICIPAÇÃO
========================= */

async function checkUserMembership() {
  const joinBtn = document.getElementById("joinCommunityBtn");

  if (!joinBtn) return;

  if (!currentUser) {
    isMember = false;
    currentUserRole = null;

    setJoinButton(false);
    updateCommunityRoleBadge();

    return;
  }

  const { data: membership, error } = await supabaseClient
    .from("community_members")
    .select("id, role")
    .eq("community_id", communityId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar participação:", error);
    return;
  }

  isMember = !!membership;
  currentUserRole = membership?.role || null;

  setJoinButton(isMember);
  updateCommunityRoleBadge();
}

function setupJoinButton() {
  const joinBtn = document.getElementById("joinCommunityBtn");

  if (!joinBtn) return;

  joinBtn.onclick = async () => {
    if (isMember) return;

    await joinCommunity();
  };
}

async function joinCommunity() {
  const joinBtn = document.getElementById("joinCommunityBtn");

  if (!currentUser) {
    alert("Você precisa estar logado para participar.");
    return;
  }

  joinBtn.disabled = true;

  const { error } = await supabaseClient
    .from("community_members")
    .insert({
      community_id: communityId,
      user_id: currentUser.id,
      role: "member"
    });

  joinBtn.disabled = false;

  if (error) {
    if (error.code === "23505") {
      isMember = true;
      currentUserRole = "member";

      setJoinButton(true);
      updateCommunityRoleBadge();

      return;
    }

    console.error("Erro ao participar:", error);
    alert("Não foi possível participar da comunidade.");
    return;
  }

  isMember = true;
  currentUserRole = "member";

  setJoinButton(true);
  updateCommunityRoleBadge();
  updateMembersCount(1);
}

async function leaveCommunity() {
  const confirmLeave = confirm("Tem certeza que deseja deixar esta comunidade?");

  if (!confirmLeave) return;

  if (!currentUser) {
    alert("Você precisa estar logado.");
    return;
  }

  if (currentUserRole === "owner") {
    alert("O dono da comunidade não pode sair enquanto for o proprietário.");
    return;
  }

  const leaveBtn = document.getElementById("leaveCommunityBtn");

  if (leaveBtn) leaveBtn.disabled = true;

  const { error } = await supabaseClient
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", currentUser.id);

  if (leaveBtn) leaveBtn.disabled = false;

  if (error) {
    console.error("Erro ao sair da comunidade:", error);
    alert("Não foi possível sair da comunidade.");
    return;
  }

  isMember = false;
  currentUserRole = null;

  setJoinButton(false);
  updateCommunityRoleBadge();
  updateMembersCount(-1);
  setupOwnerActions();

  const menu = document.getElementById("communityMenu");
  menu?.classList.add("hidden");
}

function setJoinButton(memberStatus) {
  const joinBtn = document.getElementById("joinCommunityBtn");

  if (!joinBtn) return;

  if (memberStatus) {
    joinBtn.textContent = "Participando";
    joinBtn.classList.add("joined");
  } else {
    joinBtn.textContent = "Participar";
    joinBtn.classList.remove("joined");
  }
}

function updateMembersCount(change) {
  const membersEl = document.getElementById("communityMembers");

  if (!membersEl) return;

  const currentNumber = parseInt(membersEl.textContent, 10) || 0;
  const newNumber = Math.max(currentNumber + change, 0);

  membersEl.textContent = formatCount(newNumber, "membro", "membros");
}

/* =========================
   MENU DA COMUNIDADE
========================= */

function setupCommunityMenu() {
  const menuBtn = document.getElementById("communityMenuBtn");
  const menu = document.getElementById("communityMenu");
  const copyBtn = document.getElementById("copyCommunityLinkBtn");
  const inviteBtn = document.getElementById("inviteMembersBtn");
  const leaveBtn = document.getElementById("leaveCommunityBtn");

  if (!menuBtn || !menu) return;

  menuBtn.onclick = (event) => {
    event.stopPropagation();
    menu.classList.toggle("hidden");
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".community-menu-wrapper")) {
      menu.classList.add("hidden");
    }
  });

  copyBtn?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(window.location.href);
    menu.classList.add("hidden");
    alert("Link da comunidade copiado.");
  });

  inviteBtn?.addEventListener("click", () => {
    menu.classList.add("hidden");
    alert("Convite de membros será implementado em breve.");
  });

  leaveBtn?.addEventListener("click", leaveCommunity);
}

/* =========================
   AÇÕES DO DONO
========================= */

function setupOwnerActions() {
  const editBtn = document.getElementById("editCommunityBtn");
  const manageMembersBtn = document.getElementById("manageMembersBtn");
  const deleteCommunityBtn = document.getElementById("deleteCommunityBtn");
  const leaveBtn = document.getElementById("leaveCommunityBtn");

  const isOwner = currentUserRole === "owner";

  updateCommunityRoleBadge();

  if (editBtn) {
    editBtn.classList.toggle("hidden", !isOwner);

    editBtn.onclick = () => {
      if (!isOwner) return;
      openEditCommunityModal();
    };
  }

  if (manageMembersBtn) {
    manageMembersBtn.classList.toggle("hidden", !isOwner);

    manageMembersBtn.onclick = async () => {
      if (!isOwner) return;
      await openManageMembersModal();
    };
  }

  if (deleteCommunityBtn) {
    deleteCommunityBtn.classList.toggle("hidden", !isOwner);

    deleteCommunityBtn.onclick = async () => {
      if (!isOwner) return;
      await deleteCommunity();
    };
  }

  if (leaveBtn) {
    leaveBtn.classList.toggle("hidden", isOwner);
  }
}

function setupImageEditors() {
  const avatarBtn = document.getElementById("changeAvatarBtn");
  const bannerBtn = document.getElementById("changeBannerBtn");

  const canEditCommunity = currentUserRole === "owner";

  if (avatarBtn) {
    avatarBtn.style.display = canEditCommunity ? "flex" : "none";

    avatarBtn.onclick = (event) => {
      event.stopPropagation();

      if (!canEditCommunity) return;

      openEditCommunityModal();
    };
  }

  if (bannerBtn) {
    bannerBtn.style.display = canEditCommunity ? "block" : "none";

    bannerBtn.onclick = (event) => {
      event.stopPropagation();

      if (!canEditCommunity) return;

      openEditCommunityModal();
    };
  }
}

/* =========================
   EDITAR COMUNIDADE
========================= */

function openEditCommunityModal() {
  const modal = document.getElementById("editCommunityModal");

  if (!modal || !currentCommunity) return;

  document.getElementById("editCommunityName").value =
    currentCommunity.name || "";

  document.getElementById("editCommunityDescription").value =
    currentCommunity.description || "";

  document.getElementById("editCommunityAvatar").value =
    currentCommunity.avatar_url || "";

  document.getElementById("editCommunityBanner").value =
    currentCommunity.banner_url || "";

  modal.classList.remove("hidden");
}

function setupEditCommunityModal() {
  const modal = document.getElementById("editCommunityModal");
  const closeBtn = document.getElementById("closeEditCommunityModal");
  const cancelBtn = document.getElementById("cancelEditCommunity");
  const form = document.getElementById("editCommunityForm");

  if (!modal || !form) return;

  closeBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  cancelBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.add("hidden");
    }
  });

  form.onsubmit = async (event) => {
    event.preventDefault();

    await updateCommunity();
  };
}

async function updateCommunity() {
  if (currentUserRole !== "owner") {
    alert("Apenas o dono pode editar esta comunidade.");
    return;
  }

  const name = document.getElementById("editCommunityName").value.trim();
  const description = document.getElementById("editCommunityDescription").value.trim();
  const avatar_url = document.getElementById("editCommunityAvatar").value.trim();
  const banner_url = document.getElementById("editCommunityBanner").value.trim();

  if (!name || !description) {
    alert("Nome e descrição são obrigatórios.");
    return;
  }

  const { error } = await supabaseClient
    .from("communities")
    .update({
      name,
      description,
      avatar_url: avatar_url || null,
      banner_url: banner_url || null
    })
    .eq("id", communityId);

  if (error) {
    console.error("Erro ao atualizar comunidade:", error);
    alert("Não foi possível atualizar a comunidade.");
    return;
  }

  document.getElementById("editCommunityModal").classList.add("hidden");

  await loadCommunity();
}

/* =========================
   MODAL NOVA DISCUSSÃO
========================= */

function setupTopicModal() {
  const modal = document.getElementById("newTopicModal");

  const openBtn = document.getElementById("newTopicBtn");
  const closeBtn = document.getElementById("closeTopicModalBtn");
  const cancelBtn = document.getElementById("cancelTopicBtn");

  if (!modal) return;

  openBtn?.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  closeBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  cancelBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

/* =========================
   CRIAR DISCUSSÃO
========================= */

function setupTopicForm() {
  const form = document.getElementById("newTopicForm");

  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();

    await createTopic();
  };
}

async function createTopic() {
  if (!currentUser) {
    alert("Você precisa estar logado.");
    return;
  }

  const titleInput = document.getElementById("topicTitle");
  const contentInput = document.getElementById("topicContent");

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    alert("Preencha todos os campos.");
    return;
  }

  const { error } = await supabaseClient
    .from("community_topics")
    .insert({
      community_id: communityId,
      author_id: currentUser.id,
      title,
      content
    });

  if (error) {
    console.error("Erro ao criar discussão:", error);
    alert("Não foi possível criar a discussão.");
    return;
  }

  document.getElementById("newTopicModal").classList.add("hidden");
  document.getElementById("newTopicForm").reset();

  await loadTopics();
  updateTopicsCount(1);
}

/* =========================
   LISTAR DISCUSSÕES
========================= */

async function loadTopics() {
  const container = document.getElementById("topicsContainer");

  if (!container) return;

  const { data: topics, error } = await supabaseClient
    .from("community_topics")
    .select(`
    id,
    title,
    replies_count,
    views_count,
    is_pinned,
    created_at,
      profiles:author_id (
        username,
        full_name
      )
    `)
    .eq("community_id", communityId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar tópicos:", error);
    return;
  }

  if (!topics || topics.length === 0) {
    container.innerHTML = `
      <div class="empty-topics">
        <h3>Nenhuma discussão ainda</h3>
        <p>Seja o primeiro a iniciar uma conversa nesta comunidade.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = topics.map((topic) => {
    const authorName =
      topic.profiles?.full_name ||
      topic.profiles?.username ||
      "Usuário";

      const canModerate =
        currentUserRole === "owner" ||
        currentUserRole === "moderator";

    return `
        <article
          class="topic-card"
          data-topic-id="${topic.id}"
          data-pinned="${topic.is_pinned}"
        >
        <div class="topic-card-top">
          <h3 class="topic-title">
            ${topic.is_pinned ? "📌 " : ""}${topic.title}
          </h3>

          ${
            canModerate
              ? `
                <div class="topic-admin-actions">
                  <button class="pin-topic-btn" data-topic-id="${topic.id}">
                    ${topic.is_pinned ? "Desfixar" : "Fixar"}
                  </button>

                  <button class="delete-topic-btn" data-topic-id="${topic.id}">
                    Excluir
                  </button>
                </div>
              `
              : ""
          }
        </div>

        <div class="topic-meta">
          <span>Por ${authorName}</span>
          <span>💬 ${topic.replies_count || 0} respostas</span>
          <span>👁️ ${topic.views_count || 0} visualizações</span>
        </div>
      </article>
    `;

  }).join("");

  setupTopicCards();
}

function setupTopicCards() {
  document.querySelectorAll(".topic-card").forEach((card) => {
    card.onclick = () => {
      const topicId = card.dataset.topicId;

      if (!topicId) return;

      window.location.href = `community-topic.html?id=${topicId}`;
    };
  });

  document.querySelectorAll(".pin-topic-btn").forEach((button) => {
    button.onclick = async (event) => {
      event.stopPropagation();

      const topicId = button.dataset.topicId;

      await toggleTopicPin(topicId);
    };
  });

  document.querySelectorAll(".delete-topic-btn").forEach((button) => {
    button.onclick = async (event) => {
      event.stopPropagation();

      const topicId = button.dataset.topicId;

      await deleteTopic(topicId);
    };
  });
}

function updateTopicsCount(change) {
  const topicsEl = document.getElementById("communityTopics");

  if (!topicsEl) return;

  const currentNumber = parseInt(topicsEl.textContent, 10) || 0;
  const newNumber = Math.max(currentNumber + change, 0);

  topicsEl.textContent = formatCount(newNumber, "discussão", "discussões");
}

/* =========================
   GERENCIAR MEMBROS
========================= */

function setupManageMembersModal() {
  const modal = document.getElementById("manageMembersModal");
  const closeBtn = document.getElementById("closeManageMembersModal");

  if (!modal) return;

  closeBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

async function openManageMembersModal() {
  const modal = document.getElementById("manageMembersModal");

  if (!modal) return;

  if (currentUserRole !== "owner") {
    alert("Apenas o dono pode gerenciar membros.");
    return;
  }

  modal.classList.remove("hidden");

  await loadCommunityMembers();
}

async function loadCommunityMembers() {
  const membersList = document.getElementById("membersList");

  if (!membersList) return;

  membersList.innerHTML = `<p class="members-empty">Carregando membros...</p>`;

  const { data: members, error } = await supabaseClient
    .from("community_members")
    .select(`
      id,
      user_id,
      role,
      joined_at,
      profiles:user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar membros:", error);

    membersList.innerHTML = `
      <p class="members-empty">
        Não foi possível carregar os membros.
      </p>
    `;
    return;
  }

  if (!members || members.length === 0) {
    membersList.innerHTML = `
      <p class="members-empty">
        Nenhum membro encontrado.
      </p>
    `;
    return;
  }

  membersList.innerHTML = members.map((member) => {
    const profile = member.profiles;

    const name =
      profile?.full_name ||
      profile?.username ||
      "Usuário";

    const username =
      profile?.username ||
      "usuario";

    const firstLetter = name.charAt(0).toUpperCase();

    const avatar = profile?.avatar_url
      ? `<img src="${profile.avatar_url}" alt="${name}">`
      : firstLetter;

    const isOwnerMember = member.role === "owner";
    const roleLabel = getRoleLabel(member.role);

    return `
      <article class="member-row" data-user-id="${member.user_id}">
        <div class="member-info">
          <div class="member-avatar">
            ${avatar}
          </div>

          <div class="member-text">
            <strong>${name}</strong>
            <span>@${username}</span>
          </div>
        </div>

        <div class="member-role-area">
          ${
            isOwnerMember
              ? `
                <span class="member-role-badge owner">
                  ${roleLabel}
                </span>
              `
              : `
                <select
                  class="member-role-select"
                  data-user-id="${member.user_id}"
                >
                  <option value="member" ${member.role === "member" ? "selected" : ""}>
                    Membro
                  </option>

                  <option value="moderator" ${member.role === "moderator" ? "selected" : ""}>
                    Moderador
                  </option>
                </select>
              `
          }
        </div>
      </article>
    `;
  }).join("");

  setupRoleSelects();
}

function setupRoleSelects() {
  document.querySelectorAll(".member-role-select").forEach((select) => {
    select.onchange = async () => {
      const userId = select.dataset.userId;
      const newRole = select.value;

      await updateMemberRole(userId, newRole);
    };
  });
}

async function updateMemberRole(userId, newRole) {
  if (currentUserRole !== "owner") {
    alert("Apenas o dono pode alterar cargos.");
    return;
  }

  if (!["member", "moderator"].includes(newRole)) {
    alert("Cargo inválido.");
    return;
  }

  const { error } = await supabaseClient.rpc("update_community_member_role", {
    target_community_id: communityId,
    target_user_id: userId,
    new_role: newRole
  });

  if (error) {
    console.error("Erro ao atualizar cargo:", error);
    alert("Não foi possível atualizar o cargo.");

    await loadCommunityMembers();
    return;
  }

  await loadCommunityMembers();
}

function getRoleLabel(role) {
  const labels = {
    owner: "Dono",
    moderator: "Moderador",
    member: "Membro"
  };

  return labels[role] || "Membro";
}

/* =========================
   EXCLUIR COMUNIDADE
========================= */

async function deleteCommunity() {
  if (currentUserRole !== "owner") {
    alert("Apenas o dono pode excluir esta comunidade.");
    return;
  }

  const confirmDelete = confirm(
    "Tem certeza que deseja excluir esta comunidade? Esta ação não pode ser desfeita."
  );

  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("communities")
    .delete()
    .eq("id", communityId);

  if (error) {
    console.error("Erro ao excluir comunidade:", error);
    alert("Não foi possível excluir a comunidade.");
    return;
  }

  alert("Comunidade excluída com sucesso.");
  window.location.href = "../html/communities.html";
}

/* =========================
   BADGE DE CARGO
========================= */

function updateCommunityRoleBadge() {
  const badge = document.getElementById("communityRoleBadge");

  if (!badge) return;

  badge.classList.remove("owner", "moderator", "member", "hidden");

  if (!currentUserRole) {
    badge.classList.add("hidden");
    badge.textContent = "";
    return;
  }

  if (currentUserRole === "owner") {
    badge.textContent = "Dono da comunidade";
    badge.classList.add("owner");
    return;
  }

  if (currentUserRole === "moderator") {
    badge.textContent = "Moderador";
    badge.classList.add("moderator");
    return;
  }

  badge.textContent = "Membro";
  badge.classList.add("member");
}

async function toggleTopicPin(topicId) {
  const canModerate =
    currentUserRole === "owner" ||
    currentUserRole === "moderator";

  if (!canModerate) {
    alert("Você não tem permissão para fixar discussões.");
    return;
  }

  const { error } = await supabaseClient.rpc("toggle_topic_pin", {
    target_topic_id: topicId
  });

  if (error) {
    console.error("Erro ao fixar/desfixar discussão:", error);
    alert("Não foi possível alterar a discussão.");
    return;
  }

  await loadTopics();
}

async function deleteTopic(topicId) {
  const canModerate =
    currentUserRole === "owner" ||
    currentUserRole === "moderator";

  if (!canModerate) {
    alert("Você não tem permissão para excluir discussões.");
    return;
  }

  const confirmDelete = confirm("Tem certeza que deseja excluir esta discussão?");

  if (!confirmDelete) return;

  const { error } = await supabaseClient.rpc("delete_community_topic", {
    target_topic_id: topicId
  });

  if (error) {
    console.error("Erro ao excluir discussão:", error);
    alert("Não foi possível excluir a discussão.");
    return;
  }

  updateTopicsCount(-1);
  await loadTopics();
}

/* =========================
   UTILS
========================= */

function formatCount(number, singular, plural) {
  return number === 1 ? `1 ${singular}` : `${number} ${plural}`;
}