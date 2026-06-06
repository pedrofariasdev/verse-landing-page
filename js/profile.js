console.log("Profile.js carregado!");

let usuarioLogado = null;
let perfilLogado = null;

async function carregarPerfil() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não autenticado");
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

  console.log("Perfil carregado:", perfilLogado);

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const username = perfilLogado.username || "usuario";
  const bio = perfilLogado.bio || "Este usuário ainda não adicionou uma bio.";

  const firstLetter = fullName.charAt(0).toUpperCase();

  const navAvatar = document.getElementById("navAvatar");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileUsername = document.getElementById("profileUsername");
  const profileBio = document.getElementById("profileBio");

  if (navAvatar) navAvatar.textContent = firstLetter;

  if (profileAvatar) {
    profileAvatar.childNodes[0].nodeValue = firstLetter;
  }

  if (profileName) profileName.textContent = fullName;
  if (profileUsername) profileUsername.textContent = `@${username}`;
  if (profileBio) profileBio.textContent = bio;
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

async function carregarPostsDoPerfil() {
  const profilePostsContainer = document.getElementById("profilePostsContainer");
  const profilePostsCount = document.getElementById("profilePostsCount");

  if (!profilePostsContainer) return;

  profilePostsContainer.innerHTML = "";

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("user_id", usuarioLogado.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts do perfil:", error.message);
    profilePostsContainer.innerHTML =
      "<p>Não foi possível carregar as publicações.</p>";
    return;
  }

  if (profilePostsCount) {
    profilePostsCount.textContent = posts ? posts.length : 0;
  }

  if (!posts || posts.length === 0) {
    profilePostsContainer.innerHTML =
      "<p>Você ainda não tem publicações.</p>";
    return;
  }

  posts.forEach(function (post) {
    const fullName = perfilLogado.full_name || "Usuário Verse";
    const username = perfilLogado.username || "usuario";
    const firstLetter = fullName.charAt(0).toUpperCase();

    const postCard = document.createElement("article");
    postCard.classList.add("post-card");

    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${firstLetter}</div>

        <div class="post-user-info">
          <h3>${fullName}</h3>
          <span>@${username} · ${formatarTempo(post.created_at)}</span>
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

    profilePostsContainer.appendChild(postCard);
  });
}

async function iniciarPerfil() {
  await carregarPerfil();
  await carregarPostsDoPerfil();
}

iniciarPerfil();