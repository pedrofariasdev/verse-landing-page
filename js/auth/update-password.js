console.log("update-password.js carregado!");

const updatePasswordForm = document.getElementById("updatePasswordForm");

if (updatePasswordForm) {

  const passwordError =
    document.getElementById("passwordError");

  updatePasswordForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    passwordError.textContent = "";

    const newPasswordInput =
      document.getElementById("newPassword");

    const confirmPasswordInput =
      document.getElementById("confirmPassword");

    const submitBtn =
      updatePasswordForm.querySelector(".submit-btn");

    const newPassword =
      newPasswordInput.value.trim();

    const confirmPassword =
      confirmPasswordInput.value.trim();

    if (!newPassword || !confirmPassword) {

      passwordError.textContent =
        "Preencha os dois campos.";

      return;
    }

    if (newPassword.length < 6) {

      passwordError.textContent =
        "A senha precisa ter pelo menos 6 caracteres.";

      return;
    }

    if (newPassword !== confirmPassword) {

      passwordError.textContent =
        "As senhas não coincidem.";

      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    const { error } =
      await supabaseClient.auth.updateUser({
        password: newPassword
      });

    submitBtn.disabled = false;
    submitBtn.textContent =
      "Salvar nova senha";

    if (error) {

      console.error(
        "Erro ao atualizar senha:",
        error.message
      );

      if (
        error.message.includes(
          "different from the old password"
        )
      ) {

        passwordError.textContent =
          "A nova senha deve ser diferente da senha atual.";

        return;
      }

      passwordError.textContent =
        "Não foi possível atualizar a senha.";

      return;
    }

    alert(
      "Senha atualizada com sucesso. Faça login novamente."
    );

    await supabaseClient.auth.signOut();

    window.location.href =
      "../html/login.html";
  });
}