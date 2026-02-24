window.selectedDuration = 1;


// -------------------------------------------------------
// WAIT FOR CALENDAR EXPORTS
// -------------------------------------------------------
function waitForCalendarExports(callback) {
  if (
    typeof window.getAvailabilityForSlot === "function" &&
    typeof window.handleSlotClick === "function"
  ) {
    callback();
  } else {
    setTimeout(() => waitForCalendarExports(callback), 50);
  }
}

// -------------------------------------------------------
// STATE
// -------------------------------------------------------
let mobileCurrentDay = (typeof currentWeekStart !== "undefined")
  ? new Date(currentWeekStart)
  : new Date();


// -------------------------------------------------------
// HEADER LABEL
// -------------------------------------------------------
function updateDayLabel() {
  const options = { weekday: "long", day: "numeric", month: "long" };
  const label = document.getElementById("dayLabel");
  if (label) {
    label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", options);
  }
}

// -------------------------------------------------------
// RENDER SLOTS
// -------------------------------------------------------
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

  slotList.innerHTML = "";

  const hours = [...Array(12).keys()].map(i => i + 10); // 10:00–21:00

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    // Safe availability call
    let availability = { available: false, rooms: [] };
    try {
      availability = window.getAvailabilityForSlot(slotTime) || availability;
    } catch (e) {
      console.warn("Availability error:", e);
    }

    const div = document.createElement("div");
   let cls = "slotItem ";

if (!availability.available) {
  cls += "unavailable";
} else if (availability.rooms.length === 2) {
  cls += "available"; // both rooms → purple
} else if (availability.rooms.length === 1) {
  const room = availability.rooms[0];
  if (room === "room1") cls += "room1";
  if (room === "room2") cls += "room2";
}

div.className = cls;

   // Determine selected duration (1, 2, or 3 hours)
const duration = parseInt(
  document.querySelector("#durationButtons button.active")
?.dataset.hours || "1",
  10
);

// Compute end time
const endHour = hour + duration;

// Set label: "10:00–11:00", "10:00–12:00", etc.
div.textContent = `${hour}:00–${endHour}:00`;


   if (availability.available && availability.rooms.length > 0) {
  div.onclick = () => {
    const rooms = availability.rooms;

    // BOTH ROOMS AVAILABLE → show selector
    if (rooms.length === 2) {
      showMobileRoomSelector(rooms, slotTime);
      return;
    }

    // ONE ROOM AVAILABLE → auto-select
    window.handleSlotClick(rooms[0], slotTime);

    slotList.appendChild(div);
}
function insertSlotLegend() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

  // Avoid duplicates
  if (document.getElementById("slotLegend")) return;

  const legend = document.createElement("div");
  legend.id = "slotLegend";
  legend.innerHTML = `
    <div class="legendItem">
      <span class="legendColor both"></span> Both Rooms
    </div>
    <div class="legendItem">
      <span class="legendColor room1"></span> Room 1 Only
    </div>
    <div class="legendItem">
      <span class="legendColor room2"></span> Room 2 Only
    </div>
  `;

  slotList.parentNode.insertBefore(legend, slotList);
}
function showMobileRoomSelector(rooms, slotTime) {
  const choice = window.prompt(
    "Both rooms available.\nEnter 1 for Room 1 or 2 for Room 2:"
  );

  if (choice === "1") window.handleSlotClick("room1", slotTime);
  if (choice === "2") window.handleSlotClick("room2", slotTime);
}

// -------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------
const prevBtn = document.getElementById("prevDayBtn");
const nextBtn = document.getElementById("nextDayBtn");

if (prevBtn) {
  prevBtn.onclick = () => {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
    updateDayLabel();
    renderMobileSlots();
  };
}

if (nextBtn) {
  nextBtn.onclick = () => {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
    updateDayLabel();
    renderMobileSlots();
  };
}
// -------------------------------------------------------
// DURATION BUTTONS
// -------------------------------------------------------
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove active from all
    document.querySelectorAll("#durationButtons button")
      .forEach(b => b.classList.remove("active"));

    // Add active to clicked
    btn.classList.add("active");

    // Re-render slots with new duration
    renderMobileSlots();
  });
});

// -------------------------------------------------------
// WAIT FOR EVENTS, THEN REFRESH SLOTS ONCE
// -------------------------------------------------------
function waitForEventsAndRefresh() {
  if (Array.isArray(window.allEvents) && window.allEvents.length > 0) {
    // Events are ready: re-render so availability is correct
    renderMobileSlots();
  } else {
    setTimeout(waitForEventsAndRefresh, 200);
  }
}

// -------------------------------------------------------
// INITIAL LOAD (AFTER CALENDAR EXPORTS ARE READY)
// -------------------------------------------------------
waitForCalendarExports(() => {
  updateDayLabel();
  insertSlotLegend();       // ← ADD THIS
  window.selectedDuration = Number(btn.dataset.hours);
renderMobileSlots();
  waitForEventsAndRefresh();
});
}
