// Start on today's date
let mobileCurrentDay = new Date();

// Update the header label
function updateDayLabel() {
  const options = { weekday: "long", day: "numeric", month: "long" };
  document.getElementById("dayLabel").textContent =
    mobileCurrentDay.toLocaleDateString("en-GB", options);
}

// Render the slots for the selected day
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  slotList.innerHTML = "";

  const hours = [...Array(12).keys()].map(i => i + 10); // 10:00–21:00

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    // Use your existing availability logic from calendar.js
    const availability = window.getAvailabilityForSlot(slotTime);

    const div = document.createElement("div");
    div.className = "slotItem " + (availability.available ? "available" : "unavailable");

    div.textContent = `${hour}:00`;

    if (availability.available) {
      div.onclick = () => window.handleSlotClick(slotTime, availability.rooms);
    }

    slotList.appendChild(div);
  });
}

// Navigation
document.getElementById("prevDayBtn").onclick = () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  updateDayLabel();
  renderMobileSlots();
};

document.getElementById("nextDayBtn").onclick = () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  updateDayLabel();
  renderMobileSlots();
};

// Initial load
updateDayLabel();
renderMobileSlots();
