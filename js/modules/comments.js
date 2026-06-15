async function carregarContadorComentarios(postId, button) {
  const { count, error } = await supabaseClient
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    console.error("Erro ao contar comentários:", error.message);
    return;
  }

  button.textContent = `💬 Comentar (${count || 0})`;
}

async function enviarComentario(postId) {
  const input = document.getElementById(`commentInput-${postId}`);

  if (!input) return;

  const content = input.value.trim();

  if (!content) {
    alert("Escreva um comentário antes de enviar.");
    return;
  }

  const { error } = await supabaseClient
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: usuarioLogado.id,
        content: content
      }
    ]);

  if (error) {
    console.error("Erro ao comentar:", error.message);
    alert("Não foi possível comentar.");
    return;
  }

  const { data: postData } = await supabaseClient
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (postData && postData.user_id !== usuarioLogado.id) {
    await criarNotificacao(
      postData.user_id,
      usuarioLogado.id,
      "comment",
      `${perfilLogado.full_name} comentou sua publicação.`,
      `../html/public-profile.html?id=${usuarioLogado.id}`
    );
  }

  input.value = "";

  await carregarComentarios(postId);

  const commentBtn = document.querySelector(
    `.comment-btn[data-post-id="${postId}"]`
  );

  if (commentBtn) {
    await carregarContadorComentarios(postId, commentBtn);
  }
}

async function carregarComentarios(postId) {
  const commentsList = document.getElementById(`commentsList-${postId}`);

  if (!commentsList) return;

  const { data: comments, error } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    return;
  }

  commentsList.innerHTML = "";

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = "<p class='empty-comments'>Nenhum comentário ainda.</p>";
    return;
  }

  const userIds = [...new Set(comments.map(comment => comment.user_id))];

  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("*")
    .in("id", userIds);

  comments.forEach(comment => {
    const author = profiles.find(profile => profile.id === comment.user_id);

    const div = document.createElement("div");
    div.classList.add("comment-item");

    div.innerHTML = `
      <strong>${author?.full_name || "Usuário Verse"}</strong>
      <span>@${author?.username || "usuario"}</span>
      <p>${comment.content}</p>
    `;

    commentsList.appendChild(div);
  });
}

