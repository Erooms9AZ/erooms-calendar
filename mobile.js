// mobile.js
window.selectedDuration = 1;

// ----------------------------------------
// STATE
// ----------------------------------------
let mobileCurrentDay = window.currentWeekStart
  ? new Date(window.currentWeekStart)
  : new Date();

// ----------------------------------------
// WEEK / DAY CHANGE LISTENERS
// ----------------------------------------
document.addEventListener("weekChanged", (e) => {
  mobileCurrentDay = new Date(e.detail);
  updateDayLabel();
  renderMobileSlots();
});

document.addEventListener("calendarEventsUpdated", (e) => {
  window.allEvents = e.detail;
  renderMobileSlots();
});

// ----------------------------------------
// HEADER LABEL
// ----------------------------------------
function updateDayLabel() {
  const options = { weekday: "long", day: "numeric", month: "long" };
  const label = document.getElementById("dayLabel");
  if (label) {
    label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", options);
  }
}

// ----------------------------------------
// DURATION-AWARE AVAILABILITY
// ----------------------------------------
function getDurationAwareAvailability(slotTime, duration) {
  const base = window.getAvailabilityForSlot(slotTime) || { available: false, rooms: [] };
  if (!base.available || duration === 1) return base;

  let commonRooms = [...base.rooms];

  for (let i = 1; i < duration; i++) {
    const nextTime = new Date(slotTime.getTime() + i * 60 * 60 * 1000);
    const next = window.getAvailabilityForSlot(nextTime) || { available: false, rooms: [] };
    commonRooms = commonRooms.filter(r => next.rooms.includes(r));
    if (commonRooms.length === 0) break;
  }

  return { available: commonRooms.length > 0, rooms: commonRooms };
}

// ----------------------------------------
// OPEN BOOKING OVERLAY
// ----------------------------------------
function openMobileBooking(room, slotTime) {
  const start = new Date(slotTime);
  const end = new Date(start.getTime() + window.selectedDuration * 60 * 60 * 1000);

  window.selectedRoom = room;
  window.selectedStart = start;
  window.selectedEnd = end;
  window.selectedDate = start;

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2,"0")}:00 to ${String(end.getHours()).padStart(2,"0")}:00`;

  const overlay = document.getElementById("bookingOverlay");
  const summaryBox = document.getElementById("bookingSummary");
  summaryBox.textContent = summary;

  document.getElementById("bookingForm").style.display = "block";
  document.getElementById("successBox").style.display = "none";
  overlay.style.display = "flex";
}

// ----------------------------------------
// ROOM SELECTOR MODAL
// ----------------------------------------
function showMobileRoomSelector(rooms, slotTime) {
  const selector = document.getElementById("mobileRoomSelector");
  if (!selector) return;

  selector.style.display = "flex";

  selector.querySelectorAll(".room-btn").forEach(btn => {
    btn.onclick = () => {
      const room = btn.dataset.room;
      selector.style.display = "none";
      openMobileBooking(room, slotTime);
    };
  });

  const cancelBtn = document.getElementById("mobileRoomCancel");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      selector.style.display = "none";
    };
  }
}

// ----------------------------------------
// RENDER SLOTS
// ----------------------------------------
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;
  slotList.innerHTML = "";

  // Block Sundays
  if (mobileCurrentDay.getDay() === 0) {
    const div = document.createElement("div");
    div.className = "slotItem unavailable";
    div.textContent = "No bookings on Sunday";
    slotList.appendChild(div);
    return;
  }

  const hours = [...Array(12).keys()].map(i => i + 10); // 10:00–21:00
  const now = new Date();
  const duration = window.selectedDuration || 1;

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    const endHour = hour + duration;
    if (endHour > 22) return; // hard stop at 22:00
    if (slotTime < now) { // block past
      const div = document.createElement("div");
      div.className = "slotItem unavailable";
      div.textContent = `${hour}:00–${endHour}:00`;
      slotList.appendChild(div);
      return;
    }

    let availability = getDurationAwareAvailability(slotTime, duration);

    const div = document.createElement("div");
    div.className = "slotItem " + (availability.available ? 
      (availability.rooms.length === 2 ? "available" : availability.rooms[0]) : "unavailable");
    div.textContent = `${hour}:00–${endHour}:00`;

    if (availability.available && availability.rooms.length > 0) {
      div.onclick = () => {
        if (availability.rooms.length === 2) {
          showMobileRoomSelector(availability.rooms, slotTime);
        } else {
          openMobileBooking(availability.rooms[0], slotTime);
        }
      };
    }

    slotList.appendChild(div);
  });
}

// ----------------------------------------
// LEGEND
// ----------------------------------------
function insertSlotLegend() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;
  if (document.getElementById("slotLegend")) return;

  const legend = document.createElement("div");
  legend.id = "slotLegend";
  legend.innerHTML = `
    <div class="legendItem"><span class="legendColor both"></span> Both Rooms</div>
    <div class="legendItem"><span class="legendColor room1"></span> Room 1 Only</div>
    <div class="legendItem"><span class="legendColor room2"></span> Room 2 Only</div>
  `;
  slotList.parentNode.insertBefore(legend, slotList);
}

// ----------------------------------------
// NAVIGATION BUTTONS
// ----------------------------------------
document.getElementById("prevDayBtn")?.addEventListener("click", () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  updateDayLabel();
  document.dispatchEvent(new CustomEvent("weekChanged", { detail: mobileCurrentDay }));
  renderMobileSlots();
});

document.getElementById("nextDayBtn")?.addEventListener("click", () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  updateDayLabel();
  document.dispatchEvent(new CustomEvent("weekChanged", { detail: mobileCurrentDay }));
  renderMobileSlots();
});

// ----------------------------------------
// DURATION BUTTONS
// ----------------------------------------
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#durationButtons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    window.selectedDuration = Number(btn.dataset.hours);
    renderMobileSlots();
  });
});

// ----------------------------------------
// BOOKING SUBMISSION
// ----------------------------------------
function submitMobileBooking(payload) {
  return fetch("https://green-bread-e7e9.dave-f5d.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(res => res.ok);
}

document.getElementById("bfSubmit")?.addEventListener("click", async () => {
  const name = document.getElementById("bfName").value.trim();
  const email = document.getElementById("bfEmail").value.trim();
  const phone = document.getElementById("bfPhone").value.trim();
  const comments = document.getElementById("bfComments").value.trim();

  if (!name || !email || !phone) {
    document.getElementById("bookingStatus").textContent = "Please complete all required fields.";
    return;
  }

  document.getElementById("bookingStatus").textContent = "Submitting...";

  const payload = {
    name, email, phone, notes: comments,
    room: window.selectedRoom,
    start: window.selectedStart.toISOString(),
    end: window.selectedEnd.toISOString()
  };

  const ok = await submitMobileBooking(payload);

  if (ok) {
    document.getElementById("bookingForm").style.display = "none";
    document.getElementById("successBox").style.display = "block";
    document.getElementById("bookingStatus").textContent = "";
  } else {
    document.getElementById("bookingStatus").textContent = "Error submitting booking. Please try again.";
  }
});

document.getElementById("bfCancel")?.addEventListener("click", () => {
  document.getElementById("bookingOverlay").style.display = "none";
});

document.getElementById("successOk")?.addEventListener("click", () => {
  document.getElementById("bookingOverlay").style.display = "none";
});

// ----------------------------------------
// INITIAL LOAD
// ----------------------------------------
updateDayLabel();
insertSlotLegend();
renderMobileSlots();
