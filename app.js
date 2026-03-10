const STORAGE_KEY = "momentum-calendar-v1";

const state = {
  monthCursor: new Date(),
  selectedDate: toDateKey(new Date()),
  tasks: [],
};

const refs = {
  monthLabel: document.getElementById("monthLabel"),
  calendarGrid: document.getElementById("calendarGrid"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  dayTaskList: document.getElementById("dayTaskList"),
  backlogList: document.getElementById("backlogList"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskPriority: document.getElementById("taskPriority"),
  taskMode: document.getElementById("taskMode"),
  taskRecurrence: document.getElementById("taskRecurrence"),
  taskCustomDays: document.getElementById("taskCustomDays"),
  customDaysWrap: document.getElementById("customDaysWrap"),
  template: document.getElementById("taskItemTemplate"),
};

init();

function init() {
  loadState();
  renderWeekdays();
  bindEvents();
  renderAll();
}

function bindEvents() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    state.monthCursor.setMonth(state.monthCursor.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    state.monthCursor.setMonth(state.monthCursor.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById("quickToday").addEventListener("click", () => {
    const today = new Date();
    state.monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDate = toDateKey(today);
    renderAll();
  });

  refs.taskRecurrence.addEventListener("change", () => {
    refs.customDaysWrap.classList.toggle("hidden", refs.taskRecurrence.value !== "custom");
  });

  refs.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const task = {
      id: crypto.randomUUID(),
      title: refs.taskTitle.value.trim(),
      priority: refs.taskPriority.value,
      bucket: refs.taskMode.value,
      done: false,
      recurrence: buildRecurrence(),
      assignedDate: refs.taskMode.value === "day" ? state.selectedDate : null,
      createdAt: Date.now(),
      completedAt: null,
    };

    if (!task.title) return;

    state.tasks.push(task);
    persist();
    refs.taskForm.reset();
    refs.customDaysWrap.classList.add("hidden");
    renderAll();
  });
}

function buildRecurrence() {
  const value = refs.taskRecurrence.value;
  if (value === "none") return null;
  if (value === "custom") return { type: "custom", everyDays: Number(refs.taskCustomDays.value) || 7 };
  return { type: value };
}

function renderAll() {
  applyRecurrenceResets();
  renderCalendar();
  renderSelectedDay();
  renderBacklog();
}

function renderWeekdays() {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const row = document.getElementById("weekdayRow");
  row.innerHTML = weekdays.map((w) => `<div>${w}</div>`).join("");
}

function renderCalendar() {
  const year = state.monthCursor.getFullYear();
  const month = state.monthCursor.getMonth();
  refs.monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  refs.calendarGrid.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    refs.calendarGrid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const { progress, tone } = getDayProgress(dateKey);

    const cell = document.createElement("button");
    cell.className = `day-cell ${dateKey === state.selectedDate ? "active" : ""}`;
    cell.innerHTML = `
      <span class="day-number">${day}</span>
      <div class="day-progress"><div class="day-progress-fill" style="width:${progress * 100}%;background:${tone}"></div></div>
    `;
    cell.style.background = getBackgroundByProgress(progress);
    cell.addEventListener("click", () => {
      state.selectedDate = dateKey;
      renderAll();
    });
    refs.calendarGrid.appendChild(cell);
  }
}

function renderSelectedDay() {
  const date = fromDateKey(state.selectedDate);
  refs.selectedDateLabel.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const dayTasks = state.tasks
    .filter((task) => task.assignedDate === state.selectedDate)
    .sort(compareUrgency);

  refs.dayTaskList.innerHTML = "";
  if (dayTasks.length === 0) {
    refs.dayTaskList.innerHTML = "<li>No tasks for this day yet.</li>";
    return;
  }

  dayTasks.forEach((task) => refs.dayTaskList.appendChild(renderTaskItem(task, false)));
}

function renderBacklog() {
  const backlogTasks = state.tasks
    .filter((task) => task.bucket === "backlog" && !task.assignedDate)
    .sort(compareUrgency);

  refs.backlogList.innerHTML = "";
  if (backlogTasks.length === 0) {
    refs.backlogList.innerHTML = "<li>No backlog tasks.</li>";
    return;
  }

  backlogTasks.forEach((task) => refs.backlogList.appendChild(renderTaskItem(task, true)));
}

