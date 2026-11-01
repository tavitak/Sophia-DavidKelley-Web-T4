/* Twin Cities Animal Rescue: interactivity and client-side data
   1. Volunteer role tracker on services.html (saved in localStorage)
   2. Interest form validation and role pre-fill on contact.html
   3. Director message on index.html: the audio player controls the video so they start together
*/

/* ---------- Data ---------- */

// Array of objects: one object per volunteer role.
const VOLUNTEER_ROLES = [
  { id: "animal-care", title: "Animal Care Volunteer", commitment: "Shifts of about two hours at the care center" },
  { id: "cat-socializer", title: "Cat Socializer", commitment: "Quiet one-on-one time with shy cats" },
  { id: "adoption-event", title: "Adoption Event Volunteer", commitment: "Weekend adoption events" },
  { id: "transport", title: "Transport Volunteer", commitment: "Driving animals; a valid driver's license is required" }
];

// Object: the localStorage key used by every page.
const STORAGE_KEYS = {
  selectedRoles: "tcar-selected-roles"
};

// Object: validation rules and error messages for the interest form.
const FORM_RULES = {
  nameMinLength: 2,
  messageMinLength: 10,
  messageMaxLength: 500,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  messages: {
    nameMissing: "Please enter your full name.",
    nameTooShort: "Your name needs at least 2 characters.",
    emailMissing: "Please enter your email address.",
    emailFormat: "Enter an email address in the format name@example.com.",
    interestMissing: "Choose volunteering, fostering, or adoption information.",
    rolesMissing: "Pick at least one volunteer role, or choose a different interest type.",
    experienceMissing: "Choose the option that best describes your experience with pets.",
    messageMissing: "Please write a short message so our team knows how to help.",
    messageTooShort: "Your message needs at least 10 characters.",
    messageTooLong: "Your message can be no more than 500 characters."
  }
};

/* ---------- Storage helpers ---------- */

function loadSelectedRoles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.selectedRoles));
    if (!Array.isArray(saved)) {
      return [];
    }
    // Keep only ids that match a real role.
    return saved.filter((id) => VOLUNTEER_ROLES.some((role) => role.id === id));
  } catch (error) {
    return [];
  }
}

function saveSelectedRoles(roleIds) {
  try {
    localStorage.setItem(STORAGE_KEYS.selectedRoles, JSON.stringify(roleIds));
  } catch (error) {
    // Storage can be unavailable in some private browsing modes. The page still works without it.
  }
}

function findRole(roleId) {
  return VOLUNTEER_ROLES.find((role) => role.id === roleId);
}

/* ---------- 1. Volunteer role tracker (services.html) ---------- */

function initRoleTracker() {
  const tracker = document.getElementById("interest-tracker");
  const roleCards = document.querySelectorAll(".role[data-role-id]");
  if (!tracker || roleCards.length === 0) {
    return;
  }

  roleCards.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "role-toggle";
    button.dataset.roleId = card.dataset.roleId;
    button.textContent = "I'm interested";
    // Link the button to the role title so screen readers announce which role it belongs to.
    const heading = card.querySelector("h3");
    heading.id = "role-title-" + card.dataset.roleId;
    button.setAttribute("aria-describedby", heading.id);
    button.addEventListener("click", () => toggleRole(card.dataset.roleId));
    card.appendChild(button);
  });

  document.getElementById("tracker-clear").addEventListener("click", clearRoles);
  tracker.hidden = false;
  renderRoleTracker();
}

function toggleRole(roleId) {
  const selected = loadSelectedRoles();
  const updated = selected.includes(roleId)
    ? selected.filter((id) => id !== roleId)
    : selected.concat(roleId);
  saveSelectedRoles(updated);
  renderRoleTracker();
}

function clearRoles() {
  saveSelectedRoles([]);
  renderRoleTracker();
}

function renderRoleTracker() {
  const selected = loadSelectedRoles();
  updateRoleButtons(selected);
  updateTrackerList(selected);
  updateTrackerStatus(selected);
}

function updateRoleButtons(selected) {
  document.querySelectorAll(".role-toggle").forEach((button) => {
    const isSelected = selected.includes(button.dataset.roleId);
    // aria-pressed tells screen readers whether the toggle is on; CSS adds a check mark when it is.
    button.setAttribute("aria-pressed", String(isSelected));
    button.closest(".role").classList.toggle("is-selected", isSelected);
  });
}

function updateTrackerList(selected) {
  const list = document.getElementById("tracker-list");
  list.innerHTML = "";
  selected.forEach((roleId) => {
    const role = findRole(roleId);
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = role.title;
    item.appendChild(title);
    item.append(": " + role.commitment);
    list.appendChild(item);
  });
}

