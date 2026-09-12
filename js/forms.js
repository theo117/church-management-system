import { saveRecord, deleteRecord } from "./api.js";
import {
  showToast,
  getRequestErrorMessage,
  setFormFeedback,
  setFormBusy,
} from "./feedback.js";

export function clearInputValidation(form) {
  form.querySelectorAll("input,select,textarea").forEach((input) => {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    const error = document.getElementById(`${input.id}Error`);
    if (error) error.textContent = "";
  });
}

export function resetRecordForm(formId, recordIdInputId) {
  const form = document.getElementById(formId);
  form.reset();
  document.getElementById(recordIdInputId).value = "";
  clearInputValidation(form);
  setFormFeedback(form, "");
  return form;
}

export function enhanceForm(form) {
  form.noValidate = true;
  form
    .querySelectorAll("input:not([type=hidden]),select,textarea")
    .forEach((input) => {
      if (!input.labels?.length && !input.hasAttribute("aria-label")) {
        input.setAttribute(
          "aria-label",
          input.placeholder || input.name || input.id,
        );
      }
      if (input.id && !document.getElementById(`${input.id}Error`)) {
        const error = document.createElement("span");
        error.id = `${input.id}Error`;
        error.className = "sr-only";
        input.after(error);
        input.setAttribute(
          "aria-describedby",
          [input.getAttribute("aria-describedby"), error.id]
            .filter(Boolean)
            .join(" "),
        );
      }
    });
  form.addEventListener("input", () => clearInputValidation(form));
}

export function reportFormValidity(form) {
  const invalid = [...form.querySelectorAll("input,select,textarea")].filter(
    (input) => !input.disabled && !input.validity.valid,
  );
  invalid.forEach((input) => {
    input.setAttribute("aria-invalid", "true");
    const error = document.getElementById(`${input.id}Error`);
    if (error) error.textContent = input.validationMessage;
  });
  if (invalid.length) {
    setFormFeedback(
      form,
      `Please check ${invalid.length === 1 ? "the highlighted field" : "the highlighted fields"} before saving.`,
      "error",
    );
    form.reportValidity();
    invalid[0].focus();
    return false;
  }
  return true;
}

export function validateForm(form) {
  clearInputValidation(form);
  form.querySelectorAll("input,select,textarea").forEach((input) => {
    if (input.disabled || input.type === "hidden") return;
    if (input.required && !input.value.trim())
      input.setCustomValidity("Please enter a value.");
    if (
      input.type === "number" &&
      input.value &&
      !Number.isFinite(Number(input.value))
    )
      input.setCustomValidity("Enter a valid number.");
    if (input.maxLength > 0 && input.value.length > input.maxLength)
      input.setCustomValidity(`Use ${input.maxLength} characters or fewer.`);
  });
  return reportFormValidity(form);
}

export function setupRecordForm({
  formId,
  recordIdInputId,
  cancelButtonId,
  endpoint,
  readPayload,
  refreshData,
  recordLabel,
}) {
  const form = document.getElementById(formId);
  enhanceForm(form);
  const resetForm = () => resetRecordForm(formId, recordIdInputId);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.getAttribute("aria-busy") === "true" || !validateForm(form))
      return;
    const recordId = document.getElementById(recordIdInputId).value;
    const payload = readPayload();
    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === "string") payload[key] = payload[key].trim();
    });
    setFormBusy(form, true);
    setFormFeedback(form, `Saving ${recordLabel.toLowerCase()}...`);
    let saved = false;
    try {
      await saveRecord(endpoint, recordId, payload);
      saved = true;
      resetForm();
      const result = await refreshData();
      const message = `${recordLabel} ${recordId ? "updated" : "created"}.`;
      if (
        result?.failedKeys?.includes(
          endpoint.split("/").at(-1) === "communications"
            ? "communication"
            : endpoint.split("/").at(-1),
        )
      ) {
        setFormFeedback(
          form,
          `${message} The list could not be refreshed. Use Sync Now to retry.`,
          "error",
        );
        showToast(
          `${message} Refresh the list to see the latest data.`,
          "warning",
        );
      } else {
        setFormFeedback(form, message, "success");
        showToast(message);
      }
    } catch (error) {
      const message = saved
        ? `${recordLabel} saved, but the list could not be refreshed. Please sync again.`
        : `Could not save ${recordLabel.toLowerCase()}. ${getRequestErrorMessage(error)}`;
      setFormFeedback(form, message, "error");
      showToast(message, saved ? "warning" : "error");
    } finally {
      setFormBusy(form, false);
      if (!saved) form.querySelector('[type="submit"]')?.focus();
      if (saved)
        form.querySelector("input:not([type=hidden]),select,textarea")?.focus();
    }
  });
  document.getElementById(cancelButtonId).addEventListener("click", () => {
    if (form.getAttribute("aria-busy") === "true") return;
    resetForm();
    form.querySelector("input:not([type=hidden]),select,textarea")?.focus();
  });
}

export async function deleteRecordWithFeedback({
  endpoint,
  recordId,
  formId,
  recordLabel,
  refreshData,
}) {
  const form = document.getElementById(formId);
  if (form.getAttribute("aria-busy") === "true") return;
  setFormBusy(form, true);
  setFormFeedback(form, `Deleting ${recordLabel.toLowerCase()}...`);
  let deleted = false;
  try {
    await deleteRecord(endpoint, recordId);
    deleted = true;
    const idInput = form.querySelector('input[type="hidden"]');
    if (idInput.value === recordId) resetRecordForm(formId, idInput.id);
    const result = await refreshData();
    const message = `${recordLabel} deleted.`;
    if (result?.failedKeys?.length) {
      setFormFeedback(
        form,
        `${message} Some information could not be refreshed. Use Sync Now to retry.`,
        "error",
      );
      showToast(
        `${message} Some information could not be refreshed.`,
        "warning",
      );
    } else {
      setFormFeedback(form, message, "success");
      showToast(message);
    }
  } catch (error) {
    const message = deleted
      ? `${recordLabel} deleted, but the list could not be refreshed.`
      : `Could not delete ${recordLabel.toLowerCase()}. ${getRequestErrorMessage(error)}`;
    setFormFeedback(form, message, "error");
    showToast(message, deleted ? "warning" : "error");
  } finally {
    setFormBusy(form, false);
    if (deleted)
      form.querySelector("input:not([type=hidden]),select,textarea")?.focus();
  }
}
