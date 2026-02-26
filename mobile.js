// ----------------------------
// MOBILE.JS - SAFE, RACE-CONDITION FREE
// ----------------------------

// Default selected duration
CalendarApp.selectedDuration = 1;

// ----------------------------
// STATE
// ----------------------------
let mobileCurrentDay = CalendarApp.currentWeekStart
  ? new Date(CalendarApp.currentWeekStart)
  : new Date();

let eventsReady = false;
let bookingInProgress = false;

// ----------------------------
// HEADER LABEL
// ----------------------------
function updateDayLabel() {
  const label = document.getElementById("dayLabel");
  if (!label) return;
  const options = { weekday: "long", day: "numeric", month: "long" };
  label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", options);
}

// ----------------------------
// DURATION-AWARE AVAILABILITY
// ----------------------------
function getDurationAwareAvailability(slotTime, duration) {
  if (!eventsReady) return { available: false, rooms: [] };

  let base = CalendarApp.getAvailabilityForSlot(slotTime) || { available: false, rooms: [] };
  if (!base.available || duration === 1) return base;

  let commonRooms = [...base.rooms];

  for (let i = 1; i < duration; i++) {
    const nextTime = new Date(slotTime.getTime() + i * 60 * 60 * 1000);
    const next = CalendarApp.getAvailabilityForSlot(nextTime) || { available: false, rooms: [] };
    commonRooms = commonRooms.filter(r => next.rooms.includes(r));
    if (commonRooms.length === 0) break;
  }

  return {
    available: commonRooms.length > 0,
    rooms: commonRooms
  };
}

