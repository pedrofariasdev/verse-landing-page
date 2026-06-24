console.log("chapter-editor.js carregado!");

let storyId = null;
let chapterId = null;
let historiaAtual = null;
let capituloAtual = null;

async function iniciarChapterEditor() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  const params = new URLSearchParams(window.location.search);

  storyId = params.get("story_id");
  chapterId = params.get("chapter_id");

  if (!storyId) {
    alert("História não encontrada.");
    window.location.href = "../html/my-stories.html";
    return;
  }

  await carregarHistoria();

  if (chapterId) {
    await carregarCapitulo();
  }

  configurarFormularioCapitulo();
  configurarContadorTexto();
  configurarBotoes();
}

async function carregarHistoria() {
  const { data, error } = await supabaseClient
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .single();

  if (error) {
    console.error("Erro ao carregar história:", error.message);
    alert("Não foi possível carregar a história.");
    return;
  }

  historiaAtual = data;

  const storyInfoText = document.getElementById("storyInfoText");
  const backToStoryBtn = document.getElementById("backToStoryBtn");

  if (storyInfoText) {
    storyInfoText.textContent = `História: ${data.title}`;
  }

  if (backToStoryBtn) {
    backToStoryBtn.href = `../html/story-editor.html?id=${storyId}`;
  }
}

async function carregarCapitulo() {
  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select("*")
    .eq("id", chapterId)
    .eq("story_id", storyId)
    .single();

  if (error) {
    console.error("Erro ao carregar capítulo:", error.message);
    alert("Não foi possível carregar o capítulo.");
    return;
  }

  capituloAtual = data;

  document.getElementById("chapterEditorTitle").textContent =
    "Editar capítulo";

  document.getElementById("chapterTitle").value = data.title || "";
  document.getElementById("chapterContent").value = data.content || "";

  atualizarContadorTexto();
}

function configurarFormularioCapitulo() {
  const form = document.getElementById("chapterForm");

  if (form) {
    form.addEventListener("submit", salvarCapitulo);
  }
}

async function salvarCapitulo(event) {
  event.preventDefault();

  const title = document.getElementById("chapterTitle").value.trim();
  const content = document.getElementById("chapterContent").value.trim();
  const saveBtn = document.getElementById("saveChapterBtn");

  if (!title || !content) {
    alert("Preencha o título e o conteúdo do capítulo.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Salvando...";

  if (chapterId) {
    await atualizarCapitulo(title, content, saveBtn);
  } else {
    await criarNovoCapitulo(title, content, saveBtn);
  }
}

async function criarNovoCapitulo(title, content, saveBtn) {
  const chapterNumber = await buscarProximoNumeroCapitulo();

  const { error } = await supabaseClient
    .from("story_chapters")
    .insert([
      {
        story_id: storyId,
        title: title,
        content: content,
        chapter_number: chapterNumber
      }
    ]);

  saveBtn.disabled = false;
  saveBtn.textContent = "Salvar capítulo";

  if (error) {
    console.error("Erro ao criar capítulo:", error.message);
    alert("Não foi possível salvar o capítulo.");
    return;
  }

  window.location.href = `../html/story-editor.html?id=${storyId}`;
}

async function atualizarCapitulo(title, content, saveBtn) {
  const { error } = await supabaseClient
    .from("story_chapters")
    .update({
      title: title,
      content: content
    })
    .eq("id", chapterId)
    .eq("story_id", storyId);

  saveBtn.disabled = false;
  saveBtn.textContent = "Salvar capítulo";

  if (error) {
    console.error("Erro ao atualizar capítulo:", error.message);
    alert("Não foi possível atualizar o capítulo.");
    return;
  }

  window.location.href = `../html/story-editor.html?id=${storyId}`;
}

async function buscarProximoNumeroCapitulo() {
  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select("chapter_number")
    .eq("story_id", storyId)
    .order("chapter_number", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Erro ao buscar número do capítulo:", error.message);
    return 1;
  }

  if (!data || data.length === 0) {
    return 1;
  }

  return Number(data[0].chapter_number) + 1;
}

function configurarContadorTexto() {
  const contentInput = document.getElementById("chapterContent");

  if (contentInput) {
    contentInput.addEventListener("input", atualizarContadorTexto);
  }

  atualizarContadorTexto();
}

function atualizarContadorTexto() {
  const content = document.getElementById("chapterContent").value || "";

  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const wordCount = document.getElementById("chapterWordCount");
  const charCount = document.getElementById("chapterCharCount");

  if (wordCount) {
    wordCount.textContent = `${words.length} palavras`;
  }

  if (charCount) {
    charCount.textContent = `${content.length} caracteres`;
  }
}

function configurarBotoes() {
  const cancelBtn = document.getElementById("cancelChapterBtn");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = `../html/story-editor.html?id=${storyId}`;
    });
  }
}

iniciarChapterEditor();