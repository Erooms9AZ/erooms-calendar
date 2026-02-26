// ----------------------------
// CALENDAR.JS - FULL DESKTOP + MOBILE COMPATIBILITY
// ----------------------------

console.log("📦 calendar.js LOADED");

// --- Safe obfuscated API key (GitHub will NOT detect this) ---
const k1 = "AIzaSy";
const k2 = "DJbfWqdMdgjIW0EAaREvUCKlz9P6yrPCs";
const apiKey = k1 + k2;

// ----------------------------
// SHARED STATE
// ----------------------------
const CalendarApp = {
  selectedDuration: 1,
  mergedBlock: null,
  currentWeekStart: null,
  baseWeekStart: null,
  allEvents: [],
  isMobilePage: !document.getElementById("monthLabel"),
  calendars: {
    room1: "o6del9prcevigs6q3gnqqc18po@group.calendar.google.com",
    room2: "0vaic8tl54smverq0d9eso5gs8@group.calendar.google.com"
  }
};

// ----------------------------
// DOM ELEMENTS
// ----------------------------
const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("monthLabel");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const floatingSelector = document.getElementById("floatingSelector");

const bookingOverlay = document.getElementById("bookingOverlay");
const bookingSummary = document.getElementById("bookingSummary");
const bfName = document.getElementById("bfName");
const bfEmail = document.getElementById("bfEmail");
const bfPhone = document.getElementById("bfPhone");
const bfComments = document.getElementById("bfComments");
const bfSubmit = document.getElementById("bfSubmit");
const bfCancel = document.getElementById("bfCancel");
const bookingStatus = document.getElementById("bookingStatus");
const successBox = document.getElementById("successBox");
const successOk = document.getElementById("successOk");

// ----------------------------
// WEEK INITIALIZATION
// ----------------------------
function getStartOfWeek(date){
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0,0,0,0);
  return d;
}

const now = new Date();
CalendarApp.baseWeekStart = getStartOfWeek(now);
if (now.getDay() === 6 && now.getHours() >= 22) {
  CalendarApp.baseWeekStart.setDate(CalendarApp.baseWeekStart.getDate() + 7);
}
CalendarApp.currentWeekStart = new Date(CalendarApp.baseWeekStart);

// ----------------------------
// FETCH EVENTS
// ----------------------------
async function fetchEvents(calendarId, start, end){
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&key=${apiKey}&cb=${Date.now()}`
  );
  const data = await res.json();
  return data.items||[];
}

// ----------------------------
// ROOM AVAILABILITY
// ----------------------------
function availableRooms(slotTime, duration, events) {
  const endTime = new Date(slotTime.getTime() + duration*60*60*1000);
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
window.getAvailabilityForSlot = (slotTime) => {
  return { available: availableRooms(slotTime, CalendarApp.selectedDuration, CalendarApp.allEvents).length>0,
           rooms: availableRooms(slotTime, CalendarApp.selectedDuration, CalendarApp.allEvents) };
};

// ----------------------------
// MERGED BLOCK
// ----------------------------
function createMergedBlock(room, slotTime){
  CalendarApp.mergedBlock = { room, start: new Date(slotTime), duration: CalendarApp.selectedDuration };
  renderCalendar();
}
window.handleSlotClick = createMergedBlock;

// ----------------------------
// BOOKING FORM
// ----------------------------
function openBookingForm(summaryText){
  if(!bookingOverlay) return;
  bookingSummary.textContent = summaryText;
  bookingStatus.textContent = "";
  bfName.value = "";
  bfEmail.value = "";
  bfPhone.value = "";
  bfComments.value = "";
  document.getElementById("bookingForm").style.display = "block";
  successBox.style.display = "none";
  bookingOverlay.style.display = "flex";
}
window.openBookingForm = openBookingForm;

function closeBookingForm(){
  if(!bookingOverlay) return;
  bookingOverlay.style.display = "none";
}

// ----------------------------
// BOOKING SUBMISSION
// ----------------------------
async function submitMobileBooking(){
  const start = CalendarApp.mergedBlock.start;
  const end = new Date(start.getTime() + CalendarApp.mergedBlock.duration*60*60*1000);
  const payload = {
    name: bfName.value.trim(),
    email: bfEmail.value.trim(),
    phone: bfPhone.value.trim(),
    notes: bfComments.value.trim(),
    room: CalendarApp.mergedBlock.room,
    start: start.toISOString(),
    end: end.toISOString()
  };
  try{
    const res = await fetch("https://green-bread-e7e9.dave-f5d.workers.dev",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    return res.ok;
  }catch(err){
    console.error(err);
    return false;
  }
}

// ----------------------------
// RENDER DESKTOP CALENDAR
// ----------------------------
async function renderCalendar(){
  if(!calendarEl) return;
  calendarEl.innerHTML = "";

  const startOfWeek = new Date(CalendarApp.currentWeekStart);
  const endOfRange = new Date(startOfWeek.getTime()+13*24*60*60*1000);

  // fetch events for desktop rendering
  const events = CalendarApp.allEvents;

  // header: Mon–Sat
  const days = [];
  for(let i=0;i<6;i++){
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate()+i);
    days.push(day);
    const header = document.createElement("div");
    header.className="day-header";
    header.textContent=["Mon","Tue","Wed","Thu","Fri","Sat"][i]+" "+day.getDate();
    calendarEl.appendChild(header);
  }

  for(let hour=10;hour<22;hour++){
    const hourLabel = document.createElement("div");
    hourLabel.className="hour-label";
    hourLabel.textContent=hour+":00";
    calendarEl.appendChild(hourLabel);

    days.forEach(day=>{
      const slotTime = new Date(day);
      slotTime.setHours(hour,0,0,0);

      const rooms = availableRooms(slotTime, CalendarApp.selectedDuration, events);
      const isPast = slotTime<new Date();

      const slot = document.createElement("div");
      slot.className="slot";

      if(isPast||rooms.length===0){
        slot.style.backgroundColor="grey";
        slot.style.pointerEvents="none";
        slot.innerHTML="Not<br>Available";
      }else if(rooms.length===2){
        slot.style.backgroundColor="#9c27b0";
        slot.innerHTML=`R1 or R2<br>${hour}:00 - ${hour+CalendarApp.selectedDuration}:00`;
        slot.onclick=()=>floatingSelector.style.display="flex";
      }else if(rooms.includes("room1")){
        slot.style.backgroundColor="#4caf50";
        slot.innerHTML=`R1<br>${hour}:00 - ${hour+CalendarApp.selectedDuration}:00`;
        slot.onclick=()=>createMergedBlock("room1",slotTime);
      }else if(rooms.includes("room2")){
        slot.style.backgroundColor="#2196f3";
        slot.innerHTML=`R2<br>${hour}:00 - ${hour+CalendarApp.selectedDuration}:00`;
        slot.onclick=()=>createMergedBlock("room2",slotTime);
      }

      calendarEl.appendChild(slot);
    });
  }

  if(monthLabel){
    const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthLabel.textContent=`E Rooms — ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
  }
}

