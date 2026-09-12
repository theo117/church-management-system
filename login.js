import { saveToken } from "./js/auth.js";
import { requestLogin } from "./js/api.js";
import { enhanceForm, validateForm } from "./js/forms.js";
import { setFormBusy, getRequestErrorMessage } from "./js/feedback.js";

const loginForm = document.getElementById("loginForm");
enhanceForm(loginForm);
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    loginForm.getAttribute("aria-busy") === "true" ||
    !validateForm(loginForm)
  )
    return;
  const errorText = document.getElementById("loginError");
  errorText.textContent = "";
  const credentials = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };
  setFormBusy(loginForm, true);
  try {
    const session = await requestLogin(credentials);
    if (!session || typeof session.token !== "string" || !session.token)
      throw new Error("Invalid login response");
    saveToken(session.token);
    window.location.href = "index.html";
  } catch (error) {
    errorText.textContent = ["HTTP 400", "HTTP 401", "HTTP 403"].includes(
      error.message,
    )
      ? "Invalid email or password."
      : getRequestErrorMessage(error);
  } finally {
    setFormBusy(loginForm, false);
  }
});
