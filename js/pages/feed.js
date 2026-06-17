console.log("Feed.js carregado!");



let imagemSelecionada = null;

function configurarUploadImagemPost() {
  const photoPostBtn = document.getElementById("photoPostBtn");
  const postImageInput = document.getElementById("postImageInput");
  const imagePreviewBox = document.getElementById("imagePreviewBox");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");

  if (photoPostBtn && postImageInput) {
    photoPostBtn.addEventListener("click", function () {
      postImageInput.click();
    });
  }

  if (postImageInput) {
    postImageInput.addEventListener("change", function (event) {
      const file = event.target.files[0];

      if (!file) return;

      imagemSelecionada = file;

      const imageUrl = URL.createObjectURL(file);

      if (imagePreview) {
        imagePreview.src = imageUrl;
      }

      if (imagePreviewBox) {
        imagePreviewBox.style.display = "block";
      }
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", function () {
      imagemSelecionada = null;

      if (postImageInput) {
        postImageInput.value = "";
      }

      if (imagePreview) {
        imagePreview.src = "";
      }

      if (imagePreviewBox) {
        imagePreviewBox.style.display = "none";
      }
    });
  }
}

async function uploadImagemPost() {
  if (!imagemSelecionada || !usuarioLogado) return null;

  const fileExt = imagemSelecionada.name.split(".").pop();

  const fileName = `${usuarioLogado.id}-${Date.now()}.${fileExt}`;

  const filePath = `posts/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("post-images")
    .upload(filePath, imagemSelecionada, {
      upsert: false
    });

  if (uploadError) {
    console.error("Erro ao enviar imagem:", uploadError.message);
    alert("Não foi possível enviar a imagem.");
    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

function limparImagemSelecionada() {
  const postImageInput = document.getElementById("postImageInput");
  const imagePreviewBox = document.getElementById("imagePreviewBox");
  const imagePreview = document.getElementById("imagePreview");

  imagemSelecionada = null;

  if (postImageInput) postImageInput.value = "";
  if (imagePreview) imagePreview.src = "";
  if (imagePreviewBox) imagePreviewBox.style.display = "none";
}

async function criarPost() {
  const postContent = document.getElementById("postContent");
  const publishBtn = document.getElementById("publishBtn");

  if (!postContent || !publishBtn) {
    console.error("Campos de publicação não encontrados.");
    return;
  }

  const content = postContent.value.trim();

  if (!content && !imagemSelecionada) {
    alert("Escreva algo ou selecione uma imagem antes de publicar.");
    return;
  }

  if (!usuarioLogado) {
    alert("Você precisa estar logado para publicar.");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publicando...";

  let imageUrl = null;

  if (imagemSelecionada) {
    imageUrl = await uploadImagemPost();

    if (!imageUrl) {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publicar";
      return;
    }
  }

  const { data, error } = await supabaseClient
    .from("posts")
    .insert([
      {
        user_id: usuarioLogado.id,
        content: content || "",
        post_type: imageUrl ? "image" : "text",
        image_url: imageUrl
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

  if (data && data.length > 0) {
    await salvarHashtagsDoPost(data[0].id, content);
  }

  postContent.value = "";

  limparImagemSelecionada();

  await carregarPosts();
  await carregarHashtagsEmAlta();
}


async function uploadImagemPost() {
  if (!imagemSelecionada || !usuarioLogado) return null;

  const fileExt = imagemSelecionada.name.split(".").pop();

  const fileName =
    `${usuarioLogado.id}-${Date.now()}.${fileExt}`;

  const filePath =
    `posts/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("post-images")
    .upload(filePath, imagemSelecionada, {
      upsert: false
    });

  if (uploadError) {
    console.error("Erro ao enviar imagem:", uploadError.message);
    alert("Não foi possível enviar a imagem.");
    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

async function carregarSugestoes() {
  console.log("Carregar sugestões chamado no Feed");

  const suggestionsContainer =
    document.getElementById("suggestionsContainer");

  if (!suggestionsContainer) {
    console.log("suggestionsContainer não encontrado");
    return;
  }

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .neq("id", usuarioLogado.id)
    .limit(5);

  console.log("Usuários encontrados:", users);

  if (error) {
    console.error("Erro ao carregar sugestões:", error.message);
    return;
  }

  suggestionsContainer.innerHTML = "";

  if (!users || users.length === 0) {
    suggestionsContainer.innerHTML =
      "<p>Nenhuma sugestão disponível.</p>";
    return;
  }

  const userIds = users.map(user => user.id);

  const { data: follows, error: followsError } = await supabaseClient
    .from("followers")
    .select("*")
    .eq("follower_id", usuarioLogado.id)
    .in("following_id", userIds);

  if (followsError) {
    console.error("Erro ao carregar follows:", followsError.message);
    return;
  }

  users.forEach(function (user) {
    const jaSegue = follows.some(
      follow => follow.following_id === user.id
    );

    const firstLetter =
      (user.full_name || "U").charAt(0).toUpperCase();

    const avatarStyle = user.avatar_url
      ? `background-image: url('${user.avatar_url}'); background-size: cover; background-position: center; color: transparent;`
      : "";

    const card = document.createElement("div");
    card.classList.add("suggestion-card");

    card.innerHTML = `
      <div class="suggestion-avatar" style="${avatarStyle}">
        ${firstLetter}
      </div>

      <div class="suggestion-info">
        <strong>${user.full_name || "Usuário Verse"}</strong>
        <span>@${user.username || "usuario"}</span>
      </div>

      <button
        class="follow-btn ${jaSegue ? "following" : ""}"
        data-user-id="${user.id}">
        ${jaSegue ? "Seguindo" : "Seguir"}
      </button>
    `;

    const followBtn = card.querySelector(".follow-btn");

    followBtn.addEventListener("click", async function () {
      await alternarFollowSugestao(user.id, followBtn);
    });

    suggestionsContainer.appendChild(card);
  });
}

async function alternarFollowSugestao(userId, button) {
  const jaSegue = button.classList.contains("following");

  button.disabled = true;

  if (jaSegue) {
    const { error } = await supabaseClient
      .from("followers")
      .delete()
      .eq("follower_id", usuarioLogado.id)
      .eq("following_id", userId);

    if (error) {
      console.error("Erro ao deixar de seguir:", error.message);
      alert("Não foi possível deixar de seguir.");
      button.disabled = false;
      return;
    }

    button.classList.remove("following");
    button.textContent = "Seguir";
  } else {
    const { error } = await supabaseClient
      .from("followers")
      .insert([
        {
          follower_id: usuarioLogado.id,
          following_id: userId
        }
      ]);

    if (error) {
      console.error("Erro ao seguir:", error.message);
      alert("Não foi possível seguir.");
      button.disabled = false;
      return;
    }

    button.classList.add("following");
    button.textContent = "Seguindo";
  }

  button.disabled = false;
}


async function iniciarFeed() {
  await carregarUsuarioLogado();
  await carregarPosts();
  await carregarSugestoes();
  await carregarNotificacoes();
  //await carregarBadgeMensagens();

  const publishBtn = document.getElementById("publishBtn");

  if (publishBtn) {
    publishBtn.addEventListener("click", criarPost);
  }

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarUploadImagemPost();
  configurarCompartilhamentoPost();
  configurarSugestoesHashtags();
  carregarHashtagsEmAlta();
  configurarPesquisaGlobal();
  configurarModalRepost();
  configurarModalQuote();
}

iniciarFeed();