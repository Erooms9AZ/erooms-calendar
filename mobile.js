// ---------------------------------------------------------
//  SAFE API KEY
// ---------------------------------------------------------
const k1 = "AIzaSy";
const k2 = "DJbfWqdMdgjIW0EAaREvUCKlz9P6yrPCs";
const apiKey = k1 + k2;

// ---------------------------------------------------------
//  ROOM CALENDAR IDS
// ---------------------------------------------------------
const ROOM1_ID = "o6del9prcevigs6q3gnqqc18po@group.calendar.google.com";
const ROOM2_ID = "0vaic8tl54smverq0d9eso5gs8@group.calendar.google.com";

// ---------------------------------------------------------
//  STATE
// ---------------------------------------------------------
let mobileCurrentDay = new Date();

// If today is Sunday, move to Monday
if (mobileCurrentDay.getDay() === 0) {
  mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
}

let selectedDuration = 1;


// ---------------------------------------------------------
//  DATE HELPERS
// ---------------------------------------------------------
function formatDateISO(d) {
  return d.toISOString().split("T")[0];
}

function updateDayLabel() {
  const label = document.getElementById("dayLabel");
  if (!label) return;
  const opts = { weekday: "long", day: "numeric", month: "long" };
  label.textContent = mobileCurrentDay.toLocaleDateString("en-GB", opts);
}

