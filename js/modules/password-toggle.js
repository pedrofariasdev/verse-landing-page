console.log("password-toggle.js carregado!");

function configurarPasswordToggle() {
  const toggles = document.querySelectorAll(".password-toggle");

  toggles.forEach(function (toggle) {
    const wrapper = toggle.closest(".password-wrapper");

    if (!wrapper) return;

    const input = wrapper.querySelector("input");

    if (!input) return;

    toggle.addEventListener("click", function () {
      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      toggle.classList.toggle("active", isPassword);

      toggle.setAttribute(
        "aria-label",
        isPassword ? "Ocultar senha" : "Mostrar senha"
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", configurarPasswordToggle);