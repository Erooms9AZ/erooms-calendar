window.selectedDuration = 1;

/* -------------------------------------------------------
   STATE
-------------------------------------------------------- */
let mobileCurrentDay = (typeof currentWeekStart !== "undefined")
  ? new Date(currentWeekStart)
  : new Date();

/* -------------------------------------------------------
   LISTEN FOR WEEK CHANGES FROM DESKTOP
-------------------------------------------------------- */
document.addEventListener("weekChanged", (e) => {
  mobileCurrentDay = new Date(e.detail);
  updateDayLabel();
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
  let base = window.getAvailabilityForSlot(slotTime) || { available: false, rooms: [] };

  if (!base.available || duration === 1) {
    return base;
  }

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
   OPEN BOOKING (FIXED — NO RECURSION)
-------------------------------------------------------- */
function openMobileBooking(room, slotTime) {
  const start = new Date(slotTime);
  const end = new Date(start.getTime() + window.selectedDuration * 60 * 60 * 1000);

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2, "0")}:00 to ${String(
    end.getHours()
  ).padStart(2, "0")}:00`;

  window.openBookingForm(summary);
}

/* -------------------------------------------------------
   ROOM SELECTOR MODAL
-------------------------------------------------------- */
function showMobileRoomSelector(rooms, slotTime) {
  const selector = document.getElementById("mobileRoomSelector");
  selector.style.display = "flex";

  selector.querySelectorAll(".room-btn").forEach(btn => {
    btn.onclick = () => {
      const room = btn.dataset.room;
      selector.style.display = "none";
      openMobileBooking(room, slotTime);
    };
  });

  document.getElementById("mobileRoomCancel").onclick = () => {
    selector.style.display = "none";
  };
}

/* -------------------------------------------------------
   RENDER SLOTS
-------------------------------------------------------- */
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

  slotList.innerHTML = "";

  // BLOCK SUNDAYS
  if (mobileCurrentDay.getDay() === 0) {
    const div = document.createElement("div");
    div.className = "slotItem unavailable";
    div.textContent = "No bookings on Sunday";
    slotList.appendChild(div);
    return;
  }

  const hours = [...Array(12).keys()].map(i => i + 10); // 10:00–21:00

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    const now = new Date();
    const duration = parseInt(
      document.querySelector("#durationButtons button.active")?.dataset.hours || "1",
      10
    );
    const endHour = hour + duration;

    // HARD STOP: no slot may end after 22:00
    if (endHour > 22) {
      return;
    }

    // BLOCK PAST TIMES
    if (slotTime < now) {
      const div = document.createElement("div");
      div.className = "slotItem unavailable";
      div.textContent = `${hour}:00–${endHour}:00`;
      slotList.appendChild(div);
      return;
    }

    // BLOCK BOOKINGS THAT END AFTER 22:00
    if (endHour > 22) {
      const div = document.createElement("div");
      div.className = "slotItem unavailable";
      div.textContent = `${hour}:00–${endHour}:00`;
      slotList.appendChild(div);
      return;
    }

    // DURATION-AWARE AVAILABILITY
    let availability = { available: false, rooms: [] };
    try {
      availability = getDurationAwareAvailability(slotTime, duration) || availability;
    } catch (e) {
      console.warn("Availability error:", e);
    }

    const div = document.createElement("div");
    let cls = "slotItem ";

    if (!availability.available) {
      cls += "unavailable";
    } else if (availability.rooms.length === 2) {
      cls += "available"; // purple
    } else if (availability.rooms.length === 1) {
      const room = availability.rooms[0];
      if (room === "room1") cls += "room1";
      if (room === "room2") cls += "room2";
    }

    div.className = cls;
    div.textContent = `${hour}:00–${endHour}:00`;

    if (availability.available && availability.rooms.length > 0) {
      div.onclick = () => {
        const rooms = availability.rooms;

        if (rooms.length === 2) {
          showMobileRoomSelector(rooms, slotTime);
          return;
        }

        openMobileBooking(rooms[0], slotTime);
      };
    }

    slotList.appendChild(div);
  });
}

/* -------------------------------------------------------
   LEGEND
-------------------------------------------------------- */
function insertSlotLegend() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;

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

/* -------------------------------------------------------
   NAVIGATION
-------------------------------------------------------- */
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
   INITIAL LOAD
-------------------------------------------------------- */
updateDayLabel();
insertSlotLegend();
renderMobileSlots();

 
