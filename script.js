
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const submitBtn = document.querySelector("#submit-btn");
const cancelBtn = document.querySelector("#cancel-edit");
const heading = document.querySelector("#form-heading");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const totalCount = document.querySelector("#total-count");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const clearCompletedBtn = document.querySelector("#clear-completed");
const filterButtons = document.querySelectorAll(".filter");
const statusMessage = document.querySelector("#status-message");

const STORAGE_KEY = "taskflow-tasks";

let tasks = [];
let currentFilter = "all";
let editingId = null;

document.querySelector("#today-date").textContent =
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date());

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (Array.isArray(saved)) {
    tasks = saved.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    );
  }
} catch (error) {
  console.error("Unable to load tasks:", error);
  statusMessage.textContent = "Saved tasks could not be loaded.";
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Unable to save tasks:", error);
    statusMessage.textContent =
      "Saving failed. Check browser storage settings.";
    return false;
  }
}

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resetEditor() {
  editingId = null;
  input.value = "";
  submitBtn.textContent = "+ Add Task";
  heading.textContent = "Add a new task";
  cancelBtn.classList.add("hidden");
}

function startEditing(task) {
  editingId = task.id;
  input.value = task.text;
  submitBtn.textContent = "Save Changes";
  heading.textContent = "Edit your task";
  cancelBtn.classList.remove("hidden");
  input.focus();
  input.select();
}

function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  if (visibleTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";

    empty.textContent = currentFilter === "active"
      ? "You're all caught up. No active tasks!"
      : currentFilter === "completed"
        ? "No completed tasks yet."
        : "No tasks yet. Add your first task above!";

    taskList.appendChild(empty);
  }

  visibleTasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task";
    li.dataset.id = task.id;

    if (task.completed) li.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.text} as ${task.completed ? "active" : "completed"}`
    );

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.dataset.action = "edit";
    edit.setAttribute("aria-label", `Edit ${task.text}`);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "delete";
    remove.dataset.action = "delete";
    remove.setAttribute("aria-label", `Delete ${task.text}`);

    actions.append(edit, remove);
    li.append(checkbox, text, actions);
    taskList.appendChild(li);
  });

  const completed = tasks.filter(task => task.completed).length;
  const active = tasks.length - completed;

  totalCount.textContent = tasks.length;
  activeCount.textContent = active;
  completedCount.textContent = completed;
  taskCount.textContent = `${active} task${active === 1 ? "" : "s"} left`;

  filterButtons.forEach(button => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const text = input.value.trim();

  if (!text) {
    statusMessage.textContent = "Please enter a task first.";
    input.focus();
    return;
  }

  if (editingId !== null) {
    const task = tasks.find(item => item.id === editingId);

    if (!task) {
      resetEditor();
      renderTasks();
      return;
    }

    task.text = text;
    statusMessage.textContent = "Task updated.";
  } else {
    tasks.unshift({
      id: createId(),
      text,
      completed: false
    });

    statusMessage.textContent = "Task added successfully.";
  }

  const saved = saveTasks();
  resetEditor();
  renderTasks();

  if (!saved) {
    statusMessage.textContent += " It may not persist after refresh.";
  }

  input.focus();
});

// Event delegation: one click listener handles all task buttons.
taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button || !taskList.contains(button)) return;

  const li = button.closest(".task");
  if (!li) return;

  const id = li.dataset.id;
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (button.dataset.action === "edit") {
    startEditing(task);
    return;
  }

  if (button.dataset.action === "delete") {
    tasks = tasks.filter(item => item.id !== id);

    if (editingId === id) resetEditor();

    saveTasks();
    renderTasks();
    statusMessage.textContent = "Task deleted.";
  }
});

// Event delegation for task completion.
taskList.addEventListener("change", event => {
  if (event.target.dataset.action !== "toggle") return;

  const li = event.target.closest(".task");
  if (!li) return;

  const task = tasks.find(item => item.id === li.dataset.id);
  if (!task) return;

  task.completed = event.target.checked;
  saveTasks();
  renderTasks();

  statusMessage.textContent = task.completed
    ? "Task marked as completed."
    : "Task marked as active.";
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

cancelBtn.addEventListener("click", () => {
  resetEditor();
  statusMessage.textContent = "Editing cancelled.";
  input.focus();
});

clearCompletedBtn.addEventListener("click", () => {
  const before = tasks.length;
  tasks = tasks.filter(task => !task.completed);

  if (editingId !== null && !tasks.some(task => task.id === editingId)) {
    resetEditor();
  }

  if (tasks.length === before) {
    statusMessage.textContent = "There are no completed tasks to clear.";
    return;
  }

  saveTasks();
  renderTasks();
  statusMessage.textContent = "Completed tasks cleared.";
});

renderTasks();
