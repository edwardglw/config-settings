const topAreas = ["A", "B", "C"];

const subTopics = [
  { id: 1, name: "Sub Topic 1", desc: "Item visibility", enabled: true },
  { id: 2, name: "Sub Topic 2", desc: "Prioritization", enabled: true },
  { id: 3, name: "Sub Topic 3", desc: "Workload routing", enabled: true },
  { id: 4, name: "Sub Topic 4", desc: "Category rules", enabled: true },
  { id: 5, name: "Sub Topic 5", desc: "Display defaults", enabled: true },
  { id: 6, name: "Sub Topic 6", desc: "Legacy options", enabled: false }
];

const topicItems = Object.fromEntries(
  subTopics.map((t) => [
    t.id,
    Array.from({ length: 22 }, (_, i) => ({
      id: `${t.id}-${i + 1}`,
      label: `Setting ${i + 1}`,
      hint: `Controls behavior for ${t.name.toLowerCase()} · group ${Math.ceil((i + 1) / 5)}`,
      on: (i + t.id) % 3 !== 0
    }))
  ])
);

const state = {
  activeArea: "A",
  activeTopic: 1,
  query: ""
};

const modal = document.getElementById("settingsModal");
const openBtn = document.getElementById("openSettings");
const closeBtn = document.getElementById("closeSettings");
const areaTabs = [...document.querySelectorAll(".area-tab")];
const panes = [...document.querySelectorAll(".area-pane")];
const subtopicControls = document.getElementById("subtopicControls");
const topicTitle = document.getElementById("topicTitle");
const topicDescription = document.getElementById("topicDescription");
const itemFilter = document.getElementById("itemFilter");
const settingItems = document.getElementById("settingItems");
const toggleAllVisible = document.getElementById("toggleAllVisible");

function renderAreaTabs() {
  areaTabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.area === state.activeArea);
  });

  panes.forEach((pane) => {
    pane.classList.toggle("is-hidden", pane.dataset.pane !== state.activeArea);
  });
}

function renderSubtopics() {
  subtopicControls.innerHTML = "";

  subTopics.forEach((topic) => {
    const li = document.createElement("li");
    li.className = "subtopic-item";

    const topicBtn = document.createElement("button");
    topicBtn.className = "subtopic-main";
    topicBtn.innerHTML = `<strong>${topic.name}</strong><span>${topic.desc}</span>`;
    topicBtn.addEventListener("click", () => {
      state.activeTopic = topic.id;
      renderDetails();
    });

    const toggle = document.createElement("button");
    toggle.className = "switch";
    toggle.dataset.on = String(topic.enabled);
    toggle.setAttribute("aria-label", `Toggle ${topic.name}`);
    toggle.addEventListener("click", () => {
      topic.enabled = !topic.enabled;
      toggle.dataset.on = String(topic.enabled);
    });

    li.append(topicBtn, toggle);
    subtopicControls.appendChild(li);
  });
}

function filteredItems() {
  const q = state.query.trim().toLowerCase();
  const items = topicItems[state.activeTopic] || [];
  if (!q) return items;
  return items.filter((item) => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q));
}

function renderDetails() {
  const topic = subTopics.find((t) => t.id === state.activeTopic);
  if (!topic) return;

  topicTitle.textContent = topic.name;
  topicDescription.textContent = topic.desc;

  settingItems.innerHTML = "";
  filteredItems().forEach((item) => {
    const row = document.createElement("li");
    row.className = "item-row";

    const text = document.createElement("div");
    text.innerHTML = `<strong>${item.label}</strong><br /><small>${item.hint}</small>`;

    const toggle = document.createElement("button");
    toggle.className = "switch";
    toggle.dataset.on = String(item.on);
    toggle.setAttribute("aria-label", `Toggle ${item.label}`);
    toggle.addEventListener("click", () => {
      item.on = !item.on;
      toggle.dataset.on = String(item.on);
    });

    row.append(text, toggle);
    settingItems.appendChild(row);
  });
}

openBtn.addEventListener("click", () => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  state.activeArea = "A";
  state.activeTopic = 1;
  state.query = "";
  itemFilter.value = "";
  renderAreaTabs();
  renderSubtopics();
  renderDetails();
});

closeBtn.addEventListener("click", () => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
});

areaTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.activeArea = btn.dataset.area;
    renderAreaTabs();
  });
});

itemFilter.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderDetails();
});

toggleAllVisible.addEventListener("click", () => {
  const items = filteredItems();
  const hasOff = items.some((item) => !item.on);
  items.forEach((item) => {
    item.on = hasOff;
  });
  renderDetails();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
});

renderAreaTabs();
renderSubtopics();
renderDetails();