function renderTaskItem(task, isBacklog) {
  const node = refs.template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  if (task.done) node.classList.add("done");

  const checkbox = node.querySelector(".task-checkbox");
  const title = node.querySelector(".task-title");
  const meta = node.querySelector(".task-meta");
  const moveBtn = node.querySelector(".move-btn");
  const editBtn = node.querySelector(".edit-btn");
  const deleteBtn = node.querySelector(".delete-btn");

  checkbox.checked = task.done;
  title.textContent = task.title;
  meta.textContent = describeTask(task);

  checkbox.addEventListener("change", () => {
    task.done = checkbox.checked;
    task.completedAt = task.done ? Date.now() : null;
    if (task.done && task.recurrence && task.assignedDate) {
      task.nextResetAt = calculateNextReset(task.completedAt, task.recurrence);
    }
    persist();
    renderAll();
  });

  moveBtn.textContent = isBacklog ? "Plan Day" : "To Backlog";
  moveBtn.addEventListener("click", () => {
    if (isBacklog) {
      task.assignedDate = state.selectedDate;
      task.bucket = "day";
    } else {
      task.assignedDate = null;
      task.bucket = "backlog";
    }
    persist();
    renderAll();
  });

  editBtn.addEventListener("click", () => {
    const newTitle = window.prompt("Edit task name", task.title);
    if (newTitle === null) return;
    task.title = newTitle.trim() || task.title;

    const dateInput = window.prompt(
      "Reschedule date (YYYY-MM-DD). Leave empty for backlog.",
      task.assignedDate || ""
    );

    if (dateInput !== null) {
      if (dateInput.trim()) {
        task.assignedDate = dateInput.trim();
        task.bucket = "day";
      } else {
        task.assignedDate = null;
        task.bucket = "backlog";
      }
    }

    persist();
    renderAll();
  });

  deleteBtn.addEventListener("click", () => {
    if (!window.confirm("Delete this task?")) return;
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
    persist();
    renderAll();
  });

  return node;
}

function compareUrgency(a, b) {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  if (priorityRank[a.priority] !== priorityRank[b.priority]) {
    return priorityRank[a.priority] - priorityRank[b.priority];
  }
  if (a.done !== b.done) {
    return a.done ? 1 : -1;
  }
  return a.createdAt - b.createdAt;
}

function describeTask(task) {
  const recurrenceText = task.recurrence
    ? task.recurrence.type === "custom"
      ? `Repeats every ${task.recurrence.everyDays} days after completion`
      : `Repeats ${task.recurrence.type} after completion`
    : "One-off";

  return `${task.priority.toUpperCase()} • ${recurrenceText}${task.done ? " • completed" : ""}`;
}

function applyRecurrenceResets() {
  const now = Date.now();
  let touched = false;

  state.tasks.forEach((task) => {
    if (task.done && task.nextResetAt && now >= task.nextResetAt) {
      task.done = false;
      task.completedAt = null;
      task.nextResetAt = null;
      if (task.assignedDate) {
        task.assignedDate = toDateKey(new Date(now));
      }
      touched = true;
    }
  });

  if (touched) persist();
}

function getDayProgress(dateKey) {
  const tasks = state.tasks.filter((task) => task.assignedDate === dateKey);
  if (tasks.length === 0) return { progress: 0, tone: "#d1d5db" };
  const complete = tasks.filter((task) => task.done).length;
  const progress = complete / tasks.length;
  const tone = progress >= 1 ? "#22c55e" : progress >= 0.5 ? "#facc15" : "#ef4444";
  return { progress, tone };
}

function getBackgroundByProgress(progress) {
  if (progress >= 1) return "#dcfce7";
  if (progress >= 0.5) return "#fef9c3";
  if (progress > 0) return "#fee2e2";
  return "#ffffff";
}

function calculateNextReset(completedAt, recurrence) {
  const completed = new Date(completedAt);
  const next = new Date(completed);

  if (recurrence.type === "daily") next.setDate(next.getDate() + 1);
  if (recurrence.type === "weekly") next.setDate(next.getDate() + 7);
  if (recurrence.type === "monthly") next.setMonth(next.getMonth() + 1);
  if (recurrence.type === "custom") next.setDate(next.getDate() + recurrence.everyDays);

  return next.getTime();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    state.tasks = JSON.parse(saved);
  } catch {
    state.tasks = [];
  }
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