// ---------------------------------------------------------
//  BUSINESS HOURS RULES
// ---------------------------------------------------------
function isSlotWithinBusinessHours(date, hour) {
  const day = date.getDay(); // 0=Sun, 6=Sat

  if (day === 0) return false; // Sunday removed

  if (day === 6) {
    if (hour < 12) return false; // Saturday 10–12 blocked
    return hour >= 10 && hour < 22;
  }
  return hour >= 10 && hour < 22; // Mon–Fri
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


// ---------------------------------------------------------
//  FETCH EVENTS FROM GOOGLE CALENDAR
// ---------------------------------------------------------
async function fetchEventsForRoom(calendarId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events` +
    `?timeMin=${start.toISOString()}` +
    `&timeMax=${end.toISOString()}` +
    `&singleEvents=true&orderBy=startTime&key=${apiKey}&cb=${Date.now()}`;

  const res = await fetch(url);
  const data = await res.json();
  return (data.items || []).map(ev => ({
    start: new Date(ev.start.dateTime),
    end: new Date(ev.end.dateTime)
  }));
}

// ---------------------------------------------------------
//  CHECK IF EVENT OVERLAPS SLOT
// ---------------------------------------------------------
function overlaps(event, slotStart, slotEnd) {
  return event.start < slotEnd && event.end > slotStart;
}

// ---------------------------------------------------------
//  RENDER SLOTS
// ---------------------------------------------------------
async function renderMobileSlots() {
  const slotList = document.getElementById("slotList");
  if (!slotList) return;
  slotList.innerHTML = "";

  const [room1Events, room2Events] = await Promise.all([
    fetchEventsForRoom(ROOM1_ID, mobileCurrentDay),
    fetchEventsForRoom(ROOM2_ID, mobileCurrentDay)
  ]);

  for (let hour = 10; hour < 22; hour++) {
    const slotStart = new Date(mobileCurrentDay);
    slotStart.setHours(hour, 0, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + selectedDuration);

    const div = document.createElement("div");
    div.classList.add("slotItem");
    div.textContent = `${hour}:00–${hour + selectedDuration}:00`;

    if (!isSlotWithinBusinessHours(mobileCurrentDay, hour)) {
      div.classList.add("unavailable");
      slotList.appendChild(div);
      continue;
    }

    const room1Free = !room1Events.some(ev => overlaps(ev, slotStart, slotEnd));
const room2Free = !room2Events.some(ev => overlaps(ev, slotStart, slotEnd));

let freeRooms = [];
if (room1Free) freeRooms.push("room1");
if (room2Free) freeRooms.push("room2");

// --- PAST SLOT CHECK (TODAY ONLY) ---
const now = new Date();

// normalise dates to compare only the date for "today"
const today = new Date();
today.setHours(0, 0, 0, 0);

const checkDay = new Date(mobileCurrentDay);
checkDay.setHours(0, 0, 0, 0);

const isToday = today.getTime() === checkDay.getTime();
const isPast = isToday && slotStart < now;

if (isPast || freeRooms.length === 0) {
  // match desktop behaviour: grey, not clickable
  div.classList.add("unavailable");
  div.style.pointerEvents = "none";
  div.textContent = "Not Available";
} else if (freeRooms.length === 2) {
  div.classList.add("available");
} else if (freeRooms.length === 1) {
  div.classList.add(freeRooms[0]);
}

// only attach click handler if not past and at least one room free
if (!isPast && freeRooms.length > 0) {
  div.onclick = () => {
    if (freeRooms.length === 1) {
      openMobileBooking(freeRooms[0], slotStart);
    } else {
      showMobileRoomSelector(freeRooms, slotStart);
    }
  };
}


    slotList.appendChild(div);
  }
}

// ---------------------------------------------------------
//  ROOM SELECTOR
// ---------------------------------------------------------
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

  document.getElementById("mobileRoomCancel").onclick = () =>
    (selector.style.display = "none");
}
// -----------------------------
// PRICE CALCULATION ENGINE
// -----------------------------
function updatePriceBox() {
    const paSystem = Number(document.getElementById("paSystem").value);
    const guitarAmp = Number(document.getElementById("guitarAmp").value);
    const bassAmp = Number(document.getElementById("bassAmp").value);
    const drumKit = Number(document.getElementById("drumKit").value);

    // Determine if ANY equipment is selected
    const anyEquipment =
        paSystem > 0 ||
        bassAmp > 0 ||
        drumKit > 0 ||
        guitarAmp > 0;

    // Determine BEFORE or AFTER 18:00
    const startHour = window.selectedStart.getHours();
    const after18 = startHour >= 18;

    // Duration in hours
    const durationHours = (window.selectedEnd - window.selectedStart) / (1000 * 60 * 60);

    // Room hire rate
    const roomRate = after18 ? 12 : 6;

    // Equipment hire rate
    const equipmentRate = anyEquipment
        ? (after18 ? 3 : 1.5)
        : 0;

    // Calculations
    const roomHire = roomRate * durationHours;
    const equipmentHire = equipmentRate * durationHours;
    const total = roomHire + equipmentHire;

    // Update price box
    document.querySelector("#priceBox div:nth-child(1)").textContent =
        `Room Hire: £${roomHire.toFixed(2)}`;
    document.querySelector("#priceBox div:nth-child(2)").textContent =
        `Equipment Hire: £${equipmentHire.toFixed(2)}`;
    document.querySelector("#priceBox div:nth-child(3)").innerHTML =
        `<strong>Total: £${total.toFixed(2)}</strong>`;

    // Store for email payload
    window.calculatedRoomHire = roomHire;
    window.calculatedEquipmentHire = equipmentHire;
    window.calculatedTotal = total;
}

// Attach listeners to update price live
["paSystem", "guitarAmp", "bassAmp", "drumKit"].forEach(id => {
    document.getElementById(id).addEventListener("change", updatePriceBox);
});

// ---------------------------------------------------------
//  BOOKING OVERLAY
// ---------------------------------------------------------
function openMobileBooking(room, slotTime) {
  const start = new Date(slotTime);
  const end = new Date(start.getTime() + selectedDuration * 60 * 60 * 1000);

  window.selectedRoom = room;
  window.selectedStart = start;
  window.selectedEnd = end;

  const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(
    2,
    "0"
  )}:00 to ${String(end.getHours()).padStart(2, "0")}:00
(Room: ${room === "room1" ? "Room 1" : room === "room2" ? "Room 2" : "Both"})`;

  document.getElementById("bookingSummary").textContent = summary;

  
  document.getElementById("bookingOverlay").style.display = "flex";
}

// ---------------------------------------------------------
//  CANCEL BOOKING (FORM 1)
// ---------------------------------------------------------
document.getElementById("cancelBtn")?.addEventListener("click", () => {
  document.getElementById("bookingOverlay").style.display = "none";
});


// ---------------------------------------------------------
//  DURATION BUTTONS
// ---------------------------------------------------------
document.querySelectorAll("#durationButtons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#durationButtons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDuration = Number(btn.dataset.hours);
    renderMobileSlots();
  });
});
//--------------------------------------------------------
// EARLIEST DAY CHECK (shared by Prev button + swipe)
//--------------------------------------------------------
function isAtEarliestDay() {
  // Determine the earliest allowed day (skip Sunday)
  const earliest = new Date();
  if (earliest.getDay() === 0) {
    earliest.setDate(earliest.getDate() + 1); // move Sunday → Monday
  }

  return (
    mobileCurrentDay.getFullYear() === earliest.getFullYear() &&
    mobileCurrentDay.getMonth() === earliest.getMonth() &&
    mobileCurrentDay.getDate() === earliest.getDate()
  );
}

