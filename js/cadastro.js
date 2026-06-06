console.log("Cadastro.js carregado!");

const cadastroForm = document.getElementById("cadastroForm");

cadastroForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const fullName = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const successMessage = document.getElementById("successMessage");
  const cadastroBtn = document.querySelector(".cadastro-btn");

  nameError.textContent = "";
  emailError.textContent = "";
  passwordError.textContent = "";
  confirmPasswordError.textContent = "";

  const partesNome = fullName
    .split(" ")
    .filter(parte => parte.length > 0);

  if (partesNome.length < 2) {
    nameError.textContent = "Por favor, informe nome e sobrenome.";
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    emailError.textContent = "Por favor, informe seu e-mail.";
    return;
  }

  if (!emailRegex.test(email)) {
    emailError.textContent = "Por favor, informe um e-mail válido.";
    return;
  }

  if (!password) {
    passwordError.textContent = "Por favor, informe uma senha.";
    return;
  }

  if (password.length < 8) {
    passwordError.textContent = "A senha precisa ter pelo menos 8 caracteres.";
    return;
  }

  if (!confirmPassword) {
    confirmPasswordError.textContent = "Por favor, confirme sua senha.";
    return;
  }

  if (password !== confirmPassword) {
    confirmPasswordError.textContent = "As senhas não coincidem.";
    return;
  }

  cadastroBtn.disabled = true;
  cadastroBtn.classList.add("loading");

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
        emailRedirectTo: "https://www.verseonline.pt/html/login.html",
        data: {
      full_name: fullName
        }
     }
    });

  cadastroBtn.disabled = false;
  cadastroBtn.classList.remove("loading");

    if (error) {
  console.error("Erro Supabase:", error.message);

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("rate limit")) {
    emailError.textContent =
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  } else if (
    errorMessage.includes("already registered") ||
    errorMessage.includes("already exists") ||
    errorMessage.includes("user already registered")
  ) {
    emailError.textContent =
      "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  } else {
    emailError.textContent =
      "Não foi possível criar sua conta. Tente novamente.";
  }

  return;
    }

  console.log("Usuário criado:", data);

  cadastroForm.style.display = "none";
  successMessage.classList.add("show");
});