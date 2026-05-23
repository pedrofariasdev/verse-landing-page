<<<<<<< HEAD
const slides = document.querySelectorAll('.slide');

let currentSlide = 0;

setInterval(() => {

  slides[currentSlide].classList.remove('active');

  currentSlide++;

  if (currentSlide >= slides.length) {
    currentSlide = 0;
  }

  slides[currentSlide].classList.add('active');

=======
const slides = document.querySelectorAll('.slide');

let currentSlide = 0;

setInterval(() => {

  slides[currentSlide].classList.remove('active');

  currentSlide++;

  if (currentSlide >= slides.length) {
    currentSlide = 0;
  }

  slides[currentSlide].classList.add('active');

>>>>>>> 3db813c538ce31db38b64fe2f53ddcc4418d15da
}, 4000);