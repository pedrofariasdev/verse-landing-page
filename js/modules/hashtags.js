async function carregarHashtagsEmAlta() {

  const container =
    document.getElementById("trendingHashtags");

  if (!container) return;

  container.innerHTML = "Carregando...";

  const { data, error } = await supabaseClient
    .from("post_hashtags")
    .select(`
      hashtag_id,
      hashtags (
        id,
        name
      )
    `);

  if (error) {
    console.error(error);
    container.innerHTML = "Erro ao carregar.";
    return;
  }

  const contador = {};

  data.forEach(item => {

    const nome =
      item.hashtags?.name;

    if (!nome) return;

    contador[nome] =
      (contador[nome] || 0) + 1;

  });

  const ranking = Object.entries(contador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  container.innerHTML = "";

  ranking.forEach(([nome, total]) => {

    const item =
      document.createElement("div");

    item.classList.add("trending-item");

    item.innerHTML = `
      <a href="../html/hashtag.html?tag=${nome}">
        #${nome}
      </a>

      <span>${total}</span>
    `;

    container.appendChild(item);

  });

}

function configurarSugestoesHashtags() {
  console.log("Função de sugestões chamada");
  const postContent = document.getElementById("postContent");
  const suggestionsBox = document.getElementById("hashtagSuggestions");
  console.log("postContent:", postContent);
  console.log("suggestionsBox:", suggestionsBox);

  if (!postContent || !suggestionsBox) return;

  postContent.addEventListener("input", async function () {
    console.log("Digitando:", postContent.value);
    const texto = postContent.value;
    const match = texto.match(/(?:^|\s)#([\p{L}0-9_]*)$/u);

    if (!match) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("show");
      return;
    }

    const termo = match[1].toLowerCase();

    if (termo.length < 1) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("show");
      return;
    }

    const { data, error } = await supabaseClient
      .from("hashtags")
      .select("name")
      .ilike("name", `${termo}%`)
      .limit(5);

      console.log("Sugestões encontradas:", data, error);

    if (error || !data || data.length === 0) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("show");
      return;
    }

    suggestionsBox.innerHTML = "";

    data.forEach(function (item) {
      const div = document.createElement("div");
      div.classList.add("hashtag-suggestion-item");
      div.textContent = `#${item.name}`;

      div.addEventListener("click", function () {
        postContent.value = postContent.value.replace(
          /(?:^|\s)#([\p{L}0-9_]*)$/u,
          `#${item.name} `
        );

        suggestionsBox.innerHTML = "";
        suggestionsBox.classList.remove("show");
        postContent.focus();
      });

      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.add("show");
  });
}

function transformarHashtagsEmLinks(texto) {
  if (!texto) return "";

  return texto.replace(/#([\p{L}0-9_]+)/gu, function (match, tag) {
    return `<a href="../html/hashtag.html?tag=${encodeURIComponent(tag.toLowerCase())}" class="hashtag-link">${match}</a>`;
  });
}

function extrairHashtags(texto) {
  if (!texto) return [];

  const regex = /#([\p{L}0-9_]+)/gu;
  const matches = texto.match(regex);

  if (!matches) return [];

  return [...new Set(
    matches.map(tag =>
      tag
        .replace("#", "")
        .toLowerCase()
        .trim()
    )
  )];
}

async function salvarHashtagsDoPost(postId, content) {
  const hashtags = extrairHashtags(content);

  console.log("Hashtags extraídas:", hashtags);
  console.log("Post ID recebido:", postId);

  if (hashtags.length === 0) return;

  for (const hashtagName of hashtags) {
    let hashtagId = null;

    const { data: existingHashtag, error: selectError } = await supabaseClient
      .from("hashtags")
      .select("id")
      .eq("name", hashtagName)
      .maybeSingle();

    if (selectError) {
      console.error("Erro ao procurar hashtag:", selectError.message);
      continue;
    }

    if (existingHashtag) {
      hashtagId = existingHashtag.id;
    } else {
      const { data: newHashtag, error: insertError } = await supabaseClient
        .from("hashtags")
        .insert([
          {
            name: hashtagName
          }
        ])
        .select("id")
        .single();

      if (insertError) {
        console.error("Erro ao criar hashtag:", insertError.message);
        continue;
      }

      hashtagId = newHashtag.id;
    }

    const { error: relationError } = await supabaseClient
      .from("post_hashtags")
      .insert([
        {
          post_id: postId,
          hashtag_id: hashtagId
        }
      ]);

    if (relationError) {
      console.error("Erro ao relacionar hashtag ao post:", relationError.message);
      continue;
    }

    console.log("Relação hashtag salva:", hashtagName, postId);
  }
}

console.log("hashtag.js carregado!");

const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");



async function iniciarHashtag() {
  await carregarUsuarioLogado();

  await carregarPaginaHashtag();
  await carregarHashtagsEmAlta();

  configurarPesquisaGlobal();
  configurarMenuPerfil();
  configurarNotificacoes();
}