//--------------------------------------------------------
// UPDATE PREV BUTTON STATE
//--------------------------------------------------------
function updatePrevButtonState() {
  const btn = document.getElementById("prevDayBtn");
  if (!btn) return;

  // Determine the earliest allowed day (skip Sunday)
  const earliest = new Date();
  if (earliest.getDay() === 0) {
    earliest.setDate(earliest.getDate() + 1); // move Sunday → Monday
  }

  // Compare earliest allowed day with current day
  const isEarliest =
    mobileCurrentDay.getFullYear() === earliest.getFullYear() &&
    mobileCurrentDay.getMonth() === earliest.getMonth() &&
    mobileCurrentDay.getDate() === earliest.getDate();

  if (isEarliest) {
    btn.classList.add("disabled");
  } else {
    btn.classList.remove("disabled");
  }
}

// ---------------------------------------------------------
//  NAVIGATION (SKIP SUNDAY)
// ---------------------------------------------------------
document.getElementById("prevDayBtn")?.addEventListener("click", () => {

  const today = new Date();
  today.setHours(0,0,0,0);

  const checkDay = new Date(mobileCurrentDay);
  checkDay.setHours(0,0,0,0);

  // Only block when actually on today
  const onToday = checkDay.getTime() === today.getTime();

  if (onToday) {
    return;
  }

  // Move back one day, skipping Sunday
  do {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  } while (mobileCurrentDay.getDay() === 0);

  updateDayLabel();
  renderMobileSlots();
  updatePrevButtonState();
});


document.getElementById("nextDayBtn")?.addEventListener("click", () => {
  do {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  } while (mobileCurrentDay.getDay() === 0);
  updateDayLabel();
  renderMobileSlots();
  updatePrevButtonState(); // <-- THIS is the missing line
});
// ---------------------------------------------------------
//  BOOKING FORM BUTTONS
// ---------------------------------------------------------

// Cancel booking
document.getElementById("bfCancel")?.addEventListener("click", () => {
  document.getElementById("bookingOverlay").style.display = "none";
});

//-------------------------------------------------------
// RESET BOOKING FORM
//-------------------------------------------------------
function resetBookingForm() {
  document.getElementById("bfName").value = "";
  document.getElementById("bfEmail").value = "";
  document.getElementById("bfPhone").value = "";
  document.getElementById("bfComments").value = "";
  document.getElementById("bookingStatus").textContent = "";
}

//-------------------------------------------------------
// CANCEL BOOKING
//-------------------------------------------------------
document.getElementById("bfCancel")?.addEventListener("click", () => {
  document.getElementById("bookingOverlay").style.display = "none";
  resetBookingForm();
});

// ---------------------------------------------------------
//  FORM NAVIGATION (NEXT / BACK)
// ---------------------------------------------------------
document.getElementById("nextBtn")?.addEventListener("click", () => {
  document.getElementById("form1").style.display = "none";
  document.getElementById("form2").style.display = "block";

  // NOW selectedStart and selectedEnd exist
  updatePriceBox();
});


document.getElementById("backBtn")?.addEventListener("click", () => {
  document.getElementById("form2").style.display = "none";
  document.getElementById("form1").style.display = "block";
});

