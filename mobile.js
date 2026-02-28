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

    if (freeRooms.length === 2) {
      div.classList.add("available");
    } else if (freeRooms.length === 1) {
      div.classList.add(freeRooms[0]);
    } else {
      div.classList.add("unavailable");
    }

    if (freeRooms.length > 0) {
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
  )}:00 to ${String(end.getHours()).padStart(2, "0")}:00`;

  document.getElementById("bookingSummary").textContent = summary;

  // SHOW OVERLAY
  document.getElementById("bookingOverlay").style.display = "flex";
}

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

// ---------------------------------------------------------
//  NAVIGATION (SKIP SUNDAY)
// ---------------------------------------------------------
document.getElementById("prevDayBtn")?.addEventListener("click", () => {
  do {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() - 1);
  } while (mobileCurrentDay.getDay() === 0);
  updateDayLabel();
  renderMobileSlots();
});

document.getElementById("nextDayBtn")?.addEventListener("click", () => {
  do {
    mobileCurrentDay.setDate(mobileCurrentDay.getDate() + 1);
  } while (mobileCurrentDay.getDay() === 0);
  updateDayLabel();
  renderMobileSlots();
});

// ---------------------------------------------------------
//  INIT
// ---------------------------------------------------------
(async () => {
  updateDayLabel();
  await renderMobileSlots();
})();
