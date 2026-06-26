console.log("chapter-view.js carregado!");

let chapterId = null;
let currentChapter = null;
let storyChapters = [];
let currentChapterIndex = -1;

async function iniciarChapterView() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  const params = new URLSearchParams(window.location.search);
  chapterId = params.get("id");

  if (!chapterId) {
    alert("Capítulo não encontrado.");
    window.location.href = "../html/stories.html";
    return;
  }

  await carregarCapitulo();
}

async function carregarCapitulo() {
  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select(`
      *,
      stories (
        id,
        title,
        user_id
      )
    `)
    .eq("id", chapterId)
    .single();

  if (error) {
    console.error("Erro ao carregar capítulo:", error.message);
    alert("Não foi possível carregar o capítulo.");
    return;
  }

  currentChapter = data;

  await carregarTodosCapitulosDaHistoria(data.story_id);

  renderizarCapitulo(data);
  configurarNavegacaoCapitulos();

  await registrarProgressoDoCapitulo();
}

async function carregarTodosCapitulosDaHistoria(storyId) {
  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("chapter_number", { ascending: true });

  if (error) {
    console.error("Erro ao carregar capítulos da história:", error.message);
    storyChapters = [];
    return;
  }

  storyChapters = data || [];

  currentChapterIndex = storyChapters.findIndex(function (chapter) {
    return chapter.id === chapterId;
  });
}

function renderizarCapitulo(chapter) {
  const storyTitleLabel = document.getElementById("storyTitleLabel");
  const chapterTitle = document.getElementById("chapterTitle");
  const chapterNumber = document.getElementById("chapterNumber");
  const chapterDate = document.getElementById("chapterDate");
  const chapterContent = document.getElementById("chapterContent");
  const backToStoryBtn = document.getElementById("backToStoryBtn");

  if (storyTitleLabel) {
    storyTitleLabel.textContent =
      chapter.stories?.title || "História Verse";
  }

  if (chapterTitle) {
    chapterTitle.textContent =
      chapter.title || "Capítulo sem título";
  }

  if (chapterNumber) {
    chapterNumber.textContent =
      `Capítulo ${chapter.chapter_number || ""}`;
  }

  if (chapterDate) {
    chapterDate.textContent =
      formatarDataLeitura(chapter.created_at);
  }

  if (chapterContent) {
    chapterContent.innerHTML =
      formatarTextoCapitulo(chapter.content || "");
  }

  if (backToStoryBtn) {
    backToStoryBtn.href =
      `../html/story-view.html?id=${chapter.story_id}`;
  }
}

function configurarNavegacaoCapitulos() {
  const prevBtn = document.getElementById("prevChapterBtn");
  const nextBtn = document.getElementById("nextChapterBtn");

  const previousChapter = storyChapters[currentChapterIndex - 1];
  const nextChapter = storyChapters[currentChapterIndex + 1];

  if (prevBtn) {
    prevBtn.disabled = !previousChapter;

    prevBtn.onclick = function () {
      if (previousChapter) {
        window.location.href =
          `../html/chapter-view.html?id=${previousChapter.id}`;
      }
    };
  }

  if (nextBtn) {
    nextBtn.disabled = !nextChapter;

    nextBtn.onclick = function () {
      if (nextChapter) {
        window.location.href =
          `../html/chapter-view.html?id=${nextChapter.id}`;
      }
    };
  }
}

function formatarTextoCapitulo(texto) {
  if (!texto) {
    return "<p>Este capítulo ainda não possui conteúdo.</p>";
  }

  return texto
    .split(/\n+/)
    .filter(function (paragraph) {
      return paragraph.trim() !== "";
    })
    .map(function (paragraph) {
      return `<p>${paragraph.trim()}</p>`;
    })
    .join("");
}

function formatarDataLeitura(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

async function registrarProgressoDoCapitulo() {
  if (!usuarioLogado || !currentChapter) return;

  const { error } = await supabaseClient
    .from("story_read_progress")
    .upsert(
      {
        story_id: currentChapter.story_id,
        chapter_id: currentChapter.id,
        user_id: usuarioLogado.id,
        chapter_number: currentChapter.chapter_number
      },
      {
        onConflict: "story_id,chapter_id,user_id"
      }
    );

  if (error) {
    console.error("Erro ao registrar progresso:", error.message);
    return;
  }

  await tentarRegistrarLeituraCompleta();
}

async function tentarRegistrarLeituraCompleta() {
  if (!usuarioLogado || !currentChapter) return;

  const ultimoCapitulo =
    storyChapters[storyChapters.length - 1];

  if (!ultimoCapitulo) return;

  const capituloAtualEhUltimo =
    currentChapter.id === ultimoCapitulo.id;

  if (!capituloAtualEhUltimo) {
    return;
  }

  const { data: progresso, error } = await supabaseClient
    .from("story_read_progress")
    .select("chapter_number")
    .eq("story_id", currentChapter.story_id)
    .eq("user_id", usuarioLogado.id);

  if (error) {
    console.error("Erro ao verificar progresso:", error.message);
    return;
  }

  const capitulosLidos = progresso || [];

  const numerosLidos = capitulosLidos.map(function (item) {
    return Number(item.chapter_number);
  });

  const todosCapitulosLidos = storyChapters.every(function (chapter) {
    return numerosLidos.includes(Number(chapter.chapter_number));
  });

  if (!todosCapitulosLidos) {
    return;
  }

  const { error: readError } = await supabaseClient
    .from("story_reads")
    .upsert(
      {
        story_id: currentChapter.story_id,
        user_id: usuarioLogado.id
      },
      {
        onConflict: "story_id,user_id"
      }
    );

  if (readError) {
    console.error("Erro ao registrar leitura completa:", readError.message);
    return;
  }

  await atualizarContadorLeiturasHistoria();
}

async function atualizarContadorLeiturasHistoria() {
  if (!currentChapter) return;

  const { count, error } = await supabaseClient
    .from("story_reads")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("story_id", currentChapter.story_id);

  if (error) {
    console.error("Erro ao contar leituras:", error.message);
    return;
  }

  const total = count || 0;

  const { error: updateError } = await supabaseClient
    .from("stories")
    .update({
      views_count: total
    })
    .eq("id", currentChapter.story_id);

  if (updateError) {
    console.error("Erro ao atualizar leituras da história:", updateError.message);
  }
}

iniciarChapterView();