function updateTrackerStatus(selected) {
  const status = document.getElementById("tracker-status");
  const continueLink = document.getElementById("tracker-continue");
  const clearButton = document.getElementById("tracker-clear");
  const count = selected.length;

  if (count === 0) {
    status.textContent = "You have not picked any roles yet. Use the I'm interested buttons above to build your list.";
  } else {
    status.textContent = "You picked " + count + " of " + VOLUNTEER_ROLES.length + " roles. Your list is saved on this device and will be filled in on the interest form.";
  }
  continueLink.hidden = count === 0;
  clearButton.hidden = count === 0;
}

/* ---------- 2. Interest form (contact.html) ---------- */

function initInterestForm() {
  const form = document.getElementById("interest-form");
  if (!form) {
    return;
  }

  // JavaScript now shows its own messages, so turn off the browser's pop-up bubbles.
  // The HTML required and type attributes stay in place as a backup if JavaScript is off.
  form.noValidate = true;

  prefillRoles(form);
  addCharacterCounter(form);

  form.addEventListener("submit", (event) => handleSubmit(event, form));
  form.addEventListener("input", (event) => recheckField(event, form));
  form.addEventListener("change", (event) => {
    recheckField(event, form);
    if (event.target.name === "roles[]") {
      saveRolesFromForm(form);
    }
  });
}

function prefillRoles(form) {
  const selected = loadSelectedRoles();
  if (selected.length === 0) {
    return;
  }

  selected.forEach((roleId) => {
    const checkbox = form.querySelector('input[name="roles[]"][value="' + roleId + '"]');
    if (checkbox) {
      checkbox.checked = true;
    }
  });
  document.getElementById("interest-volunteer").checked = true;

  const note = document.getElementById("prefill-note");
  const titles = selected.map((roleId) => findRole(roleId).title);
  note.textContent = "We filled in the volunteer roles you picked on the Services page: " + titles.join(", ") + ". You can change them below.";
  note.hidden = false;
}

function saveRolesFromForm(form) {
  const checked = Array.from(form.querySelectorAll('input[name="roles[]"]:checked')).map((box) => box.value);
  saveSelectedRoles(checked);
}

function addCharacterCounter(form) {
  const message = form.querySelector("#message");
  const counter = document.createElement("p");
  counter.className = "char-count";
  counter.id = "message-count";
  message.insertAdjacentElement("afterend", counter);
  message.setAttribute("aria-describedby", "message-count");

  const update = () => {
    counter.textContent = message.value.trim().length + " of " + FORM_RULES.messageMaxLength + " characters";
  };
  message.addEventListener("input", update);
  update();
}

// Each check returns an error message, or an empty string when the field is valid.
function checkName(form) {
  const value = form.querySelector("#full-name").value.trim();
  if (value === "") {
    return FORM_RULES.messages.nameMissing;
  }
  if (value.length < FORM_RULES.nameMinLength) {
    return FORM_RULES.messages.nameTooShort;
  }
  return "";
}

function checkEmail(form) {
  const value = form.querySelector("#email").value.trim();
  if (value === "") {
    return FORM_RULES.messages.emailMissing;
  }
  if (!FORM_RULES.emailPattern.test(value)) {
    return FORM_RULES.messages.emailFormat;
  }
  return "";
}

function checkInterest(form) {
  return form.querySelector('input[name="interest"]:checked') ? "" : FORM_RULES.messages.interestMissing;
}

function checkRoles(form) {
  const volunteering = form.querySelector("#interest-volunteer").checked;
  const anyRole = form.querySelector('input[name="roles[]"]:checked');
  return volunteering && !anyRole ? FORM_RULES.messages.rolesMissing : "";
}

function checkExperience(form) {
  return form.querySelector("#experience").value === "" ? FORM_RULES.messages.experienceMissing : "";
}

function checkMessage(form) {
  const length = form.querySelector("#message").value.trim().length;
  if (length === 0) {
    return FORM_RULES.messages.messageMissing;
  }
  if (length < FORM_RULES.messageMinLength) {
    return FORM_RULES.messages.messageTooShort + " You have entered " + length + ".";
  }
  if (length > FORM_RULES.messageMaxLength) {
    return FORM_RULES.messages.messageTooLong;
  }
  return "";
}

// Array of objects: which check belongs to which field, and where its message appears.
const FORM_CHECKS = [
  { key: "name", check: checkName, target: "#full-name" },
  { key: "email", check: checkEmail, target: "#email" },
  { key: "interest", check: checkInterest, target: "#interest-volunteer", group: true },
  { key: "roles", check: checkRoles, target: "#roles-fieldset", group: true },
  { key: "experience", check: checkExperience, target: "#experience" },
  { key: "message", check: checkMessage, target: "#message" }
];

