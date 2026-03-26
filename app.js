const subTopics = [
  { id: 1, name: "Sub Topic 1", desc: "Item visibility", enabled: true },
  { id: 2, name: "Sub Topic 2", desc: "Advanced sections", enabled: true },
  { id: 3, name: "Sub Topic 3", desc: "Workload routing", enabled: true },
  { id: 4, name: "Sub Topic 4", desc: "Category rules", enabled: true },
  { id: 5, name: "Sub Topic 5", desc: "Display defaults", enabled: true },
  { id: 6, name: "Sub Topic 6", desc: "Legacy options", enabled: false }
];

const topic1Items = Array.from({ length: 22 }, (_, i) => ({
  id: `1-${i + 1}`,
  label: `Setting ${i + 1}`,
  hint: `Controls behavior for sub topic 1 · group ${Math.ceil((i + 1) / 5)}`,
  on: (i + 1) % 3 !== 0
}));

const topic2 = {
  checklist: [
    { id: "2-1-a", label: "Show in daily dashboard", checked: true },
    { id: "2-1-b", label: "Allow manager override", checked: true },
    { id: "2-1-c", label: "Auto-archive completed items", checked: false },
    { id: "2-1-d", label: "Pin high-priority recommendations", checked: true },
    { id: "2-1-e", label: "Require reason for turning off", checked: false },
    { id: "2-1-f", label: "Notify team channel on change", checked: true }
  ],
  reviewCadence: "weekly",
  visibility: "team"
};

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
      state.query = "";
      itemFilter.value = "";
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

function topic1FilteredItems() {
  const q = state.query.trim().toLowerCase();
  if (!q) return topic1Items;
  return topic1Items.filter((item) => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q));
}

function renderTopic1() {
  toggleAllVisible.classList.remove("is-hidden");
  itemFilter.classList.remove("is-hidden");

  settingItems.innerHTML = "";
  topic1FilteredItems().forEach((item) => {
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

function renderTopic2() {
  toggleAllVisible.classList.add("is-hidden");
  itemFilter.classList.add("is-hidden");

  settingItems.innerHTML = `
    <li class="section-card">
      <h4>A 2.1 · Checklist</h4>
      <p>Quickly choose which behaviors are active for this section.</p>
      <div class="checkbox-list" id="topic2Checklist"></div>
    </li>
    <li class="section-card">
      <h4>A 2.2 · Review cadence</h4>
      <p>Pick how often this section should be reviewed.</p>
      <div class="pill-group" id="reviewCadence"></div>
    </li>
    <li class="section-card">
      <h4>A 2.3 · Visibility</h4>
      <p>Control who can view and adjust this section.</p>
      <div class="pill-group" id="visibilityLevel"></div>
    </li>
  `;

  const checklistHost = document.getElementById("topic2Checklist");
  topic2.checklist.forEach((entry) => {
    const label = document.createElement("label");
    label.className = "check-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = entry.checked;
    input.addEventListener("change", () => {
      entry.checked = input.checked;
    });

    const text = document.createElement("span");
    text.textContent = entry.label;

    label.append(input, text);
    checklistHost.appendChild(label);
  });

  const cadenceHost = document.getElementById("reviewCadence");
  [
    ["daily", "Daily"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"]
  ].forEach(([id, label]) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.dataset.active = String(topic2.reviewCadence === id);
    btn.textContent = label;
    btn.addEventListener("click", () => {
      topic2.reviewCadence = id;
      renderTopic2();
    });
    cadenceHost.appendChild(btn);
  });

  const visibilityHost = document.getElementById("visibilityLevel");
  [
    ["owner", "Owner only"],
    ["team", "Team"],
    ["org", "Organization"]
  ].forEach(([id, label]) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.dataset.active = String(topic2.visibility === id);
    btn.textContent = label;
    btn.addEventListener("click", () => {
      topic2.visibility = id;
      renderTopic2();
    });
    visibilityHost.appendChild(btn);
  });
}

function renderTopicPlaceholder(topicId) {
  toggleAllVisible.classList.add("is-hidden");
  itemFilter.classList.add("is-hidden");
  settingItems.innerHTML = `
    <li class="section-card">
      <h4>${subTopics.find((s) => s.id === topicId)?.name || "Sub Topic"}</h4>
      <p>This section is ready for additional controls when you define them.</p>
    </li>
  `;
}

function renderDetails() {
  const topic = subTopics.find((t) => t.id === state.activeTopic);
  if (!topic) return;

  topicTitle.textContent = topic.name;
  topicDescription.textContent = topic.desc;

  if (topic.id === 1) {
    renderTopic1();
    return;
  }

  if (topic.id === 2) {
    renderTopic2();
    return;
  }

  renderTopicPlaceholder(topic.id);
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
  if (state.activeTopic === 1) {
    renderTopic1();
  }
});

toggleAllVisible.addEventListener("click", () => {
  const items = topic1FilteredItems();
  const hasOff = items.some((item) => !item.on);
  items.forEach((item) => {
    item.on = hasOff;
  });
  renderTopic1();
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
