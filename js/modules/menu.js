function configurarMenuPerfil() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!profileMenuBtn || !profileDropdown) {
    console.warn("Menu de perfil não encontrado.");
    return;
  }

  profileMenuBtn.onclick = function (event) {
    event.preventDefault();
    event.stopPropagation();

    profileDropdown.classList.toggle("show");

    const notificationDropdown =
      document.getElementById("notificationDropdown");

    if (notificationDropdown) {
      notificationDropdown.classList.remove("show");
    }
  };

  profileDropdown.onclick = function (event) {
    event.stopPropagation();
  };

  document.addEventListener("click", function () {
    profileDropdown.classList.remove("show");
  });

  if (logoutBtn) {
    logoutBtn.onclick = async function () {
      await supabaseClient.auth.signOut();
      window.location.href = "../html/login.html";
    };
  }
}