function showError(form, item, message) {
  const field = form.querySelector(item.target);
  const container = item.group ? field.closest("fieldset") : field.closest("p");
  const errorId = item.key + "-error";
  let error = document.getElementById(errorId);

  if (!error) {
    error = document.createElement("p");
    error.className = "field-error";
    error.id = errorId;
    container.appendChild(error);
  }

  error.textContent = message;
  error.hidden = message === "";

  const inputs = item.group
    ? container.querySelectorAll("input")
    : [field];
  inputs.forEach((input) => {
    if (message) {
      input.setAttribute("aria-invalid", "true");
      addDescribedBy(input, errorId);
    } else {
      input.removeAttribute("aria-invalid");
      removeDescribedBy(input, errorId);
    }
  });
}

function addDescribedBy(input, id) {
  const ids = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
  if (!ids.includes(id)) {
    ids.push(id);
  }
  input.setAttribute("aria-describedby", ids.join(" "));
}

function removeDescribedBy(input, id) {
  const ids = (input.getAttribute("aria-describedby") || "").split(" ").filter((x) => x && x !== id);
  if (ids.length) {
    input.setAttribute("aria-describedby", ids.join(" "));
  } else {
    input.removeAttribute("aria-describedby");
  }
}

function validateForm(form) {
  let firstInvalid = null;
  FORM_CHECKS.forEach((item) => {
    const message = item.check(form);
    showError(form, item, message);
    if (message && !firstInvalid) {
      firstInvalid = form.querySelector(item.target);
    }
  });
  return firstInvalid;
}

// After a failed submit, update a field's message as soon as the user fixes it.
function recheckField(event, form) {
  if (!form.dataset.submitted) {
    return;
  }
  const changed = event.target;
  FORM_CHECKS.forEach((item) => {
    const target = form.querySelector(item.target);
    const related = item.group
      ? target.closest("fieldset").contains(changed) || changed.name === "interest"
      : target === changed;
    if (related) {
      showError(form, item, item.check(form));
    }
  });
}

function handleSubmit(event, form) {
  event.preventDefault();
  form.dataset.submitted = "true";
  const status = document.getElementById("form-status");
  const firstInvalid = validateForm(form);

  if (firstInvalid) {
    status.hidden = true;
    const focusTarget = firstInvalid.matches("fieldset") ? firstInvalid.querySelector("input") : firstInvalid;
    focusTarget.focus();
    return;
  }

  showSuccess(form, status);
}

function showSuccess(form, status) {
  const name = form.querySelector("#full-name").value.trim();
  const interest = form.querySelector('input[name="interest"]:checked');
  const interestText = form.querySelector('label[for="' + interest.id + '"]').textContent.toLowerCase();
  const roles = Array.from(form.querySelectorAll('input[name="roles[]"]:checked')).map((box) => findRole(box.value).title);

  let text = "Thank you, " + name + ". We received your interest in " + interestText;
  if (interest.value === "volunteer" && roles.length) {
    text += " for these roles: " + roles.join(", ");
  }
  text += ". A member of our team will contact you within two business days.";

  status.textContent = text;
  status.hidden = false;
  status.focus();
}

/* ---------- 3. Director message (index.html) ---------- */

function initDirectorMessage() {
  const video = document.getElementById("director-video");
  const audio = document.getElementById("director-audio");
  if (!video || !audio) {
    return;
  }

  // The audio player controls both files. Browsers always allow a direct click on
  // the audio player to start sound, and always allow a muted video to play, so
  // letting the audio lead keeps them starting together in every browser.
  video.controls = false;
  video.classList.add("is-linked");
  video.setAttribute("aria-hidden", "true");

  document.getElementById("media-note").textContent =
    "Press play on the audio player below to hear our director's message. The video plays along with it.";

  audio.addEventListener("play", () => syncVideoToAudio(video, audio, true));
  audio.addEventListener("pause", () => video.pause());
  audio.addEventListener("ended", () => video.pause());
  audio.addEventListener("seeked", () => syncVideoToAudio(video, audio, !audio.paused));

  // Clicking the picture also starts or pauses the message.
  video.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch((error) => console.warn("The audio could not start:", error.name));
    } else {
      audio.pause();
    }
  });
}

function syncVideoToAudio(video, audio, shouldPlay) {
  if (!Number.isNaN(video.duration)) {
    video.currentTime = Math.min(audio.currentTime, video.duration);
  }
  if (shouldPlay) {
    video.play().catch((error) => console.warn("The video could not start:", error.name));
  }
}

/* ---------- Start ---------- */

initRoleTracker();
initInterestForm();
initDirectorMessage();
