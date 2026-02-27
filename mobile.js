<body>

<!-- Desktop placeholders (prevent calendar-v3.js from crashing on mobile) -->
<div id="calendar" style="display:none"></div>
<div id="monthLabel" style="display:none"></div>
<button id="prevWeekBtn" style="display:none"></button>
<button id="nextWeekBtn" style="display:none"></button>
<div id="floatingSelector" style="display:none"></div>

<div id="bookingOverlay" style="display:none"></div>
<div id="bookingSummary" style="display:none"></div>
<input id="bfName" style="display:none">
<input id="bfEmail" style="display:none">
<input id="bfPhone" style="display:none">
<textarea id="bfComments" style="display:none"></textarea>
<button id="bfSubmit" style="display:none"></button>
<button id="bfCancel" style="display:none"></button>
<div id="bookingStatus" style="display:none"></div>
<form id="bookingForm" style="display:none"></form>
<div id="successBox" style="display:none"></div>
<button id="successOk" style="display:none"></button>

<div id="mobileContainer">

  <!-- Mobile Header -->
  <div id="mobileHeader">
    <button id="prevDayBtn">←</button>
    <div id="dayLabel">Loading…</div>
    <button id="nextDayBtn">→</button>
  </div>

  <!-- Duration Buttons -->
  <div id="durationButtons">
    <button data-hours="1" class="active">1 Hour</button>
    <button data-hours="2">2 Hours</button>
    <button data-hours="3">3 Hours</button>
  </div>

  <!-- Room Selector -->
  <div id="mobileRoomSelector" style="display:none;">
    <button class="room-btn" data-room="room1">Room 1</button>
    <button class="room-btn" data-room="room2">Room 2</button>
    <button id="mobileRoomCancel">Cancel</button>
  </div>

  <!-- Slot List -->
  <div id="slotList"></div>

  <!-- Booking Overlay -->
  <div id="bookingOverlay" class="overlay" style="display:none;">
    
    <div id="bookingForm" class="booking-box">
      <h3>Booking Summary</h3>
      <div id="bookingSummary"></div>
      <br>

      <label>Name*</label><br>
      <input id="bfName" type="text" style="width:100%"><br><br>

      <label>Email*</label><br>
      <input id="bfEmail" type="email" style="width:100%"><br><br>

      <label>Phone*</label><br>
      <input id="bfPhone" type="text" style="width:100%"><br><br>

      <label>Comments</label><br>
      <textarea id="bfComments" style="width:100%"></textarea><br><br>

      <div id="bookingStatus" style="color:red;"></div><br>

      <button id="bfSubmit">Submit</button>
      <button id="bfCancel">Cancel</button>
    </div>

    <div id="successBox" class="booking-box" style="display:none;">
      <div id="successMessage"></div>
      <br>
      <button id="successOk">OK</button>
    </div>

  </div>

</div><!-- END mobileContainer -->

<!-- IMPORTANT: mobile.js FIRST, calendar-v3.js SECOND -->
<script src="mobile.js"></script>
<script src="calendar-v3.js"></script>

</body>
