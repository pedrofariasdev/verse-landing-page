console.log("theme.js carregado!");

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem("verseTheme");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

function alterarTema(tema) {
  localStorage.setItem("verseTheme", tema);

  if (tema === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

document.addEventListener("DOMContentLoaded", aplicarTemaSalvo);

const themeSelect = document.getElementById("themeSelect");

if (themeSelect) {
  themeSelect.value = localStorage.getItem("verseTheme") || "light";

  themeSelect.addEventListener("change", function () {
    alterarTema(themeSelect.value);
  });
}

console.log("theme.js carregado!");

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem("verseTheme");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

function alterarTema(tema) {
  localStorage.setItem("verseTheme", tema);
  aplicarTemaSalvo();
}

aplicarTemaSalvo();