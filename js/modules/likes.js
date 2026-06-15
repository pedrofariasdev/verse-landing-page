async function carregarEstadoCurtida(postId, button) {
  const { data: like } = await supabaseClient
    .from("likes")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", usuarioLogado.id)
    .maybeSingle();

  const { count } = await supabaseClient
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (like) {
    button.textContent = `❤️ Curtido (${count || 0})`;
    button.classList.add("liked");
  } else {
    button.textContent = `♡ Curtir (${count || 0})`;
    button.classList.remove("liked");
  }
}

async function alternarCurtida(postId, button) {
  const jaCurtiu = button.classList.contains("liked");

  button.disabled = true;

  if (jaCurtiu) {
    await supabaseClient
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", usuarioLogado.id);
  } else {
    const { error } = await supabaseClient
      .from("likes")
      .insert([
        {
          post_id: postId,
          user_id: usuarioLogado.id
        }
      ]);

    if (!error) {
      const { data: postData } = await supabaseClient
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postData && postData.user_id !== usuarioLogado.id) {
        await criarNotificacao(
          postData.user_id,
          usuarioLogado.id,
          "like",
          `${perfilLogado.full_name} curtiu sua publicação.`,
          `../html/public-profile.html?id=${usuarioLogado.id}`
        );
      }
    }
  }

  await carregarEstadoCurtida(postId, button);

  button.disabled = false;
}