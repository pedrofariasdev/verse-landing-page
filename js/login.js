console.log("Login.js carregado!");

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const successMessage = document.getElementById("successMessage");
  const loginBtn = document.querySelector(".login-btn");

  emailError.textContent = "";
  passwordError.textContent = "";

  if (!email) {
    emailError.textContent = "Por favor, informe seu e-mail.";
    return;
  }

  if (!password) {
    passwordError.textContent = "Por favor, informe sua senha.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.classList.add("loading");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  loginBtn.disabled = false;
  loginBtn.classList.remove("loading");

  if (error) {
    console.error("Erro no login:", error.message);

    if (error.message.includes("Email not confirmed")) {
      emailError.textContent = "Confirme seu e-mail antes de entrar.";
    } else {
      emailError.textContent = "E-mail ou senha inválidos.";
    }

    return;
  }

  console.log("Login realizado:", data);

  loginForm.style.display = "none";
  successMessage.classList.add("show");

  setTimeout(function () {
    window.location.href = "../html/feed.html";
  }, 1200);
});