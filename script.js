const STORAGE_KEY = "momentum-board-state-v2";

const columns = [
  {
    id: "todo",
    title: "To Do",
    copy: "Capture what matters before it slips away.",
  },
  {
    id: "progress",
    title: "In Progress",
    copy: "Keep active work visible and moving.",
  },
  {
    id: "done",
    title: "Done",
    copy: "Celebrate completed work and clear the deck.",
  },
];

const priorityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const boardEl = document.getElementById("board");
const quickStatsEl = document.getElementById("quickStats");
const searchInput = document.getElementById("searchInput");
const priorityFilter = document.getElementById("priorityFilter");
const sortBy = document.getElementById("sortBy");
const openComposerBtn = document.getElementById("openComposerBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const composerBackdrop = document.getElementById("composerBackdrop");
const closeComposerBtn = document.getElementById("closeComposerBtn");
const cancelComposerBtn = document.getElementById("cancelComposerBtn");
const taskForm = document.getElementById("taskForm");
const totalTasksEl = document.getElementById("totalTasks");
const completedTasksEl = document.getElementById("completedTasks");
const urgentTasksEl = document.getElementById("urgentTasks");
const columnTemplate = document.getElementById("columnTemplate");
const taskTemplate = document.getElementById("taskTemplate");

const state = {
  tasks: loadTasks(),
  filters: {
    search: "",
    priority: "all",
    sortBy: "manual",
  },
  draggedTaskId: null,
};

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn("Could not parse saved board state.", error);
    }
  }

  return [
    createTask({
      title: "Kick off homepage refresh",
      description: "Gather references, define sections, and align the visual mood before implementation.",
      status: "todo",
      priority: "high",
      dueDate: getRelativeDate(2),
      tags: ["design", "planning"],
    }),
    createTask({
      title: "Prepare sprint review notes",
      description: "Summarize wins, blockers, and next bets so the team can make fast decisions.",
      status: "progress",
      priority: "medium",
      dueDate: getRelativeDate(1),
      tags: ["meeting", "team"],
    }),
    createTask({
      title: "Ship reusable card component",
      description: "Refactor duplicate UI into a shared pattern and document the final variants.",
      status: "done",
      priority: "low",
      dueDate: getRelativeDate(-1),
      tags: ["frontend", "cleanup"],
    }),
  ];
}

function createTask({
  title,
  description = "",
  status = "todo",
  priority = "medium",
  dueDate = "",
  tags = [],
}) {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate,
    tags,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function renderBoard() {
  boardEl.innerHTML = "";

  columns.forEach((column) => {
    const fragment = columnTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".column");
    const title = fragment.querySelector(".column-title");
    const copy = fragment.querySelector(".column-copy");
    const count = fragment.querySelector(".column-count");
    const dropZone = fragment.querySelector(".drop-zone");

    section.dataset.status = column.id;
    title.textContent = column.title;
    copy.textContent = column.copy;

    const tasks = getVisibleTasks(column.id);
    count.textContent = `${tasks.length}`;

    if (!tasks.length) {
      dropZone.innerHTML =
        '<div class="empty-state">Nothing here yet. Add a task or move one into this lane.</div>';
    } else {
      tasks.forEach((task) => {
        dropZone.appendChild(renderTask(task));
      });
    }

    attachDropZoneEvents(dropZone, column.id);
    boardEl.appendChild(fragment);
  });

  renderQuickStats();
  renderHeroStats();
}

function renderTask(task) {
  const fragment = taskTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".task-card");
  const priorityPill = fragment.querySelector(".priority-pill");
  const title = fragment.querySelector(".task-title");
  const description = fragment.querySelector(".task-description");
  const dueChip = fragment.querySelector(".due-chip");
  const updatedChip = fragment.querySelector(".updated-chip");
  const tags = fragment.querySelector(".task-tags");
  const advanceBtn = fragment.querySelector('[data-action="advance"]');
  const editBtn = fragment.querySelector('[data-action="edit"]');
  const deleteBtn = fragment.querySelector(".task-delete");

  card.dataset.taskId = task.id;
  priorityPill.dataset.priority = task.priority;
  priorityPill.textContent = capitalize(task.priority);
  title.textContent = task.title;
  description.textContent = task.description || "No extra notes yet.";
  dueChip.textContent = formatDueDate(task.dueDate);
  updatedChip.textContent = `Updated ${formatRelativeDate(task.updatedAt)}`;

  if (isOverdue(task)) {
    dueChip.classList.add("is-overdue");
  }

  task.tags.forEach((tagText) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `#${tagText}`;
    tags.appendChild(tag);
  });

  if (!task.tags.length) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "#focus";
    tags.appendChild(tag);
  }

  advanceBtn.textContent = task.status === "done" ? "Move back" : "Advance";
  advanceBtn.addEventListener("click", () => advanceTask(task.id));
  editBtn.addEventListener("click", () => quickEditTask(task.id));
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  card.addEventListener("dragstart", () => {
    state.draggedTaskId = task.id;
    card.classList.add("is-dragging");
  });

  card.addEventListener("dragend", () => {
    state.draggedTaskId = null;
    card.classList.remove("is-dragging");
  });

  return fragment;
}

