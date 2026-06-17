console.log("quotes.js carregado!");

let quotedPostIdPendente = null;

function abrirModalQuote(postId) {
  quotedPostIdPendente = postId;

  const modal = document.getElementById("quoteModal");
  const quoteContent = document.getElementById("quoteContent");
  const quotePreview = document.getElementById("quotePreview");

  if (quoteContent) {
    quoteContent.value = "";
  }

  if (quotePreview) {
    quotePreview.innerHTML = "Carregando publicação original...";
    carregarPreviewQuote(postId);
  }

  if (modal) {
    modal.classList.add("active");
  }
}

async function abrirModalQuote(postId) {
  const modal = document.getElementById("quoteModal");
  const quoteContent = document.getElementById("quoteContent");
  const quotePreview = document.getElementById("quotePreview");

  if (quoteContent) {
    quoteContent.value = "";
  }

  if (quotePreview) {
    quotePreview.innerHTML = "Carregando publicação original...";
  }

  if (modal) {
    modal.classList.add("active");
  }

  const targetPostId = await resolverPostOriginalParaQuote(postId);

  quotedPostIdPendente = targetPostId;

  if (quotePreview) {
    await carregarPreviewQuote(targetPostId);
  }
}

function fecharModalQuote() {
  quotedPostIdPendente = null;

  const modal = document.getElementById("quoteModal");
  const quoteContent = document.getElementById("quoteContent");
  const quotePreview = document.getElementById("quotePreview");

  if (quoteContent) {
    quoteContent.value = "";
  }

  if (quotePreview) {
    quotePreview.innerHTML = "";
  }

  if (modal) {
    modal.classList.remove("active");
  }
}

async function carregarPreviewQuote(postId) {
  const quotePreview = document.getElementById("quotePreview");

  if (!quotePreview) return;

  const { data: post, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !post) {
    console.error("Erro ao carregar preview da citação:", error?.message);
    quotePreview.innerHTML = "<p>Não foi possível carregar a publicação original.</p>";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", post.user_id)
    .single();

  if (profileError) {
    console.error("Erro ao carregar autor da citação:", profileError.message);
  }

  const authorName = profile?.full_name || "Usuário Verse";
  const username = profile?.username || "usuario";

  quotePreview.innerHTML = `
    <div class="quote-preview-card">
      <strong>${authorName}</strong>
      <span>@${username}</span>

      ${post.content ? `<p>${transformarHashtagsEmLinks(post.content)}</p>` : ""}

      ${post.image_url ? `<img src="${post.image_url}" alt="Imagem da publicação original">` : ""}
    </div>
  `;
}

async function publicarQuote() {
  if (!usuarioLogado) {
    alert("Você precisa estar logado para citar uma publicação.");
    return;
  }

  if (!quotedPostIdPendente) return;

  const quoteContent = document.getElementById("quoteContent");
  const confirmBtn = document.getElementById("confirmQuoteBtn");

  const content = quoteContent.value.trim();

  if (!content) {
    alert("Escreva um comentário antes de publicar a citação.");
    return;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Publicando...";
  }

  const { error } = await supabaseClient
    .from("posts")
    .insert([
      {
        user_id: usuarioLogado.id,
        content: content,
        post_type: "quote",
        quoted_post_id: quotedPostIdPendente
      }
    ]);

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Publicar citação";
  }

  if (error) {
    console.error("Erro ao publicar citação:", error.message);
    alert("Não foi possível publicar a citação.");
    return;
  }

  fecharModalQuote();

  if (typeof carregarPosts === "function") {
    await carregarPosts();
  }
}

function configurarModalQuote() {
  const cancelBtn = document.getElementById("cancelQuoteBtn");
  const confirmBtn = document.getElementById("confirmQuoteBtn");
  const modal = document.getElementById("quoteModal");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", fecharModalQuote);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", publicarQuote);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalQuote();
      }
    });
  }
}

async function alternarQuote(postId) {
  
  await abrirModalQuote(postId);
}