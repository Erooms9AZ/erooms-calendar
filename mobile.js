window.selectedDuration = 1;

/* -------------------------------------------------------
   STATE
-------------------------------------------------------- */
let mobileCurrentDay = (typeof currentWeekStart !== "undefined")
  ? new Date(currentWeekStart)
  : new Date();

/* -------------------------------------------------------
   HELPER — BUILD AVAILABILITY MAP
-------------------------------------------------------- */
function buildMobileAvailabilityMap() {
  const map = {};
  const events = window.allEvents || [];
  events.forEach(ev => {
    const evStart = new Date(ev.start.dateTime || ev.start.date);
    const evEnd = new Date(ev.end.dateTime || ev.end.date);
    let current = new Date(evStart);
    while (current < evEnd) {
      const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}-${current.getHours()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev.room);
      current.setHours(current.getHours() + 1);
    }
  });
  return map;
}

/* -------------------------------------------------------
   GET AVAILABILITY FOR A SLOT
-------------------------------------------------------- */
function getMobileAvailability(slotTime, duration) {
  if (!window.allEvents || window.allEvents.length === 0) return { available: false, rooms: [] };
  let map = buildMobileAvailabilityMap();
  let rooms = ["room1", "room2"];

  for (let i = 0; i < duration; i++) {
    const t = new Date(slotTime);
    t.setHours(t.getHours() + i);
    const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
    const booked = map[key] || [];
    rooms = rooms.filter(r => !booked.includes(r));
    if (rooms.length === 0) break;
  }

  return { available: rooms.length > 0, rooms };
}

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
   OPEN BOOKING OVERLAY
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
  document.getElementById("bookingSummary").textContent = summary;
  document.getElementById("bookingOverlay").style.display = "flex";
  document.getElementById("bookingForm").style.display = "block";
  document.getElementById("successBox").style.display = "none";
}

/* -------------------------------------------------------
   RENDER SLOTS
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
  const now = new Date();
  const duration = window.selectedDuration || 1;

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    if (hour + duration > 22) return; // hard stop

    const availability = getMobileAvailability(slotTime, duration);
    const div = document.createElement("div");
    div.className = "slotItem";

    if (!availability.available) div.classList.add("unavailable");
    else if (availability.rooms.length === 2) div.classList.add("available");
    else if (availability.rooms.length === 1) div.classList.add(availability.rooms[0]);

    div.textContent = `${hour}:00–${hour+duration}:00`;

    if (availability.available && availability.rooms.length > 0) {
      div.onclick = () => {
        if (availability.rooms.length === 2) showMobileRoomSelector(availability.rooms, slotTime);
        else openMobileBooking(availability.rooms[0], slotTime);
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
    renderMobileSlots();
  });
});

/* -------------------------------------------------------
   NAVIGATION
-------------------------------------------------------- */
document.getElementById("prevDayBtn")?.addEventListener("click", () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  updateDayLabel();
  renderMobileSlots();
});

document.getElementById("nextDayBtn")?.addEventListener("click", () => {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  updateDayLabel();
  renderMobileSlots();
});

/* -------------------------------------------------------
   WAIT FOR EVENTS FROM DESKTOP
-------------------------------------------------------- */
document.addEventListener("calendarEventsUpdated", () => {
  renderMobileSlots(); // render only after events exist
});

/* -------------------------------------------------------
   INITIAL LOAD
-------------------------------------------------------- */
updateDayLabel();
renderMobileSlots();
