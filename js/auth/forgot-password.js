console.log("forgot-password.js carregado!");

const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const submitBtn = forgotPasswordForm.querySelector(".submit-btn");

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
      alert("Digite seu e-mail.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
          "http://127.0.0.1:5500/html/update-password.html"
      }
    );

    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar Link";

    if (error) {
      console.error("Erro ao enviar recuperação de senha:", error.message);
      alert("Não foi possível enviar o link de recuperação.");
      return;
    }

    alert("Enviamos um link de recuperação para o seu e-mail.");
    emailInput.value = "";
  });
}

document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
      document.getElementById("email").value;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
          "https://www.verseonline.pt/html/update-password.html"
        }
      );

    if (error) {

      alert(
        "Erro ao enviar o e-mail."
      );

      console.error(error);

      return;
    }

    alert(
      "Verifique sua caixa de entrada."
    );

  });