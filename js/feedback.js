const busyForms = new WeakMap();

export function showToast(message, type = "success") {
  let region = document.getElementById("toastRegion");
  if (!region) {
    region = document.createElement("div");
    region.id = "toastRegion";
    region.className = "toast-region";
    region.setAttribute("aria-label", "Notifications");
    document.body.append(region);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const text = document.createElement("p");
  text.setAttribute("role", type === "error" ? "alert" : "status");
  text.textContent = message;
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "toast-dismiss";
  dismiss.setAttribute("aria-label", "Dismiss notification");
  dismiss.textContent = "×";
  const remove = () => {
    if (toast.contains(document.activeElement))
      document.getElementById("viewTitle")?.focus();
    toast.remove();
  };
  dismiss.addEventListener("click", remove);
  toast.append(text, dismiss);
  region.append(toast);
  // Errors remain until dismissed. Success notices stay while being read/focused.
  if (type === "success") {
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!toast.contains(document.activeElement) && !toast.matches(":hover"))
          remove();
      }, 6000);
    };
    toast.addEventListener("mouseenter", () => clearTimeout(timer));
    toast.addEventListener("focusin", () => clearTimeout(timer));
    toast.addEventListener("mouseleave", schedule);
    toast.addEventListener("focusout", schedule);
    schedule();
  }
}

export function getRequestErrorMessage(error) {
  if (error.name === "AbortError")
    return "The request timed out. Please try again.";
  if (error.message === "Session expired" || error.message === "HTTP 401")
    return "Your session expired. Please sign in again.";
  if (error.message === "HTTP 403")
    return "You do not have permission to perform this action.";
  if (error.message === "HTTP 404")
    return "This record is no longer available. Refresh the list and try again.";
  if (error.message === "HTTP 409")
    return "This record conflicts with an existing record. Check the details and try again.";
  if (["HTTP 400", "HTTP 422"].includes(error.message))
    return "The server could not accept these details. Check the fields and try again.";
  return "We could not complete the request. Check your connection and try again.";
}

export function setFormFeedback(form, message, type = "status") {
  let feedback = document.getElementById(`${form.id}Feedback`);
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.id = `${form.id}Feedback`;
    feedback.className = "form-feedback";
    feedback.setAttribute("aria-live", "polite");
    form.after(feedback);
  }
  feedback.textContent = message;
  feedback.hidden = !message;
  feedback.dataset.state = type;
  feedback.setAttribute("role", type === "error" ? "alert" : "status");
}

export function setFormBusy(form, busy) {
  form.setAttribute("aria-busy", String(busy));
  if (busy && !busyForms.has(form)) {
    const controls = [
      ...form.querySelectorAll("input, select, textarea, button"),
    ];
    busyForms.set(
      form,
      controls.map((control) => [control, control.disabled]),
    );
    controls.forEach((control) => {
      control.disabled = true;
    });
  } else if (!busy && busyForms.has(form)) {
    busyForms.get(form).forEach(([control, disabled]) => {
      control.disabled = disabled;
    });
    busyForms.delete(form);
  }
  form.querySelector('[type="submit"]')?.classList.toggle("is-loading", busy);
  // Refreshes replace row buttons, so derive their state from the current form.
  form
    .closest(".content-view")
    ?.querySelectorAll("button[data-action]")
    .forEach((button) => {
      button.disabled = busy || !button.dataset.id;
    });
}
