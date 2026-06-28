async function loadCommunities() {
  const grid = document.getElementById("communitiesGrid");

  if (!grid) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { data: communities, error } = await supabaseClient
    .from("communities")
    .select("id, name, slug, description, avatar_url, members_count, topics_count")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comunidades:", error);
    grid.innerHTML = `<p class="empty-text">Não foi possível carregar as comunidades.</p>`;
    return;
  }

  if (!communities || communities.length === 0) {
    grid.innerHTML = `<p class="empty-text">Nenhuma comunidade encontrada.</p>`;
    return;
  }

  let joinedCommunityIds = [];

  if (user) {
    const { data: memberships } = await supabaseClient
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id);

    joinedCommunityIds = memberships?.map((item) => item.community_id) || [];
  }

  grid.innerHTML = communities.map((community) => {
    const firstLetter = community.name.charAt(0).toUpperCase();

    const avatar = community.avatar_url
      ? `<img src="${community.avatar_url}" alt="${community.name}">`
      : firstLetter;

    const isJoined = joinedCommunityIds.includes(community.id);

    return `
      <article class="community-card" data-community-id="${community.id}">
        <div class="community-card-header">
          <div class="community-avatar">${avatar}</div>

          <div class="community-info">
            <h2>${community.name}</h2>
            <span>@${community.slug}</span>
          </div>
        </div>

        <p class="community-description">
          ${community.description || "Comunidade da Verse."}
        </p>

        <div class="community-stats">
          <span class="community-members-count">
            ${formatCount(community.members_count || 0, "membro", "membros")}
          </span>

          <span>
            ${formatCount(community.topics_count || 0, "tópico", "tópicos")}
          </span>
        </div>

        <button
          class="community-button join-community-btn ${isJoined ? "joined" : ""}"
          data-community-id="${community.id}"
          type="button"
        >
          ${isJoined ? "Participando" : "Participar"}
        </button>
      </article>
    `;
  }).join("");

  setupCommunityCards();
  setupJoinButtons();
}

function setupCommunityCards() {
  document.querySelectorAll(".community-card").forEach((card) => {
    card.addEventListener("click", () => {
      const communityId = card.dataset.communityId;

      if (!communityId) return;

      window.location.href = `../html/community.html?id=${communityId}`;
    });
  });
}

function setupJoinButtons() {
  document.querySelectorAll(".join-community-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();

      if (button.classList.contains("joined")) return;

      const communityId = button.dataset.communityId;
      const card = button.closest(".community-card");

      await joinCommunity(communityId, button, card);
    });
  });
}

async function joinCommunity(communityId, button, card) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    alert("Você precisa estar logado para participar de uma comunidade.");
    return;
  }

  button.disabled = true;

  const { error } = await supabaseClient
    .from("community_members")
    .insert({
      community_id: communityId,
      user_id: user.id,
      role: "member"
    });

  button.disabled = false;

  if (error) {
    if (error.code === "23505") {
      button.textContent = "Participando";
      button.classList.add("joined");
      return;
    }

    console.error("Erro ao entrar na comunidade:", error);
    alert("Não foi possível entrar na comunidade.");
    return;
  }

  button.textContent = "Participando";
  button.classList.add("joined");

  updateCardMembersCount(card, 1);
}

/* =========================
   CRIAR COMUNIDADE
========================= */

function setupCreateCommunityModal() {
  const modal = document.getElementById("createCommunityModal");
  const openBtn = document.getElementById("openCreateCommunityModal");
  const closeBtn = document.getElementById("closeCreateCommunityModal");
  const cancelBtn = document.getElementById("cancelCreateCommunity");

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => {
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

function setupSlugGenerator() {
  const nameInput = document.getElementById("communityNameInput");
  const slugInput = document.getElementById("communitySlugInput");

  if (!nameInput || !slugInput) return;

  nameInput.addEventListener("input", () => {
    slugInput.value = generateSlug(nameInput.value);
  });

  slugInput.addEventListener("input", () => {
    slugInput.value = generateSlug(slugInput.value);
  });
}

function setupCreateCommunityForm() {
  const form = document.getElementById("createCommunityForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    await createCommunity();
  });
}

async function createCommunity() {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    alert("Você precisa estar logado para criar uma comunidade.");
    return;
  }

  const nameInput = document.getElementById("communityNameInput");
  const slugInput = document.getElementById("communitySlugInput");
  const descriptionInput = document.getElementById("communityDescriptionInput");

  const name = nameInput.value.trim();
  const slug = generateSlug(slugInput.value.trim());
  const description = descriptionInput.value.trim();

  if (!name || !slug || !description) {
    alert("Preencha todos os campos.");
    return;
  }

  const { data: community, error } = await supabaseClient
    .from("communities")
    .insert({
      name,
      slug,
      description,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      alert("Já existe uma comunidade com esse slug.");
      return;
    }

    console.error("Erro ao criar comunidade:", error);
    alert("Não foi possível criar a comunidade.");
    return;
  }

  await supabaseClient
    .from("community_members")
    .insert({
      community_id: community.id,
      user_id: user.id,
      role: "owner"
    });

  window.location.href = `../html/community.html?id=${community.id}`;
}

/* =========================
   UTILS
========================= */

function updateCardMembersCount(card, change) {
  if (!card) return;

  const membersEl = card.querySelector(".community-members-count");

  if (!membersEl) return;

  const currentNumber = parseInt(membersEl.textContent, 10) || 0;
  const newNumber = Math.max(currentNumber + change, 0);

  membersEl.textContent = formatCount(newNumber, "membro", "membros");
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCount(number, singular, plural) {
  return number === 1 ? `1 ${singular}` : `${number} ${plural}`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadCommunities();

  setupCreateCommunityModal();
  setupSlugGenerator();
  setupCreateCommunityForm();
});