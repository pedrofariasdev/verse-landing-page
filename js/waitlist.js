const supabaseUrl = "https://ogvxscsawcgxlhboqpoh.supabase.co";
const supabaseKey = "sb_publishable_voc-6vxNWiCF_qo_m12wTg_y4lZrOBC";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const waitlistForm = document.getElementById("waitlistForm");
const successMessage = document.getElementById("successMessage");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");

waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    nameError.textContent = "";
    emailError.textContent = "";

    nameError.classList.remove("show");
    emailError.classList.remove("show");

    nameInput.parentElement.parentElement.classList.remove("error", "shake");
    emailInput.parentElement.parentElement.classList.remove("error", "shake");

    let hasError = false;

    const nameParts = name.split(" ").filter((part) => part !== "");

    if (name === "" || nameParts.length < 2) {
        nameError.textContent = "Digite nome e sobrenome.";
        nameError.classList.add("show");
        nameInput.parentElement.parentElement.classList.add("error", "shake");

        hasError = true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === "" || !emailPattern.test(email)) {
        emailError.textContent = "Digite um e-mail válido.";
        emailError.classList.add("show");
        emailInput.parentElement.parentElement.classList.add("error", "shake");

        hasError = true;
    }

    if (hasError) {
        setTimeout(() => {
            nameInput.parentElement.parentElement.classList.remove("shake");
            emailInput.parentElement.parentElement.classList.remove("shake");
        }, 400);

        return;
    }

    const { data: existingUsers, error: searchError } = await supabaseClient
        .from("waitlist")
        .select("email")
        .eq("email", email);

    if (searchError) {
        console.log(searchError);

        emailError.textContent = "Erro ao verificar e-mail. Tente novamente.";
        emailError.classList.add("show");
        emailInput.parentElement.parentElement.classList.add("error", "shake");

        return;
    }

    if (existingUsers.length > 0) {
        emailError.textContent = "Este e-mail já está na lista de espera.";
        emailError.classList.add("show");
        emailInput.parentElement.parentElement.classList.add("error", "shake");

        setTimeout(() => {
            emailInput.parentElement.parentElement.classList.remove("shake");
        }, 400);

        return;
    }

    const { error: insertError } = await supabaseClient
        .from("waitlist")
        .insert([
            {
                name: name,
                email: email
            }
        ]);

    if (insertError) {
        console.log(insertError);

        emailError.textContent = "Erro ao cadastrar. Tente novamente.";
        emailError.classList.add("show");
        emailInput.parentElement.parentElement.classList.add("error", "shake");

        return;
    }

    waitlistForm.style.display = "none";
    successMessage.classList.add("show");
});