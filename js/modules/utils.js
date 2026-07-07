function formatarTempo(dataPost) {
  const agora = new Date();
  const data = new Date(dataPost);

  const diferencaMs = agora - data;
  const segundos = Math.floor(diferencaMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (segundos < 60) return "há poucos segundos";
  if (minutos < 60) return `há ${minutos} min`;
  if (horas < 24) return `há ${horas} h`;

  return `há ${dias} d`;
}

const slides = document.querySelectorAll(".slide");

function gerarLinkPerfil(userId) {
  if (!userId) return "#";

  return `../html/public-profile.html?id=${userId}`;
}

function criarNomeUsuarioClicavel(user) {
  if (!user) {
    return `
      <strong>Usuário Verse</strong>
      <span>@usuario</span>
    `;
  }

  const link = gerarLinkPerfil(user.id);

  return `
    <a href="${link}" class="user-clickable">
      <strong>${user.full_name || "Usuário Verse"}</strong>
    </a>

    <a href="${link}" class="user-clickable muted">
      <span>@${user.username || "usuario"}</span>
    </a>
  `;
}

