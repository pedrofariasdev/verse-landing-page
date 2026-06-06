console.log("Feed.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;

async function carregarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não autenticado");
    window.location.href = "../html/login.html";
    return;
  }

  usuarioLogado = data.user;

  let { data: profiles, error: profileError } = await supabaseClient
  .from("profiles")
  .select("*")
  .eq("id", usuarioLogado.id)
  .limit(1);

if (profileError) {
  console.error("Erro ao carregar profile:", profileError.message);
  return;
}

let profile = profiles && profiles.length > 0 ? profiles[0] : null;

if (profileError) {
  console.error("Erro ao carregar profile:", profileError.message);
  return;
}

if (!profile) {
  const fullName =
    usuarioLogado.user_metadata?.full_name || "Usuário Verse";

  const username = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

  const { data: newProfile, error: createProfileError } = await supabaseClient
    .from("profiles")
    .insert([
      {
        id: usuarioLogado.id,
        full_name: fullName,
        username: username || "usuario.verse",
        bio: "",
        avatar_url: ""
      }
    ])
    .select()
    .single();

  if (createProfileError) {
    console.error("Erro ao criar profile:", createProfileError.message);
    return;
  }

  profile = newProfile;
}

perfilLogado = profile;

  console.log("Profile logado:", perfilLogado);

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const username = perfilLogado.username || "usuario";
  const email = usuarioLogado.email || "";

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  if (userName) userName.textContent = fullName;
  if (userEmail) userEmail.textContent = `@${username}`;

  const firstLetter = fullName.charAt(0).toUpperCase();

  if (userAvatar) userAvatar.textContent = firstLetter;
  if (navAvatar) navAvatar.textContent = firstLetter;
  if (createAvatar) createAvatar.textContent = firstLetter;
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
      ? perfilLogado.full_name
      : "Usuário Verse";

    const postAuthorUsername = isMyPost
      ? perfilLogado.username
      : "usuario";

    const postAuthorInitial = postAuthorName.charAt(0).toUpperCase();

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${postAuthorInitial}</div>

        <div class="post-user-info">
          <h3>${postAuthorName}</h3>
          <span>@${postAuthorUsername} · ${formatarTempo(post.created_at)}</span>
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