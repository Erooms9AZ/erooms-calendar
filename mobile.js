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
let mobileCurrentDay = new Date();

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
    div.className = "slotItem " + (availability.available ? "available" : "unavailable");
    div.textContent = `${hour}:00`;

    if (availability.available && availability.rooms.length > 0) {
      const room = availability.rooms[0];
      div.onclick = () => window.handleSlotClick(room, slotTime);
    }

    slotList.appendChild(div);
  });
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
// INITIAL LOAD (AFTER CALENDAR EXPORTS ARE READY)
// -------------------------------------------------------
waitForCalendarExports(() => {
  updateDayLabel();
  renderMobileSlots();
});
