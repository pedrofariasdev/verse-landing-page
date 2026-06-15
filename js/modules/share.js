function configurarCompartilhamentoPost() {
  document.addEventListener("click", async function (event) {
    const shareBtn = event.target.closest(".share-btn");

    if (!shareBtn) return;

    const postId = shareBtn.dataset.postId;

    if (!postId) return;

    const postUrl = `${window.location.origin}/html/post.html?id=${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Publicação na Verse",
          text: "Veja esta publicação na Verse:",
          url: postUrl
        });
      } catch (error) {
        console.log("Compartilhamento cancelado.");
      }

      return;
    }

    await navigator.clipboard.writeText(postUrl);
    alert("Link da publicação copiado!");
  });
}