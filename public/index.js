const errorMesage = document.getElementById("error-message");
const urlParams = new URLSearchParams(window.location.search);
const loginFailed = urlParams.get('failed');

const colors = {
  "ERROR": "var(--warr-red)",
  "WARNING": "var(--warr-yellow)",
  "SUCCESS": "var(--warr-green)"
};

function displayMessage(text, color) {
  errorMesage.style.opacity = 0;

  setTimeout(() => {
    errorMesage.innerText = text;
    errorMesage.style.color = color;
    errorMesage.style.opacity = 1;
  }, 250);
}

if(loginFailed == "unauthorized") {
  displayMessage("Invalid or Expired Authorization. Please Login.", colors.WARNING);
} else if (loginFailed != undefined) {
  displayMessage("The Username or Password is incorrect. Please try again.", colors.ERROR);
}

document.getElementById("login").addEventListener("click", attemptLogin);
document.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    attemptLogin();
  }
});

function attemptLogin() {
  document.body.classList.add("waiting");
  errorMesage.style.opacity = 0;

  const username = document.getElementById('username');
  const password = document.getElementById('password');

  const usernameText = username.value.toString();
  const passwordText = password.value.toString();

  if (usernameText.length == 0 || passwordText.length == 0) {
    displayMessage("The Username or Password cannot be empty.", colors.WARNING);
    document.body.classList.remove("waiting");
    return;
  }

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username:usernameText, password:passwordText }),
  })
  .then((res) => res.json())
  .then((data) => {
    document.body.classList.remove("waiting");

    if (data.message === "failure") {
      displayMessage("The Username or Password is incorrect. Please try again.", colors.ERROR);
      username.value = "";
      password.value = "";
    } else  {
      displayMessage("Login success. Please Wait...", colors.SUCCESS);
      setTimeout(() => {
        location.href = data.message;
      }, 500);
    }
  })
  .catch((err) => console.error(err));
}
