console.log("Feed.js carregado!");

let usuarioLogado = null;

async function carregarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não autenticado");
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  console.log("Usuário logado:", usuarioLogado);

  const fullName =
    usuarioLogado.user_metadata?.full_name || "Usuário Verse";

  const email =
    usuarioLogado.email || "";

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  if (userName) userName.textContent = fullName;
  if (userEmail) userEmail.textContent = email;

  const firstLetter = fullName.charAt(0).toUpperCase();

  if (userAvatar) userAvatar.textContent = firstLetter;
  if (navAvatar) navAvatar.textContent = firstLetter;
  if (createAvatar) createAvatar.textContent = firstLetter;
}

async function carregarPosts() {
  const postsContainer = document.getElementById("postsContainer");

  if (!postsContainer) {
    console.log("postsContainer não encontrado");
    return;
  }

  postsContainer.innerHTML = "";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    postsContainer.innerHTML = "<p>Não foi possível carregar os posts.</p>";
    return;
  }

  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = "<p>Ainda não há publicações.</p>";
    return;
  }

  posts.forEach(function (post) {
    const isMyPost = post.user_id === usuarioLogado.id;

    const postAuthorName = isMyPost
      ? usuarioLogado.user_metadata?.full_name || "Usuário Verse"
      : "Usuário Verse";

    const postAuthorInitial = postAuthorName.charAt(0).toUpperCase();

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${postAuthorInitial}</div>

        <div class="post-user-info">
          <h3>${postAuthorName}</h3>
          <span>@usuario · agora</span>
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

    postsContainer.appendChild(postCard);
  });
}

async function criarPost() {
  const postContent = document.getElementById("postContent");
  const publishBtn = document.getElementById("publishBtn");

  const content = postContent.value.trim();

  if (!content) {
    alert("Escreva algo antes de publicar.");
    return;
  }

  if (!usuarioLogado) {
    alert("Você precisa estar logado para publicar.");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publicando...";

  const { data, error } = await supabaseClient
    .from("posts")
    .insert([
      {
        user_id: usuarioLogado.id,
        content: content,
        post_type: "text"
      }
    ])
    .select();

  publishBtn.disabled = false;
  publishBtn.textContent = "Publicar";

  if (error) {
    console.error("Erro ao criar post:", error.message);
    alert("Não foi possível publicar. Tente novamente.");
    return;
  }

  console.log("Post criado:", data);

  postContent.value = "";

  await carregarPosts();
}

async function iniciarFeed() {
  await carregarUsuarioLogado();
  await carregarPosts();

  const publishBtn = document.getElementById("publishBtn");

  if (publishBtn) {
    publishBtn.addEventListener("click", criarPost);
  }
}

iniciarFeed();  