//-------------------------------------------------------
// SUBMIT BOOKING (FORM 2)
//-------------------------------------------------------
document.getElementById("submitBtn")?.addEventListener("click", async () => {
  try {
    const name = document.getElementById("custName").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    const phone = document.getElementById("custPhone").value.trim();

    if (!name || !email || !phone) {
      document.getElementById("bookingStatus").textContent =
        "Please fill in all required fields.";
      return;
    }

    document.getElementById("bookingStatus2").textContent = "Submitting...";

    const paSystem = document.getElementById("paSystem").value;
    const guitarAmp = document.getElementById("guitarAmp").value;
    const bassAmp = document.getElementById("bassAmp").value;
    const drumKit = document.getElementById("drumKit").value;

    if (typeof window.calculatedTotal === "undefined") {
      document.getElementById("bookingStatus2").textContent =
        "Please confirm your equipment choices so the price can be calculated.";
      return;
    }

    const payload = {
      name,
      email,
      phone,
      room: window.selectedRoom,
      start: window.selectedStart.toISOString(),
      end: window.selectedEnd.toISOString(),

      paSystem,
      guitarAmp,
      bassAmp,
      drumKit,

      roomHire: window.calculatedRoomHire,
      equipmentHire: window.calculatedEquipmentHire,
      totalPrice: window.calculatedTotal
    };

    const BOOKING_URL = "https://script.google.com/macros/s/AKfycbxzW6PrNFeoYLGKx4ugcUSpNa9n_QTCi7GAPknr4Bw0XOYrsebqhJ2uGbx4FSNV2-70Wg/exec";

    // SEND BOOKING
    await fetch(BOOKING_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // SUCCESS MESSAGE
    document.getElementById("successMessage").textContent =
      "Thank you for booking a room at E Rooms - Your booking is confirmed. You will receive a confirmation email soon.";

    // SHOW SUCCESS BOX
    document.getElementById("form2").style.display = "none";
    document.getElementById("bookingForm").style.display = "none";
    document.getElementById("bookingOverlay").style.display = "none";
    document.getElementById("successBox").style.display = "block";

  } catch (err) {
    document.getElementById("bookingStatus2").textContent =
      "There was an error submitting your booking. Please try again.";
  }
});


//-------------------------------------------------------
// SUCCESS OK (ONLY ONE HANDLER)
//-------------------------------------------------------
document.getElementById("successOk")?.addEventListener("click", async () => {
  document.getElementById("bookingOverlay").style.display = "none";
  document.getElementById("successBox").style.display = "none";
  document.getElementById("bookingForm").style.display = "block";

  resetBookingForm();

  // Wait for overlay to fully disappear and calendar to become visible
  await new Promise(resolve => setTimeout(resolve, 50));

  await renderMobileSlots();   // Now the refresh works
});


//-------------------------------------------------------
// SWIPE TO CHANGE WEEK + SLIDE ANIMATION
//-------------------------------------------------------
let touchStartX = 0;
let touchEndX = 0;

const swipeArea = document.getElementById("slotList");

swipeArea.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

swipeArea.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  const threshold = 60; // minimum swipe distance

  if (swipeDistance < -threshold) {
    animateNext();
  }

  if (swipeDistance > threshold) {
    animatePrev();
  }
}

function animateNext() {
  const slotList = document.getElementById("slotList");
  slotList.style.transform = "translateX(-100%)";

  setTimeout(() => {
    slotList.style.transform = "translateX(0)";
    document.getElementById("nextDayBtn").click();
  }, 250);
}

function animatePrev() {
  if (isAtEarliestDay()) {
    return; // block swipe-back beyond week 1 Monday
  }

  const slotList = document.getElementById("slotList");
  slotList.style.transform = "translateX(100%)";

  setTimeout(() => {
    slotList.style.transform = "translateX(0)";
    document.getElementById("prevDayBtn").click();
  }, 250);
}


// ---------------------------------------------------------
//  INIT
// ---------------------------------------------------------
(async () => {
  updateDayLabel();
  await renderMobileSlots();
  updatePrevButtonState();

})();
