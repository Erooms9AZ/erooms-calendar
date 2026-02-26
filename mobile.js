window.selectedDuration = 1;

/* -------------------------------------------------------
   STATE
-------------------------------------------------------- */
let mobileCurrentDay = (typeof currentWeekStart !== "undefined")
  ? new Date(currentWeekStart)
  : new Date();

/* -------------------------------------------------------
   HELPER: Ensure window.allEvents is ready
-------------------------------------------------------- */
async function ensureEventsLoaded() {
  if (window.allEvents && window.allEvents.length > 0) return window.allEvents;

  if (window.loadEventsForMobile) {
    await window.loadEventsForMobile();
    return window.allEvents || [];
  }

  return [];
}

/* -------------------------------------------------------
   LISTEN FOR WEEK CHANGES FROM DESKTOP
-------------------------------------------------------- */
document.addEventListener("weekChanged", async (e) => {
  mobileCurrentDay = new Date(e.detail);
  updateDayLabel();

  await ensureEventsLoaded();
  renderMobileSlots();
});

/* -------------------------------------------------------
   LISTEN FOR UPDATED EVENTS FROM DESKTOP
-------------------------------------------------------- */
document.addEventListener("calendarEventsUpdated", (e) => {
  window.allEvents = e.detail;
  renderMobileSlots();
});

/* -------------------------------------------------------
   HEADER LABEL
-------------------------------------------------------- */
function updateDayLabel() {
  const options = { weekday: "long", day: "numeric", month: "long" };
  const label = document.getElementById("dayLabel");
  if (label) {
    label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", options);
  }
}

/* -------------------------------------------------------
   DURATION-AWARE AVAILABILITY
-------------------------------------------------------- */
function getDurationAwareAvailability(slotTime, duration) {
  if (!window.getAvailabilityForSlot) return { available: false, rooms: [] };

  let base = window.getAvailabilityForSlot(slotTime) || { available: false, rooms: [] };

  if (!base.available || duration === 1) return base;

  let commonRooms = [...base.rooms];

  for (let i = 1; i < duration; i++) {
    const nextTime = new Date(slotTime.getTime() + i * 60 * 60 * 1000);
    const next = window.getAvailabilityForSlot(nextTime) || { available: false, rooms: [] };
    commonRooms = commonRooms.filter(r => next.rooms.includes(r));
    if (commonRooms.length === 0) break;
  }

  return {
    available: commonRooms.length > 0,
    rooms: commonRooms
  };
}

/* -------------------------------------------------------
   OPEN BOOKING
-------------------------------------------------------- */
function openMobileBooking(room, slotTime) {
  const start = new Date(slotTime);
  const end = new Date(start.getTime() + window.selectedDuration * 60 * 60 * 1000);

  window.selectedRoom = room;
  window.selectedStart = start;
  window.selectedEnd = end;
  window.selectedDate = start;

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2, "0")}:00 to ${String(end.getHours()).padStart(2, "0")}:00`;

  if (window.openBookingForm) window.openBookingForm(summary);
}

/* -------------------------------------------------------
   ROOM SELECTOR MODAL
-------------------------------------------------------- */
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

/* -------------------------------------------------------
   RENDER MOBILE SLOTS
-------------------------------------------------------- */
async function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

  slotList.innerHTML = "";

  await ensureEventsLoaded();

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

  const duration = parseInt(
    document.querySelector("#durationButtons button.active")?.dataset.hours || "1",
    10
  );

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    const endHour = hour + duration;
    if (endHour > 22) return; // hard stop at 22:00

    // Block past times
    if (slotTime < now) {
      const div = document.createElement("div");
      div.className = "slotItem unavailable";
      div.textContent = `${hour}:00–${endHour}:00`;
      slotList.appendChild(div);
      return;
    }

    let availability = getDurationAwareAvailability(slotTime, duration);

    const div = document.createElement("div");
    let cls = "slotItem ";
    if (!availability.available) {
      cls += "unavailable";
    } else if (availability.rooms.length === 2) {
      cls += "available";
    } else if (availability.rooms.length === 1) {
      cls += availability.rooms[0];
    }

    div.className = cls;
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

/* -------------------------------------------------------
   DURATION BUTTONS
-------------------------------------------------------- */
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#durationButtons button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    window.selectedDuration = Number(btn.dataset.hours);

    renderMobileSlots();
  });
});

/* -------------------------------------------------------
   NAVIGATION
-------------------------------------------------------- */
const prevBtn = document.getElementById("prevDayBtn");
const nextBtn = document.getElementById("nextDayBtn");

if (prevBtn) prevBtn.onclick = () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  updateDayLabel();
  renderMobileSlots();
};

if (nextBtn) nextBtn.onclick = () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  updateDayLabel();
  renderMobileSlots();
};

/* -------------------------------------------------------
   INITIAL LOAD
-------------------------------------------------------- */
updateDayLabel();
renderMobileSlots();
