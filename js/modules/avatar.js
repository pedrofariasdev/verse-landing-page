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

  const fullName = perfilLogado.full_name || "Usuário Verse";
  const username = perfilLogado.username || "usuario";
  const firstLetter = fullName.charAt(0).toUpperCase();

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  if (userName) userName.textContent = fullName;
  if (userEmail) userEmail.textContent = `@${username}`;

  if (userAvatar) userAvatar.textContent = firstLetter;
  if (navAvatar) navAvatar.textContent = firstLetter;
  if (createAvatar) createAvatar.textContent = firstLetter;

  if (perfilLogado.avatar_url) {
    mostrarAvatarNaTela(perfilLogado.avatar_url);
  }
}

function mostrarAvatarNaTela(avatarUrl) {
  const userAvatar = document.getElementById("userAvatar");
  const navAvatar = document.getElementById("navAvatar");
  const createAvatar = document.getElementById("createAvatar");

  const elements = [userAvatar, navAvatar, createAvatar];

  elements.forEach(function (element) {
    if (element) {
      element.style.backgroundImage = `url(${avatarUrl})`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      element.style.color = "transparent";
    }
  });
}