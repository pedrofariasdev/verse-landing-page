console.log("newsletter.js carregado!");

function configurarNewsletter() {
  const newsletterForms = document.querySelectorAll(".newsletter-form");

  newsletterForms.forEach(function (form) {
    const emailInput = form.querySelector("input[type='email']");
    const button = form.querySelector("button");

    if (!emailInput || !button) return;

    button.addEventListener("click", async function () {
      const email = emailInput.value.trim().toLowerCase();

      if (!email) {
        alert("Digite seu email.");
        return;
      }

      button.disabled = true;
      button.textContent = "Enviando...";

      const { error } = await supabaseClient
        .from("newsletter_subscribers")
        .insert([
          {
            email: email
          }
        ]);

      button.disabled = false;
      button.textContent = "Inscrever-se";

      if (error) {
        if (error.code === "23505") {
          alert("Este email já está inscrito na newsletter.");
          return;
        }

        console.error("Erro completo newsletter:", error);

        alert(error.message);
        return;
      }

      alert("Inscrição realizada com sucesso!");
      emailInput.value = "";
    });
  });
}

document.addEventListener("DOMContentLoaded", configurarNewsletter);