console.log("reposts.js carregado!");

async function carregarContadorReposts(postId) {
  const { count, error } = await supabaseClient
    .from("reposts")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("post_id", postId);

  if (error) {
    console.error("Erro ao contar reposts:", error.message);
    return 0;
  }

  return count || 0;
}

async function verificarRepostUsuario(postId) {
  if (!usuarioLogado) return false;

  const { data, error } = await supabaseClient
    .from("reposts")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", usuarioLogado.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar repost:", error.message);
    return false;
  }

  return !!data;
}

async function carregarEstadoRepost(postId, button) {
  const repostado = await verificarRepostUsuario(postId);
  const contador = await carregarContadorReposts(postId);

  if (repostado) {
    button.classList.add("reposted");
    button.innerHTML = `↻ Repostado (${contador})`;
  } else {
    button.classList.remove("reposted");
    button.innerHTML = `↻ Repostar (${contador})`;
  }
}

let repostPostIdPendente = null;
let repostButtonPendente = null;

function abrirModalRepost(postId, button) {
  repostPostIdPendente = postId;
  repostButtonPendente = button;

  const modal = document.getElementById("repostModal");

  if (modal) {
    modal.classList.add("active");
  }
}

function fecharModalRepost() {
  repostPostIdPendente = null;
  repostButtonPendente = null;

  const modal = document.getElementById("repostModal");

  if (modal) {
    modal.classList.remove("active");
  }
}

async function confirmarRepost() {
  if (!usuarioLogado) {
    alert("Você precisa estar logado para repostar.");
    return;
  }

  if (!repostPostIdPendente || !repostButtonPendente) return;

  const postId = repostPostIdPendente;
  const button = repostButtonPendente;

  button.disabled = true;

  const repostado = await verificarRepostUsuario(postId);

  if (repostado) {
    const { error } = await supabaseClient
      .from("reposts")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", usuarioLogado.id);

    if (error) {
      console.error("Erro ao remover repost:", error.message);
      alert("Não foi possível remover o repost.");
      button.disabled = false;
      return;
    }
  } else {
    const { error } = await supabaseClient
      .from("reposts")
      .insert([
        {
          post_id: postId,
          user_id: usuarioLogado.id
        }
      ]);

    if (error) {
      console.error("Erro ao criar repost:", error.message);
      alert("Não foi possível repostar.");
      button.disabled = false;
      return;
    }
  }

  await carregarEstadoRepost(postId, button);

  button.disabled = false;
  fecharModalRepost();
}

function configurarModalRepost() {
  const cancelBtn = document.getElementById("cancelRepostBtn");
  const confirmBtn = document.getElementById("confirmRepostBtn");
  const modal = document.getElementById("repostModal");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", fecharModalRepost);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmarRepost);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalRepost();
      }
    });
  }
}

async function alternarRepost(postId, button) {
  abrirModalRepost(postId, button);
}