function getVisibleTasks(status) {
  const filtered = state.tasks.filter((task) => {
    if (task.status !== status) {
      return false;
    }

    if (
      state.filters.priority !== "all" &&
      task.priority !== state.filters.priority
    ) {
      return false;
    }

    if (!state.filters.search) {
      return true;
    }

    const searchTarget = [
      task.title,
      task.description,
      task.priority,
      task.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return searchTarget.includes(state.filters.search.toLowerCase());
  });

  return sortTasks(filtered, state.filters.sortBy);
}

function sortTasks(tasks, mode) {
  if (mode === "manual") {
    return [...tasks];
  }

  const sorted = [...tasks];

  if (mode === "priority") {
    return sorted.sort((first, second) => {
      return priorityRank[first.priority] - priorityRank[second.priority];
    });
  }

  if (mode === "recent") {
    return sorted.sort((first, second) => {
      return new Date(second.updatedAt) - new Date(first.updatedAt);
    });
  }

  if (mode === "dueSoon") {
    return sorted.sort((first, second) => {
      return compareDueDate(first.dueDate, second.dueDate);
    });
  }

  return sorted;
}

function compareDueDate(first, second) {
  if (!first && !second) {
    return 0;
  }

  if (!first) {
    return 1;
  }

  if (!second) {
    return -1;
  }

  return new Date(first) - new Date(second);
}

function attachDropZoneEvents(dropZone, status) {
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");

    if (!state.draggedTaskId) {
      return;
    }

    updateTask(state.draggedTaskId, {
      status,
    });
  });
}

function renderQuickStats() {
  const overdueCount = state.tasks.filter(isOverdue).length;
  const dueTodayCount = state.tasks.filter((task) => isDueToday(task.dueDate)).length;
  const backlogCount = state.tasks.filter((task) => task.status === "todo").length;
  const progressCount = state.tasks.filter((task) => task.status === "progress").length;

  quickStatsEl.innerHTML = "";

  [
    { label: "Overdue", value: overdueCount },
    { label: "Due today", value: dueTodayCount },
    { label: "Backlog", value: backlogCount },
    { label: "Active", value: progressCount },
  ].forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "quick-chip";
    chip.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    quickStatsEl.appendChild(chip);
  });
}

function renderHeroStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.status === "done").length;
  const urgent = state.tasks.filter((task) => ["critical", "high"].includes(task.priority)).length;

  totalTasksEl.textContent = `${total}`;
  completedTasksEl.textContent = `${done}`;
  urgentTasksEl.textContent = `${urgent}`;
}

function updateTask(taskId, updates) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });

  persistTasks();
  renderBoard();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  persistTasks();
  renderBoard();
}

function advanceTask(taskId) {
  const currentTask = state.tasks.find((task) => task.id === taskId);
  if (!currentTask) {
    return;
  }

  const nextStatus =
    currentTask.status === "todo"
      ? "progress"
      : currentTask.status === "progress"
        ? "done"
        : "todo";

  updateTask(taskId, { status: nextStatus });
}

function quickEditTask(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }

  const nextTitle = window.prompt("Update the task title", task.title);
  if (nextTitle === null) {
    return;
  }

  const nextDescription = window.prompt(
    "Update the task description",
    task.description,
  );
  if (nextDescription === null) {
    return;
  }

  updateTask(taskId, {
    title: nextTitle.trim() || task.title,
    description: nextDescription.trim(),
  });
}

function openComposer() {
  composerBackdrop.classList.remove("hidden");
  document.getElementById("taskTitle").focus();
}

function closeComposer() {
  composerBackdrop.classList.add("hidden");
  taskForm.reset();
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(taskForm);
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    return;
  }

  const task = createTask({
    title,
    description: String(formData.get("description") || ""),
    status: String(formData.get("status") || "todo"),
    priority: String(formData.get("priority") || "medium"),
    dueDate: String(formData.get("dueDate") || ""),
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  });

  state.tasks.unshift(task);
  persistTasks();
  renderBoard();
  closeComposer();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDueDate(dateText) {
  if (!dateText) {
    return "No due date";
  }

  const date = new Date(`${dateText}T00:00:00`);

  return `Due ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function formatRelativeDate(dateText) {
  const now = new Date();
  const date = new Date(dateText);
  const diffInHours = Math.max(1, Math.round((now - date) / (1000 * 60 * 60)));

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays}d ago`;
}

function getRelativeDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "done") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function isDueToday(dateText) {
  if (!dateText) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  return dateText === today;
}

searchInput.addEventListener("input", (event) => {
  state.filters.search = event.target.value.trim();
  renderBoard();
});

priorityFilter.addEventListener("change", (event) => {
  state.filters.priority = event.target.value;
  renderBoard();
});

sortBy.addEventListener("change", (event) => {
  state.filters.sortBy = event.target.value;
  renderBoard();
});

clearFiltersBtn.addEventListener("click", () => {
  state.filters = {
    search: "",
    priority: "all",
    sortBy: "manual",
  };

  searchInput.value = "";
  priorityFilter.value = "all";
  sortBy.value = "manual";
  renderBoard();
});

openComposerBtn.addEventListener("click", openComposer);
closeComposerBtn.addEventListener("click", closeComposer);
cancelComposerBtn.addEventListener("click", closeComposer);
taskForm.addEventListener("submit", handleSubmit);

composerBackdrop.addEventListener("click", (event) => {
  if (event.target === composerBackdrop) {
    closeComposer();
  }
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openComposer();
  }

  if (event.key === "Escape" && !composerBackdrop.classList.contains("hidden")) {
    closeComposer();
  }
});

renderBoard();