// ----------------------------
// OPEN BOOKING
// ----------------------------
function openMobileBooking(room, slotTime) {
  if (!CalendarApp.openBookingForm) return;

  const start = new Date(slotTime);
  const end = new Date(start.getTime() + CalendarApp.selectedDuration * 60 * 60 * 1000);

  CalendarApp.selectedRoom = room;
  CalendarApp.selectedStart = start;
  CalendarApp.selectedEnd = end;

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2,"0")}:00 to ${String(end.getHours()).padStart(2,"0")}:00`;

  CalendarApp.openBookingForm(summary);
}

// ----------------------------
// MOBILE ROOM SELECTOR
// ----------------------------
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
  if (cancelBtn) cancelBtn.onclick = () => { selector.style.display = "none"; };
}

// ----------------------------
// RENDER MOBILE SLOTS
// ----------------------------
function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList || !eventsReady) return;

  slotList.innerHTML = "";

  // Block Sundays
  if (mobileCurrentDay.getDay() === 0) {
    const div = document.createElement("div");
    div.className = "slotItem unavailable";
    div.textContent = "No bookings on Sunday";
    slotList.appendChild(div);
    return;
  }

  const hours = [...Array(12).keys()].map(i => i + 10); // 10–21
  const now = new Date();

  hours.forEach(hour => {
    const slotTime = new Date(mobileCurrentDay);
    slotTime.setHours(hour, 0, 0, 0);

    const endHour = hour + CalendarApp.selectedDuration;
    if (endHour > 22) return; // Hard stop at 22:00
    if (slotTime < now) return; // Block past times

    const availability = getDurationAwareAvailability(slotTime, CalendarApp.selectedDuration);

    const div = document.createElement("div");
    let cls = "slotItem ";
    if (!availability.available) cls += "unavailable";
    else if (availability.rooms.length === 2) cls += "available";
    else if (availability.rooms.length === 1) cls += availability.rooms[0];

    div.className = cls;
    div.textContent = `${hour}:00–${endHour}:00`;

    if (availability.available && availability.rooms.length) {
      div.onclick = () => {
        if (bookingInProgress) return; // prevent double click
        if (availability.rooms.length === 2) showMobileRoomSelector(availability.rooms, slotTime);
        else openMobileBooking(availability.rooms[0], slotTime);
      };
    }

    slotList.appendChild(div);
  });
}

// ----------------------------
// SLOT LEGEND
// ----------------------------
function insertSlotLegend() {
  const slotList = document.getElementById("slotList");
  if (!slotList || document.getElementById("slotLegend")) return;

  const legend = document.createElement("div");
  legend.id = "slotLegend";
  legend.innerHTML = `
    <div class="legendItem"><span class="legendColor both"></span> Both Rooms</div>
    <div class="legendItem"><span class="legendColor room1"></span> Room 1 Only</div>
    <div class="legendItem"><span class="legendColor room2"></span> Room 2 Only</div>
  `;
  slotList.parentNode.insertBefore(legend, slotList);
}

// ----------------------------
// WEEK NAVIGATION (prev/next day)
// ----------------------------
const prevBtn = document.getElementById("prevDayBtn");
const nextBtn = document.getElementById("nextDayBtn");

if (prevBtn) prevBtn.onclick = () => { mobileCurrentDay.setDate(mobileCurrentDay.getDate()-1); updateDayLabel(); CalendarApp.loadEventsForMobile?.(); renderMobileSlots(); };
if (nextBtn) nextBtn.onclick = () => { mobileCurrentDay.setDate(mobileCurrentDay.getDate()+1); updateDayLabel(); CalendarApp.loadEventsForMobile?.(); renderMobileSlots(); };

// ----------------------------
// DURATION BUTTONS
// ----------------------------
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#durationButtons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    CalendarApp.selectedDuration = Number(btn.dataset.hours);
    renderMobileSlots();
  });
});

// ----------------------------
// BOOKING SUBMISSION
// ----------------------------
async function submitMobileBooking(payload) {
  if (!payload || bookingInProgress) return;
  bookingInProgress = true;

  try {
    const ok = await CalendarApp.submitBooking(payload);
    if (!ok) throw new Error("Booking failed");

    // Show success UI
    const name = document.getElementById("bfName")?.value?.trim() || "Guest";
    const start = CalendarApp.selectedStart;
    const end = CalendarApp.selectedEnd;

    const dayName = start.toLocaleDateString("en-GB", { weekday:"long" });
    const dateStr = start.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
    const startTime = start.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const endTime = end.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});

    document.getElementById("successMessage").innerHTML = `
      <strong>${name}</strong><br><br>
      Your booking for <strong>${dayName} ${dateStr}</strong><br>
      From <strong>${startTime}</strong> to <strong>${endTime}</strong><br><br>
      Has been confirmed.<br>
      You will receive an email shortly.<br><br>
      <strong>E Rooms</strong>
    `;

    document.getElementById("bookingForm").style.display = "none";
    document.getElementById("successBox").style.display = "block";

  } catch(e) {
    console.error("Booking error:", e);
    document.getElementById("bookingStatus").textContent = "Error submitting booking. Please try again.";
  } finally {
    bookingInProgress = false;
  }
}

// Mobile submit button
const submitBtn = document.getElementById("bfSubmit");
if (submitBtn) submitBtn.onclick = () => {
  const payload = {
    name: document.getElementById("bfName")?.value.trim(),
    email: document.getElementById("bfEmail")?.value.trim(),
    phone: document.getElementById("bfPhone")?.value.trim(),
    notes: document.getElementById("bfComments")?.value.trim(),
    room: CalendarApp.selectedRoom,
    start: CalendarApp.selectedStart?.toISOString(),
    end: CalendarApp.selectedEnd?.toISOString()
  };
  submitMobileBooking(payload);
};

// ----------------------------
// EVENT LISTENERS FROM DESKTOP
// ----------------------------
document.addEventListener("weekChanged", e => {
  mobileCurrentDay = new Date(e.detail);
  updateDayLabel();
  CalendarApp.loadEventsForMobile?.();
  renderMobileSlots();
});

document.addEventListener("calendarEventsUpdated", e => {
  CalendarApp.allEvents = e.detail || [];
  eventsReady = true;
  renderMobileSlots();
});

// ----------------------------
// INITIAL LOAD
// ----------------------------
updateDayLabel();
insertSlotLegend();
renderMobileSlots();
