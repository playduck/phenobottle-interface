const errorMesage = document.getElementById('error-message');
const urlParams = new URLSearchParams(window.location.search);
const loginFailed = urlParams.get('failed');

const colors = {
  'ERROR': 'var(--warr-red)',
  'WARNING': 'var(--warr-yellow)',
  'SUCCESS': 'var(--warr-green)'
};

function displayMessage(text, color) {
  errorMesage.style.opacity = 0;

  setTimeout(() => {
    errorMesage.innerText = text;
    errorMesage.style.color = color;
    errorMesage.style.opacity = 1;
  }, 250);
}

if (loginFailed == 'unauthorized') {
  displayMessage(
      'Invalid or Expired Authorization. Please Login.', colors.WARNING);
} else if (loginFailed != undefined) {
  displayMessage(
      'The Username or Password is incorrect. Please try again.', colors.ERROR);
}

document.getElementById('login').addEventListener('click', attemptLogin);
document.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    attemptLogin();
  }
});

function attemptLogin() {
  document.body.classList.add('waiting');
  errorMesage.style.opacity = 0;

  const username = document.getElementById('username');
  const password = document.getElementById('password');

  const usernameText = username.value.toString();
  const passwordText = password.value.toString();

  if (usernameText.length == 0 || passwordText.length == 0) {
    displayMessage('The Username or Password cannot be empty.', colors.WARNING);
    document.body.classList.remove('waiting');
    return;
  }

  fetch('/api/v1/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: usernameText, password: passwordText}),
  })
      .then((res) => res.json())
      .then((data) => {
        document.body.classList.remove('waiting');

        if (data.message === 'failure') {
          displayMessage(
              'The Username or Password is incorrect. Please try again.',
              colors.ERROR);
          username.value = '';
          password.value = '';
        } else {
          displayMessage('Login success. Please Wait...', colors.SUCCESS);
          setTimeout(() => {
            location.href = data.message;
          }, 500);
        }
      })
      .catch((err) => console.error(err));
}

const feFuncR = document.getElementById('feFuncR');
const feFuncG = document.getElementById('feFuncG');
const feFuncB = document.getElementById('feFuncB');
const startValue = 9;
const endValue = 1.1;
const duration = 1500;
let startTime = null;

function ease(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animate(timestamp) {
  if (!startTime) {
    startTime = timestamp;
  }
  var progress = (timestamp - startTime) / duration;
  progress = ease(progress);  // Apply easing to the progress value
  var value = startValue + (endValue - startValue) * progress;
  feFuncR.setAttribute('exponent', value);
  feFuncG.setAttribute('exponent', value);
  feFuncB.setAttribute('exponent', value);
  if (progress < 1) {
    requestAnimationFrame(animate);
  } else  {
    feFuncR.setAttribute('exponent', endValue);
    feFuncG.setAttribute('exponent', endValue);
    feFuncB.setAttribute('exponent', endValue);
  }
}


requestAnimationFrame(animate);
