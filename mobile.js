function getRoomAvailabilityFromEvents(slotTime, duration) {
  const endTime = new Date(slotTime.getTime() + duration * 60 * 60 * 1000);

  let room1Free = true;
  let room2Free = true;

  for (const ev of window.allEvents || []) {
    const evStart = new Date(ev.start);
    const evEnd = new Date(ev.end);

    const overlaps =
      evStart < endTime &&
      evEnd > slotTime;

    if (!overlaps) continue;

    // Detect room field automatically
    const room = ev.room || ev.resource || ev.resourceId || ev.roomId || ev.location || ev.type;

    if (room === "room1") room1Free = false;
    if (room === "room2") room2Free = false;
  }

  return {
    available: room1Free || room2Free,
    freeRooms: [
      ...(room1Free ? ["room1"] : []),
      ...(room2Free ? ["room2"] : [])
    ]
  };
}


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
  console.log("renderMobileSlots() running");

  const slotList = document.getElementById("slotList");
  if (!slotList) {
    console.log("slotList not found");
    return;
  }

  slotList.innerHTML = "";

  const hours = [...Array(12).keys()].map(i => i + 10); // 10–21
  const duration = window.selectedDuration || 1;

  for (let hour of hours) {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    // Use the desktop engine
    const availability = window.getAvailabilityForSlot(slotTime, duration);

    const div = document.createElement("div");
    div.classList.add("slotItem");

    // Assign colour class
    if (!availability.available) {
      div.classList.add("unavailable");
    } else if (availability.rooms
.length === 2) {
      div.classList.add("available"); // both rooms free
    } else if (availability.rooms[0] === "room1") {
      div.classList.add("room1");
    } else if (availability.rooms[0] === "room2") {
      div.classList.add("room2");
    }

    // Label
    div.textContent = `${hour}:00–${hour + duration}:00`;

    // Click behaviour
    if (availability.available) {
      div.onclick = () => {
        if (availability.freeRooms.length === 1) {
          // Only one room free → book directly
          openMobileBooking(availability.rooms[0], slotTime);
        } else {
          // Both free → show selector
          showMobileRoomSelector(availability.rooms, slotTime);
        }
      };
    }

    slotList.appendChild(div);
  }

  console.log("Slots rendered:", slotList.children.length);
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
      if (window.getAvailabilityForSlot && window.loadEventsForMobile) {
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
