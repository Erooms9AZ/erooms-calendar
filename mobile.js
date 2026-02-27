/* -------------------------------------------------------
   STATE
-------------------------------------------------------- */
window.selectedDuration = 1;

let mobileCurrentDay = new Date();

/* -------------------------------------------------------
   UPDATE HEADER LABEL
-------------------------------------------------------- */
function updateDayLabel() {
  const label = document.getElementById("dayLabel");
  if (label) {
    const options = { weekday: "long", day: "numeric", month: "long" };
    label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", options);
  }
}

/* -------------------------------------------------------
   OPEN BOOKING OVERLAY (uses desktop booking)
-------------------------------------------------------- */
function openMobileBooking(room, slotTime) {
  const start = new Date(slotTime);
  const end = new Date(start.getTime() + window.selectedDuration * 60 * 60 * 1000);

  window.selectedRoom = room;
  window.selectedStart = start;
  window.selectedEnd = end;

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2,"0")}:00 to ${String(end.getHours()).padStart(2,"0")}:00`;

  window.openBookingForm(summary);
}

/* -------------------------------------------------------
   ROOM SELECTOR
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
  if (cancelBtn) cancelBtn.onclick = () => (selector.style.display = "none");
}

/* -------------------------------------------------------
   RENDER SLOTS (uses desktop availability engine)
-------------------------------------------------------- */
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

  slotList.innerHTML = "";

  if (mobileCurrentDay.getDay() === 0) {
    const div = document.createElement("div");
    div.className = "slotItem unavailable";
    div.textContent = "No bookings on Sunday";
    slotList.appendChild(div);
    return;
  }

  const hours = [...Array(12).keys()].map(i => i + 10); // 10:00–21:00
  const duration = window.selectedDuration;

  hours.forEach(hour => {

    // NORMALISED DATE (critical fix)
    const slotTime = new Date(Date.UTC(
  mobileCurrentDay.getFullYear(),
  mobileCurrentDay.getMonth(),
  mobileCurrentDay.getDate(),
  hour,
  0,
  0,
  0
));


    if (hour + duration > 22) return;

    const { available, rooms } = window.getAvailabilityForSlot(slotTime, duration);

    const div = document.createElement("div");
    div.className = "slotItem";

    // CORRECT AVAILABILITY LOGIC (critical fix)
    if (!available) {
      div.classList.add("unavailable");
    } else if (rooms.length === 2) {
      div.classList.add("available");
    } else if (rooms.includes("room1")) {
      div.classList.add("room1");
    } else if (rooms.includes("room2")) {
      div.classList.add("room2");
    }

    div.textContent = `${hour}:00–${hour + duration}:00`;

    // CLICK HANDLER (corrected)
    if (available && rooms.length > 0) {
      div.onclick = () => {
        if (rooms.length === 2) showMobileRoomSelector(rooms, slotTime);
        else openMobileBooking(rooms[0], slotTime);
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
    document.querySelectorAll("#durationButtons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    window.selectedDuration = Number(btn.dataset.hours);

    window.loadEventsForMobile().then(renderMobileSlots);
  });
});

/* -------------------------------------------------------
   NAVIGATION (critical fix)
-------------------------------------------------------- */
document.getElementById("prevDayBtn")?.addEventListener("click", async () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  updateDayLabel();
  await window.loadEventsForMobile();
  renderMobileSlots();
});

document.getElementById("nextDayBtn")?.addEventListener("click", async () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  updateDayLabel();
  await window.loadEventsForMobile();
  renderMobileSlots();
});

/* -------------------------------------------------------
   WAIT FOR DESKTOP (critical fix)
-------------------------------------------------------- */
function waitForDesktopReady() {
  return new Promise(resolve => {
    const check = () => {
      if (window.calendars && window.fetchEvents && window.getAvailabilityForSlot) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

/* -------------------------------------------------------
   INITIALISE MOBILE CALENDAR
-------------------------------------------------------- */
(async () => {
  try {
    await waitForDesktopReady();
    await window.loadEventsForMobile();
    updateDayLabel();
    renderMobileSlots();
  } catch (err) {
    console.error("❌ Mobile init failed:", err);
  }
})();
