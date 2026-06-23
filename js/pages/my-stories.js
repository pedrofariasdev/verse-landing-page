console.log("my-stories.js carregado!");

let storyCoverFile = null;

function abrirModalNovaHistoria() {
  const modal = document.getElementById("createStoryModal");

  if (modal) {
    modal.classList.add("active");
  }
}

function fecharModalNovaHistoria() {
  const modal = document.getElementById("createStoryModal");
  const form = document.getElementById("createStoryForm");
  const previewBox = document.getElementById("storyCoverPreviewBox");
  const preview = document.getElementById("storyCoverPreview");

  storyCoverFile = null;

  if (form) form.reset();

  if (preview) preview.src = "";

  if (previewBox) {
    previewBox.style.display = "none";
  }

  if (modal) {
    modal.classList.remove("active");
  }
}

function configurarPreviewCapaHistoria() {
  const input = document.getElementById("storyCoverInput");
  const previewBox = document.getElementById("storyCoverPreviewBox");
  const preview = document.getElementById("storyCoverPreview");

  if (!input || !previewBox || !preview) return;

  input.addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (!file) return;

    storyCoverFile = file;

    const imageUrl = URL.createObjectURL(file);

    preview.src = imageUrl;
    previewBox.style.display = "block";
  });
}

function configurarModalNovaHistoria() {
  const openBtn = document.getElementById("openCreateStoryModalBtn");
  const cancelBtn = document.getElementById("cancelCreateStoryBtn");
  const modal = document.getElementById("createStoryModal");

  if (openBtn) {
    openBtn.addEventListener("click", abrirModalNovaHistoria);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", fecharModalNovaHistoria);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalNovaHistoria();
      }
    });
  }
}

async function uploadCapaHistoria() {
  if (!storyCoverFile) {
    console.log("Nenhuma capa selecionada.");
    return null;
  }

  if (!usuarioLogado) {
    console.error("Usuário não logado.");
    return null;
  }

  const fileExt = storyCoverFile.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${usuarioLogado.id}/${fileName}`;

  console.log("Arquivo:", storyCoverFile);
  console.log("Bucket:", "story-covers");
  console.log("Caminho:", filePath);

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("story-covers")
    .upload(filePath, storyCoverFile);

  if (uploadError) {
    console.error("Erro completo no upload:", uploadError);

    alert(
      "Erro ao enviar capa: " +
      (uploadError.message || "Erro desconhecido")
    );

    return null;
  }

  console.log("Upload realizado:", uploadData);

  const { data: publicUrlData } = supabaseClient.storage
    .from("story-covers")
    .getPublicUrl(filePath);

  console.log("URL pública da capa:", publicUrlData.publicUrl);

  return publicUrlData.publicUrl;
}

async function criarHistoria(event) {
  event.preventDefault();

  const title = document.getElementById("storyTitle").value.trim();
  const description = document.getElementById("storyDescription").value.trim();
  const genre = document.getElementById("storyGenre").value;
  const status = document.getElementById("storyStatus").value;
  const createBtn = document.getElementById("createStoryBtn");

  if (!title || !description) {
    alert("Preencha o título e a sinopse.");
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Criando...";

  const coverUrl = await uploadCapaHistoria();

  if (storyCoverFile && !coverUrl) {
    createBtn.disabled = false;
    createBtn.textContent = "Criar história";
    return;
  }

  const { data, error } = await supabaseClient
    .from("stories")
    .insert([
      {
        user_id: usuarioLogado.id,
        title: title,
        description: description,
        genre: genre,
        status: status,
        cover_url: coverUrl
      }
    ])
    .select();

  createBtn.disabled = false;
  createBtn.textContent = "Criar história";

  if (error) {
    console.error("Erro ao criar história:", error.message);
    alert("Não foi possível criar a história.");
    return;
  }

  fecharModalNovaHistoria();

  const story = data[0];

  window.location.href =
    `../html/story-editor.html?id=${story.id}`;
}

function configurarFormularioHistoria() {
  const form = document.getElementById("createStoryForm");

  if (form) {
    form.addEventListener("submit", criarHistoria);
  }
}

async function iniciarMinhasHistorias() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarNotificacoes === "function") {
    await carregarNotificacoes();
  }

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  configurarModalNovaHistoria();
  configurarPreviewCapaHistoria();
  configurarFormularioHistoria();
}

iniciarMinhasHistorias();