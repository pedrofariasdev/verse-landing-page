console.log("contact.js carregado!");

document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.getElementById("contactForm");

  const modal = document.getElementById("contactModal");
  const modalTitle = document.getElementById("contactModalTitle");
  const modalText = document.getElementById("contactModalText");
  const modalBtn = document.getElementById("contactModalBtn");

  function abrirModalContato(title, text) {
    if (modalTitle) modalTitle.textContent = title;
    if (modalText) modalText.textContent = text;

    if (modal) {
      modal.classList.add("active");
    }
  }

  function fecharModalContato() {
    if (modal) {
      modal.classList.remove("active");
    }
  }

  if (modalBtn) {
    modalBtn.addEventListener("click", fecharModalContato);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        fecharModalContato();
      }
    });
  }

  console.log("Form encontrado:", contactForm);

  if (!contactForm) return;

  contactForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitBtn =
      contactForm.querySelector("button[type='submit']");

    const name =
      contactForm.name.value.trim();

    const email =
      contactForm.email.value.trim();

    const subject =
      contactForm.subject.value.trim();

    const message =
      contactForm.message.value.trim();

    if (!name || !email || !subject || !message) {
      abrirModalContato(
        "Campos incompletos",
        "Preencha todos os campos antes de enviar sua mensagem."
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const { error: saveError } = await supabaseClient
      .from("contact_messages")
      .insert([
        {
          name,
          email,
          subject,
          message
        }
      ]);

    if (saveError) {
      console.error(saveError);

      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar mensagem";

      abrirModalContato(
        "Erro ao enviar",
        "Não foi possível salvar sua mensagem. Tente novamente."
      );
      return;
    }

    const { data, error: emailError } =
      await supabaseClient.functions.invoke(
        "send-contact-email",
        {
          body: {
            name,
            email,
            subject,
            message
          }
        }
      );

    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar mensagem";

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);

      if (emailError.context) {
        const errorDetails = await emailError.context.json();
        console.error("Detalhes da Edge Function:", errorDetails);
      }

      abrirModalContato(
        "Mensagem salva",
        "Recebemos sua mensagem, mas houve um problema ao enviar o email de aviso."
      );
      return;
    }

    console.log(data);

    abrirModalContato(
      "Mensagem enviada!",
      "Recebemos sua mensagem e responderemos o mais breve possível."
    );

    contactForm.reset();
  });
});