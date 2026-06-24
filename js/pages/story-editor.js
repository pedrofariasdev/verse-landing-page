console.log("story-editor.js carregado!");

let storyId = null;
let historiaAtual = null;

async function iniciarStoryEditor() {
  await carregarUsuarioLogado();

  configurarMenuPerfil();
  configurarNotificacoes();
  configurarPesquisaGlobal();

  if (typeof carregarBadgeMensagens === "function") {
    await carregarBadgeMensagens();
  }

  const params = new URLSearchParams(window.location.search);
  storyId = params.get("id");

  if (!storyId) {
    alert("História não encontrada.");
    window.location.href = "../html/my-stories.html";
    return;
  }

  await carregarHistoria();
  await carregarCapitulos();

  configurarBotoesEditor();
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

  const storyTitle = document.getElementById("storyTitle");
  const storyGenre = document.getElementById("storyGenre");
  const storyStatus = document.getElementById("storyStatus");
  const storyDescription = document.getElementById("storyDescription");
  const cover = document.getElementById("storyCover");

  if (storyTitle) {
    storyTitle.textContent = data.title || "História sem título";
  }

  if (storyGenre) {
    storyGenre.textContent = data.genre || "Sem gênero";
  }

  if (storyStatus) {
    storyStatus.textContent = formatarStatusHistoria(data.status);
  }

  if (storyDescription) {
    storyDescription.textContent = data.description || "Sem descrição.";
  }

  if (cover) {
    cover.innerHTML = "";

    if (data.cover_url) {
      const img = document.createElement("img");

      img.src = data.cover_url;
      img.alt = `Capa de ${data.title}`;
      img.classList.add("story-editor-cover-img");

      cover.appendChild(img);
    } else {
      cover.textContent = data.title
        ? data.title.charAt(0).toUpperCase()
        : "V";
    }
  }
}

async function carregarCapitulos() {
  const chaptersList = document.getElementById("chaptersList");

  if (!chaptersList) return;

  chaptersList.innerHTML = "<p>Carregando capítulos...</p>";

  const { data, error } = await supabaseClient
    .from("story_chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("chapter_number", { ascending: true });

  if (error) {
    console.error("Erro ao carregar capítulos:", error.message);
    chaptersList.innerHTML = "<p>Não foi possível carregar os capítulos.</p>";
    return;
  }

  if (!data || data.length === 0) {
    chaptersList.innerHTML = `
      <div class="chapter-empty">
        <h3>Nenhum capítulo ainda.</h3>
        <p>Crie o primeiro capítulo para começar a desenvolver sua história.</p>
      </div>
    `;
    return;
  }

  chaptersList.innerHTML = "";

  data.forEach(function (chapter) {
    const chapterCard = document.createElement("article");
    chapterCard.classList.add("chapter-card");

    chapterCard.innerHTML = `
      <h3>Capítulo ${chapter.chapter_number} — ${chapter.title}</h3>

      <span>
        Criado em ${formatarDataCapitulo(chapter.created_at)}
      </span>

      <div class="chapter-actions">
        <button
          type="button"
          class="read-chapter-btn"
          data-chapter-id="${chapter.id}">
          Ler
        </button>

        <button
          type="button"
          class="edit-chapter-btn"
          data-chapter-id="${chapter.id}">
          Editar
        </button>

        <button
          type="button"
          class="delete-chapter-btn"
          data-chapter-id="${chapter.id}">
          Excluir
        </button>
      </div>
    `;

    chaptersList.appendChild(chapterCard);
  });

  configurarAcoesCapitulos();
}

function configurarBotoesEditor() {
  const newChapterBtn = document.getElementById("newChapterBtn");
  const deleteStoryBtn = document.getElementById("deleteStoryBtn");
  const editStoryBtn = document.getElementById("editStoryBtn");
  const publishStoryBtn = document.getElementById("publishStoryBtn");

  if (publishStoryBtn) {
    publishStoryBtn.addEventListener("click", publicarHistoria);
  }

  if (newChapterBtn) {
    newChapterBtn.addEventListener("click", function () {
      window.location.href =
        `../html/chapter-editor.html?story_id=${storyId}`;
    });
  }

  if (editStoryBtn) {
    editStoryBtn.addEventListener("click", function () {
      alert("Edição da história será feita em seguida.");
    });
  }

  if (deleteStoryBtn) {
    deleteStoryBtn.addEventListener("click", excluirHistoria);
  }

  const changeCoverInput =
    document.getElementById("changeCoverInput");

  const changeCoverBtn =
    document.getElementById("changeCoverBtn");

  if (changeCoverBtn) {
    changeCoverBtn.addEventListener("click", function () {
      changeCoverInput.click();
    });
  }

  if (changeCoverInput) {
    changeCoverInput.addEventListener(
      "change",
      trocarCapaHistoria
    );
  }

}

function configurarAcoesCapitulos() {
  const readButtons = document.querySelectorAll(".read-chapter-btn");
  const editButtons = document.querySelectorAll(".edit-chapter-btn");
  const deleteButtons = document.querySelectorAll(".delete-chapter-btn");

  readButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const chapterId = button.dataset.chapterId;

      window.location.href =
        `../html/chapter-view.html?id=${chapterId}`;
    });
  });

  editButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const chapterId = button.dataset.chapterId;

      window.location.href =
        `../html/chapter-editor.html?story_id=${storyId}&chapter_id=${chapterId}`;
    });
  });

  deleteButtons.forEach(function (button) {
    button.addEventListener("click", async function () {
      const chapterId = button.dataset.chapterId;

      const confirmar = confirm("Tem certeza que deseja excluir este capítulo?");

      if (!confirmar) return;

      const { error } = await supabaseClient
        .from("story_chapters")
        .delete()
        .eq("id", chapterId);

      if (error) {
        console.error("Erro ao excluir capítulo:", error.message);
        alert("Não foi possível excluir o capítulo.");
        return;
      }

      await carregarCapitulos();
    });
  });
}

