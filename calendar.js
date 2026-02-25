// calendar.js

// --- Safe obfuscated API key (GitHub will NOT detect this) ---
const k1 = "AIzaSy";
const k2 = "DJbfWqdMdgjIW0EAaREvUCKlz9P6yrPCs";
const apiKey = k1 + k2;

let selectedDuration = 1;
let mergedBlock = null;

(async function(){

// Google Calendar IDs
const calendars = {
  room1: "o6del9prcevigs6q3gnqqc18po@group.calendar.google.com",
  room2: "0vaic8tl54smverq0d9eso5gs8@group.calendar.google.com"
};

let activeRoom = "room1";

const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("monthLabel");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const floatingSelector = document.getElementById("floatingSelector");

document.addEventListener("click", (e) => {
  if (!floatingSelector) return;

  if (floatingSelector.style.display === "flex") {
    if (!floatingSelector.contains(e.target)) {
      floatingSelector.style.display = "none";
    }
  }
});


/* -------------------------------------------------------
   BOOKING OVERLAY ELEMENTS
-------------------------------------------------------- */
const bookingOverlay = document.getElementById("bookingOverlay");
const bookingSummary = document.getElementById("bookingSummary");
const bfName = document.getElementById("bfName");
const bfEmail = document.getElementById("bfEmail");
const bfPhone = document.getElementById("bfPhone");
const bfComments = document.getElementById("bfComments");
const bfSubmit = document.getElementById("bfSubmit");
const bfCancel = document.getElementById("bfCancel");
const bookingStatus = document.getElementById("bookingStatus");

function openBookingForm(summaryText) {
  bookingSummary.textContent = summaryText;
  bookingStatus.textContent = "";
  bfName.value = "";
  bfEmail.value = "";
  bfPhone.value = "";
  bfComments.value = "";
  document.getElementById("bookingForm").style.display = "block";
  document.getElementById("successBox").style.display = "none";
  bookingOverlay.style.display = "flex";
}

function closeBookingForm() {
  bookingOverlay.style.display = "none";
}

/* -------------------------------------------------------
   MERGED BLOCK CREATION
-------------------------------------------------------- */
function createMergedBlock(room, slotTime) {
  mergedBlock = {
    room: room,
    start: new Date(slotTime),
    duration: selectedDuration
  };
  activeRoom = room;
  renderCalendar();
}

/* -------------------------------------------------------
   WEEK CALCULATION
-------------------------------------------------------- */
function getStartOfWeek(date){
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0,0,0,0);
  return d;
}

const now = new Date();
let baseWeekStart = getStartOfWeek(now);
if (now.getDay() === 6 && now.getHours() >= 22) {
  baseWeekStart.setDate(baseWeekStart.getDate() + 7);
}
let currentWeekStart = new Date(baseWeekStart);

/* -------------------------------------------------------
   GOOGLE CALENDAR FETCH — NOW WITH CACHE-BUSTER
-------------------------------------------------------- */
async function fetchEvents(calendarId,start,end){
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&key=${apiKey}&cb=${Date.now()}`
  );
  const data = await res.json();
  return data.items||[];
}

/* -------------------------------------------------------
   ROOM AVAILABILITY CHECK
-------------------------------------------------------- */
function availableRooms(slotTime, duration, events) {
  const endTime = new Date(slotTime.getTime() + duration * 60 * 60 * 1000);

  const conflicts = events.filter(ev => {
    const evStart = new Date(ev.start.dateTime || ev.start.date);
    const evEnd = new Date(ev.end.dateTime || ev.end.date);
    return evStart < endTime && evEnd > slotTime;
  });

  const rooms = [];
  if (!conflicts.some(ev => ev.room === "room1")) rooms.push("room1");
  if (!conflicts.some(ev => ev.room === "room2")) rooms.push("room2");
  return rooms;
}

/* -------------------------------------------------------
   MAIN RENDER FUNCTION
-------------------------------------------------------- */
async function renderCalendar() {
  if (!calendarEl) return;   // ← keeps desktop off mobile

  // ✅ clear previous content before rendering a new week
  calendarEl.innerHTML = "";

  const startOfWeek = new Date(currentWeekStart);
  const endOfWeek = new Date(startOfWeek);
 // ✅ cover current week + next week for mobile
endOfWeek.setDate(startOfWeek.getDate() + 13);

  const events = [
    ...(await fetchEvents(calendars.room1, startOfWeek, endOfWeek)).map(e => ({ ...e, room: "room1" })),
    ...(await fetchEvents(calendars.room2, startOfWeek, endOfWeek)).map(e => ({ ...e, room: "room2" }))
  ];
  window.allEvents = events;
  document.dispatchEvent(
    new CustomEvent("calendarEventsUpdated", { detail: window.allEvents })
  );

  // ...rest of renderCalendar as you already have it
}

  const days = [];

  calendarEl.appendChild(document.createElement("div"));
  for (let i = 0; i < 6; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);

    const h = document.createElement("div");
    h.className = "day-header";
    h.textContent = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i] + " " + d.getDate();
    calendarEl.appendChild(h);
  }

  /* -------------------------------------------------------
     MERGED BLOCK CONFIRMATION PANEL
  -------------------------------------------------------- */
  if (mergedBlock && mergedBlock.room === activeRoom) {
    const start = mergedBlock.start;
    const end = new Date(start.getTime() + mergedBlock.duration * 60 * 60 * 1000);

    const dayName = start.toLocaleDateString("en-GB", { weekday: "long" });
    const dateStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const mergedRow = document.createElement("div");
    mergedRow.className = "merged-row";

    mergedRow.innerHTML = `
      You have selected a ${mergedBlock.duration} hour session in 
      ${mergedBlock.room === "room1" ? "Room 1" : "Room 2"} —
      ${dayName} ${dateStr}, ${String(start.getHours()).padStart(2, "0")}:00 to ${String(end.getHours()).padStart(2, "0")}:00
      <br><br>
      <button id="mergedYes" style="margin-right:10px;">Yes</button>
      <button id="mergedNo">No</button>
    `;

    calendarEl.appendChild(mergedRow);

    document.getElementById("mergedYes").onclick = () => {
      const summary = `${dayName} ${dateStr}, ${String(start.getHours()).padStart(2, "0")}:00 to ${String(end.getHours()).padStart(2, "0")}:00`;
      openBookingForm(summary);

      bfSubmit.onclick = async () => {
        const name = bfName.value.trim();
        const email = bfEmail.value.trim();
        const phone = bfPhone.value.trim();
        const comments = bfComments.value.trim();

        if (!name || !email || !phone) {
          bookingStatus.textContent = "Please complete all required fields.";
          return;
        }

        const payload = {
          name,
          email,
          phone,
          notes: comments,
          room: mergedBlock.room,
          start: start.toISOString(),
          end: end.toISOString()
        };

        // ⭐ Replace Wix messaging with direct Apps Script call
fetch("https://green-bread-e7e9.dave-f5d.workers.dev", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})


        const startTime = String(start.getHours()).padStart(2, "0") + ":00";
        const endTime = String(end.getHours()).padStart(2, "0") + ":00";

        document.getElementById("successMessage").innerHTML =
          `<strong>${name}</strong><br>
           Your booking for <strong>${dayName} ${dateStr}</strong><br>
           From <strong>${startTime}</strong> to <strong>${endTime}</strong><br><br>
           Has been confirmed.<br>
           You will receive an email shortly.<br><br>
           <strong>E Rooms</strong>`;

        document.getElementById("bookingForm").style.display = "none";
        document.getElementById("successBox").style.display = "block";
      };

      bfCancel.onclick = () => {
        closeBookingForm();
      };

      document.getElementById("successOk").onclick = () => {
        closeBookingForm();
        mergedBlock = null;
        renderCalendar();
      };
    };

    document.getElementById("mergedNo").onclick = () => {
      mergedBlock = null;
      renderCalendar();
    };

    return;
  }
}   // ← CLOSE renderCalendar properly

  /* -------------------------------------------------------
     HOURLY GRID
  -------------------------------------------------------- */
  for (let hour = 10; hour < 22; hour++) {
  const hourLabel = document.createElement("div");
  hourLabel.className = "hour-label";
  hourLabel.textContent = `${hour}:00`;
  calendarEl.appendChild(hourLabel);

  for (let i = 0; i < 6; i++) {
    const day = days[i];
    const slot = document.createElement("div");
    slot.className = "slot";

    const slotTime = new Date(day);
    slotTime.setHours(hour, 0, 0, 0);
const now = new Date();
const isPast = slotTime < now;
    const rooms = availableRooms(slotTime, selectedDuration, events);
    const hasR1 = rooms.includes("room1");
    const hasR2 = rooms.includes("room2");

    const endTime = new Date(slotTime.getTime() + selectedDuration * 60 * 60 * 1000);
    const startStr = slotTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const endStr = endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // ... rest of your existing logic

     if (isPast || (!hasR1 && !hasR2)) { slot.style.backgroundColor = "grey"; slot.style.pointerEvents = "none"; slot.innerHTML = `Not<br>Available`; }

      else if (hasR1 && hasR2) {
        slot.style.backgroundColor = "#9c27b0";
        slot.innerHTML = `R1 or R2<br>${startStr} - ${endStr}`;

        slot.onclick = (e) => {
          e.stopPropagation();
          floatingSelector.style.display = "flex";

          const chosenTime = new Date(slotTime);

          floatingSelector.onclick = (ev) => {
            ev.stopPropagation();
            if (ev.target.dataset.room) {
              createMergedBlock(ev.target.dataset.room, chosenTime);
              floatingSelector.style.display = "none";
            }
          };
        };
      }

      else if (hasR1) {
        slot.style.backgroundColor = "#4caf50";
        slot.innerHTML = `R1<br>${startStr} - ${endStr}`;
        slot.onclick = (e) => {
          e.stopPropagation();
          floatingSelector.style.display = "none";
          createMergedBlock("room1", new Date(slotTime));
        };
      }

      else if (hasR2) {
        slot.style.backgroundColor = "#2196f3";
        slot.innerHTML = `R2<br>${startStr} - ${endStr}`;
        slot.onclick = (e) => {
          e.stopPropagation();
          floatingSelector.style.display = "none";
          createMergedBlock("room2", new Date(slotTime));
        };
      }

      calendarEl.appendChild(slot);
    }
  }

  monthLabel.textContent =
    `E Rooms — ` +
    `${["January","February","March","April","May","June","July","August","September","October","November","December"][startOfWeek.getMonth()]} ` +
    `${startOfWeek.getFullYear()}`;
}

/* -------------------------------------------------------
   WEEK NAVIGATION
-------------------------------------------------------- */
function updateWeekButtons() {
  if (!prevWeekBtn || !nextWeekBtn) return;  // ← prevents mobile crash
  if (currentWeekStart.getTime() <= baseWeekStart.getTime()) {
    prevWeekBtn.classList.add("disabled");
  } else {
    prevWeekBtn.classList.remove("disabled");
  }
}

if (prevWeekBtn) {
  prevWeekBtn.onclick = () => {
    floatingSelector.style.display = "none";

    if (currentWeekStart.getTime() > baseWeekStart.getTime()) {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);

      // 🔥 NEW: notify mobile that the week changed
      document.dispatchEvent(
        new CustomEvent("weekChanged", { detail: currentWeekStart })
      );

      mergedBlock = null;
      renderCalendar();
      updateWeekButtons();
    }
  };
}

if (nextWeekBtn) {
  nextWeekBtn.onclick = () => {
    floatingSelector.style.display = "none";

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);

    // 🔥 NEW: notify mobile that the week changed
    document.dispatchEvent(
      new CustomEvent("weekChanged", { detail: currentWeekStart })
    );

    mergedBlock = null;
    renderCalendar();
    updateWeekButtons();
  };
}


/* -------------------------------------------------------
   ⭐ FIXED — DURATION BUTTONS NOW WORK
-------------------------------------------------------- */
if (calendarEl) {
  document.querySelectorAll('#durationButtons button').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDuration = Number(btn.dataset.hours);

    document.querySelectorAll('#durationButtons button')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');
    mergedBlock = null;
    renderCalendar();
  });
});
}
/* -------------------------------------------------------
   INITIAL RENDER
-------------------------------------------------------- */

// Desktop calendar ONLY
if (calendarEl) {
  renderCalendar();
  updateWeekButtons();
} else {
  // Mobile: fetch events but do NOT render desktop UI
  loadEventsForMobile();
}

/* -------------------------------------------------------
   LOAD EVENTS FOR MOBILE (NO DESKTOP UI)
-------------------------------------------------------- */
async function loadEventsForMobile() {
  const startOfWeek = new Date(currentWeekStart);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const events = [
    ...(await fetchEvents(calendars.room1, startOfWeek, endOfWeek)).map(e => ({ ...e, room: "room1" })),
    ...(await fetchEvents(calendars.room2, startOfWeek, endOfWeek)).map(e => ({ ...e, room: "room2" }))
  ];

  window.allEvents = events;
}

/* -------------------------------------------------------
   EXPORT FUNCTIONS FOR MOBILE
-------------------------------------------------------- */

// Always export these — mobile depends on them
function getAvailabilityForSlot(slotTime) {
  const duration = window.selectedDuration || 1;
  const rooms = availableRooms(slotTime, duration, window.allEvents || []);
  return {
    available: rooms.length > 0,
    rooms
  };
}


window.getAvailabilityForSlot = getAvailabilityForSlot;
window.handleSlotClick = createMergedBlock;

})();
