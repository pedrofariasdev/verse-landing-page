console.log("Cadastro.js carregado!");

const cadastroForm = document.getElementById("cadastroForm");

cadastroForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const fullName = document.getElementById("name").value.trim();
  const nameError = document.getElementById("nameError");

  nameError.textContent = "";

  const partesNome = fullName
    .split(" ")
    .filter(parte => parte.length > 0);

  if (partesNome.length < 2) {
    nameError.innerHTML = "⚠️ Por favor, informe nome e sobrenome.";
    nameError.style.display = "block";
    nameError.style.color = "red";
    nameError.style.fontSize = "14px";
    nameError.style.marginTop = "8px";
    console.log("Erro: nome incompleto");
    return;
  }

  console.log("Nome válido:", fullName);
});