async function excluirHistoria() {
  const confirmar = confirm(
    "Tem certeza que deseja excluir esta história? Todos os capítulos também serão excluídos."
  );

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", usuarioLogado.id);

  if (error) {
    console.error("Erro ao excluir história:", error.message);
    alert("Não foi possível excluir a história.");
    return;
  }

  window.location.href = "../html/my-stories.html";
}

async function publicarHistoria() {
  const confirmar = confirm(
    "Deseja publicar esta história? Ela ficará visível para a comunidade."
  );

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("stories")
    .update({
      status: "published"
    })
    .eq("id", storyId)
    .eq("user_id", usuarioLogado.id);

  if (error) {
    console.error("Erro ao publicar história:", error.message);
    alert("Não foi possível publicar a história.");
    return;
  }

  alert("História publicada com sucesso!");

  await carregarHistoria();
}

function formatarDataCapitulo(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatarStatusHistoria(status) {
  if (status === "draft") return "Rascunho";
  if (status === "published") return "Publicada";
  if (status === "completed") return "Concluída";

  return "Em andamento";
}

async function trocarCapaHistoria(event) {
  const file = event.target.files[0];

  if (!file) return;

  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${usuarioLogado.id}/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("story-covers")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Erro ao enviar nova capa:", uploadError);
    alert("Erro ao enviar nova capa.");
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("story-covers")
    .getPublicUrl(filePath);

  const novaUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabaseClient
    .from("stories")
    .update({
      cover_url: novaUrl
    })
    .eq("id", storyId)
    .eq("user_id", usuarioLogado.id);

  if (updateError) {
    console.error("Erro ao atualizar capa:", updateError);
    alert("Erro ao atualizar capa.");
    return;
  }

  const cover = document.getElementById("storyCover");

  if (cover) {
    cover.innerHTML = "";

    const img = document.createElement("img");
    img.src = novaUrl;
    img.alt = "Capa da história";
    img.classList.add("story-editor-cover-img");

    cover.appendChild(img);
  }

  alert("Capa atualizada com sucesso!");
}

iniciarStoryEditor();