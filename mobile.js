console.log("📱 mobile.js LOADED");

// -------------------------------------------------------
// MOBILE-SAFE BOOKING WRAPPER
// -------------------------------------------------------
window.mobileOpenBookingForm = function(summaryText) {
  if (typeof window.openBookingForm === "function") {
    try {
      window.openBookingForm(summaryText);
    } catch (e) {
      console.warn("Desktop booking form not available on mobile:", e);
    }
  }
};

// -------------------------------------------------------
// GLOBAL STATE
// -------------------------------------------------------
window.allEvents = [];
let selectedDuration = 1;
let currentDate = new Date();

// -------------------------------------------------------
// FORMAT HELPERS
// -------------------------------------------------------
function formatDateLabel(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// -------------------------------------------------------
// LOAD EVENTS FOR MOBILE
// -------------------------------------------------------
window.loadEventsForMobile = async function() {
  try {
    const start = new Date(currentDate);
    start.setHours(0,0,0,0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const room1 = await window.fetchEvents(window.calendars.room1, start, end);
    const room2 = await window.fetchEvents(window.calendars.room2, start, end);

    const merged = [
      ...room1.map(ev => ({...ev, room:"room1"})),
      ...room2.map(ev => ({...ev, room:"room2"}))
    ];

    window.allEvents = merged;

    // ⭐ FIX 1 — auto-render after events load
    renderMobileSlots();

  } catch (err) {
    console.error("❌ Mobile init failed:", err);
  }
};

// -------------------------------------------------------
// CHECK AVAILABILITY
// -------------------------------------------------------
function getAvailabilityForSlot(slotTime, duration) {
  const endTime = new Date(slotTime.getTime() + duration * 60 * 60 * 1000);

  const conflicts = window.allEvents.filter(ev => {
    const evStart = new Date(ev.start.dateTime || ev.start.date);
    const evEnd = new Date(ev.end.dateTime || ev.end.date);
    return evStart < endTime && evEnd > slotTime;
  });

  const rooms = [];
  if (!conflicts.some(ev => ev.room === "room1")) rooms.push("room1");
  if (!conflicts.some(ev => ev.room === "room2")) rooms.push("room2");

  return rooms;
}

// -------------------------------------------------------
// RENDER SLOTS
// -------------------------------------------------------
function renderMobileSlots() {
  const list = document.getElementById("slotList");
  list.innerHTML = "";

  const base = new Date(currentDate);
  base.setHours(8,0,0,0);

  for (let i = 0; i < 20; i++) {
    const slot = new Date(base.getTime() + i * 30 * 60 * 1000);
    const rooms = getAvailabilityForSlot(slot, selectedDuration);

    const div = document.createElement("div");
    div.className = "slotItem";

    if (rooms.length === 0) {
      div.classList.add("unavailable");
    } else if (rooms.length === 2) {
      div.classList.add("available");
      div.style.background = "#e8ddff"; // both rooms
    } else if (rooms[0] === "room1") {
      div.classList.add("available");
      div.style.background = "#d7f5d7"; // room1
    } else if (rooms[0] === "room2") {
      div.classList.add("available");
      div.style.background = "#d7e8ff"; // room2
    }

    const end = new Date(slot.getTime() + selectedDuration * 60 * 60 * 1000);

    div.innerHTML = `
      <span>${formatTime(slot)} – ${formatTime(end)}</span>
      <span>${rooms.length === 0 ? "Unavailable" : rooms.join(", ")}</span>
    `;

    div.dataset.summary = `${formatDateLabel(currentDate)} ${formatTime(slot)} for ${selectedDuration} hour(s)`;

    list.appendChild(div);
  }

  // ⭐ FIX 2 — attach click handlers after rendering
  attachSlotClickHandlers();
}

// -------------------------------------------------------
// CLICK HANDLERS FOR SLOTS
// -------------------------------------------------------
function attachSlotClickHandlers() {
  document.querySelectorAll(".slotItem.available").forEach(slot => {
    slot.addEventListener("click", () => {
      const summary = slot.dataset.summary;
      window.mobileOpenBookingForm(summary);
    });
  });
}

// -------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------
document.getElementById("prevDayBtn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  document.getElementById("dayLabel").textContent = formatDateLabel(currentDate);
  window.loadEventsForMobile();
});

document.getElementById("nextDayBtn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  document.getElementById("dayLabel").textContent = formatDateLabel(currentDate);
  window.loadEventsForMobile();
});

// -------------------------------------------------------
// DURATION BUTTONS
// -------------------------------------------------------
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#durationButtons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    selectedDuration = parseInt(btn.dataset.hours);

    renderMobileSlots();
  });
});

// -------------------------------------------------------
// INITIAL LOAD
// -------------------------------------------------------
document.getElementById("dayLabel").textContent = formatDateLabel(currentDate);
window.loadEventsForMobile();