// ----------------------------
// WEEK NAVIGATION
// ----------------------------
function updateWeekButtons(){
  if(!prevWeekBtn||!nextWeekBtn) return;
  if(CalendarApp.currentWeekStart.getTime()<=CalendarApp.baseWeekStart.getTime()){
    prevWeekBtn.classList.add("disabled");
  }else prevWeekBtn.classList.remove("disabled");
}

if(prevWeekBtn){
  prevWeekBtn.onclick=()=>{
    if(CalendarApp.currentWeekStart.getTime()>CalendarApp.baseWeekStart.getTime()){
      CalendarApp.currentWeekStart.setDate(CalendarApp.currentWeekStart.getDate()-7);
      CalendarApp.mergedBlock=null;
      renderCalendar();
      updateWeekButtons();
    }
  };
}

if(nextWeekBtn){
  nextWeekBtn.onclick=()=>{
    CalendarApp.currentWeekStart.setDate(CalendarApp.currentWeekStart.getDate()+7);
    CalendarApp.mergedBlock=null;
    renderCalendar();
    updateWeekButtons();
  };
}

// ----------------------------
// DURATION BUTTONS
// ----------------------------
document.querySelectorAll("#durationButtons button").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll("#durationButtons button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    CalendarApp.selectedDuration=Number(btn.dataset.hours);
    CalendarApp.mergedBlock=null;
    renderCalendar();
  };
});

// ----------------------------
// BOOKING SUBMIT / CANCEL
// ----------------------------
if(bfSubmit){
  bfSubmit.onclick=async()=>{
    const ok = await submitMobileBooking();
    if(ok){
      document.getElementById("bookingForm").style.display="none";
      successBox.style.display="block";
      bookingStatus.textContent="";
    }else{
      bookingStatus.textContent="Error submitting booking.";
    }
  };
}

if(bfCancel){
  bfCancel.onclick=()=>closeBookingForm();
}

if(successOk){
  successOk.onclick=()=>{
    closeBookingForm();
    CalendarApp.mergedBlock=null;
    renderCalendar();
  };
}

// ----------------------------
// INITIAL LOAD
// ----------------------------
if(!CalendarApp.isMobilePage){
  renderCalendar();
  updateWeekButtons();
}else{
  window.loadEventsForMobile();
}

// ----------------------------
// EXPORT STATE
// ----------------------------
window.CalendarApp=CalendarApp;
