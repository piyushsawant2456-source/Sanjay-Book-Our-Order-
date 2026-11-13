
import { auth, db, firebaseReady } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";


const $ = id => document.getElementById(id);

let currentOwner = null;
let bookings = [];
let selectedBookingId = null;
let prices = {};
let unsubscribeBookings = null;

const provider = new GoogleAuthProvider();

const services = [
  "Traditional Photo Shoot",
  "Traditional Video Shoot",
  "Candid Photo Shoot",
  "Drone Shoot (Photos + Videos)",
  "Cinematic Films",
  "Pre-Wedding",
  "Live Screen Wall 4K",
  "Live Video Shoot with Crane",
  "Album Types"
];

const eventTypes = [
  "Wedding",
  "Barase",
  "Baby Shower",
  "Dohale Jevan",
  "Birthday",
  "Shop Opening",
  "Car Delivery",
  "Other Events"
];

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function showMessage(message) {
  const element = $("loginMessage");
  if (element) element.textContent = message;
}

function safeText(value) {
  return String(value ?? "");
}


// AUTHENTICATION

$("loginButton")?.addEventListener("click", async () => {
  if (!firebaseReady) {
    showMessage("Firebase configuration is required.");
    return;
  }

  try {
    showMessage("Signing in...");

    await signInWithPopup(auth, provider);

  } catch (error) {
    console.error(error);
    showMessage("Login failed: " + error.message);
  }
});


$("logoutButton")?.addEventListener("click", async () => {
  if (!currentOwner) return;

  try {
    await signOut(auth);
  } catch (error) {
    alert("Logout failed: " + error.message);
  }
});


if (firebaseReady) {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      currentOwner = null;

      $("loginSection").hidden = false;
      $("adminDashboard").hidden = true;

      if (unsubscribeBookings) {
        unsubscribeBookings();
        unsubscribeBookings = null;
      }

      return;
    }

    try {
      const ownerRef = doc(db, "owners", user.uid);
      const ownerSnapshot = await getDoc(ownerRef);

      if (!ownerSnapshot.exists() ||
          ownerSnapshot.data().active !== true) {
        await signOut(auth);
        showMessage("Access denied. Contact studio administrator.");
        return;
      }

      currentOwner = user;

      $("ownerEmail").textContent = user.email || "Owner";
      $("loginSection").hidden = true;
      $("adminDashboard").hidden = false;

      await loadPrices();
      listenBookings();

    } catch (error) {
      console.error(error);
      showMessage("Owner verification failed.");
    }
  });
} else {
  showMessage("Firebase setup is not complete yet.");
}


// DASHBOARD NAVIGATION

document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.section;

    document.querySelectorAll(".admin-section")
      .forEach(section => section.hidden = true);

    $(target).hidden = false;

    document.querySelectorAll(".nav-button")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    if (target === "pricing") renderPriceEditor();
    if (target === "finance") renderFinance();
    if (target === "calendar") renderCalendar();
  });
});


// BOOKINGS

function listenBookings() {
  if (unsubscribeBookings) unsubscribeBookings();

  const bookingsQuery = query(
    collection(db, "bookings"),
    orderBy("createdAt", "desc")
  );

  unsubscribeBookings = onSnapshot(
    bookingsQuery,
    snapshot => {
      bookings = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      renderOverview();
      renderBookings();
      renderFinance();
      renderCalendar();
    },
    error => {
      console.error(error);
      alert("Unable to load bookings. Check Firestore permissions.");
    }
  );
}


function renderOverview() {
  $("totalBookings").textContent = bookings.length;

  $("pendingBookings").textContent =
    bookings.filter(b => b.status === "Pending").length;

  $("confirmedBookings").textContent =
    bookings.filter(b => b.status === "Confirmed").length;

  $("completedBookings").textContent =
    bookings.filter(b => b.status === "Completed").length;

  const recent = bookings.slice(0, 5);

  $("recentBookings").replaceChildren();

  if (!recent.length) {
    $("recentBookings").textContent = "No bookings available.";
    return;
  }

  recent.forEach(booking => {
    const card = createBookingCard(booking);
    $("recentBookings").appendChild(card);
  });
}


function createBookingCard(booking) {
  const card = document.createElement("div");
  card.className = "booking-card";

  const heading = document.createElement("h4");
  heading.textContent =
    booking.customer?.fullName || "Customer";

  const details = document.createElement("p");
  details.textContent =
    `${booking.eventType || "Event"} • ${booking.status || "Pending"} • ${booking.id}`;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "VIEW DETAILS";
  button.className = "nav-button";

  button.addEventListener("click", () => {
    openBooking(booking.id);
  });

  card.append(heading, details, button);
  return card;
}


// BOOKING SEARCH AND FILTER

$("bookingSearch")?.addEventListener("input", renderBookings);
$("bookingFilter")?.addEventListener("change", renderBookings);


function renderBookings() {
  const list = $("bookingsList");
  list.replaceChildren();

  const search = ($("bookingSearch")?.value || "")
    .toLowerCase().trim();

  const filter = $("bookingFilter")?.value || "all";

  const filtered = bookings.filter(booking => {
    const name = safeText(booking.customer?.fullName).toLowerCase();
    const id = booking.id.toLowerCase();

    const matchesSearch =
      name.includes(search) || id.includes(search);

    const matchesFilter =
      filter === "all" || booking.status === filter;

    return matchesSearch && matchesFilter;
  });

  if (!filtered.length) {
    list.textContent = "No matching bookings found.";
    return;
  }

  filtered.forEach(booking => {
    list.appendChild(createBookingCard(booking));
  });
}


// BOOKING DETAILS

function openBooking(id) {
  const booking = bookings.find(item => item.id === id);
  if (!booking) return;

  selectedBookingId = id;

  $("bookingDetails").hidden = false;

  const content = $("bookingDetailsContent");
  content.replaceChildren();

  const fields = [
    ["Booking ID", booking.id],
    ["Customer", booking.customer?.fullName],
    ["Contact", booking.customer?.contact],
    ["WhatsApp", booking.customer?.whatsapp],
    ["Address", booking.customer?.address],
    ["Event", booking.eventType],
    ["Wedding Arrangement", booking.weddingType],
    ["Event Timing", booking.eventTiming],
    ["Dates", (booking.dates || [])
      .map(d => `${d.event}: ${d.date}`).join(", ")],
    ["Services", (booking.services || []).join(", ")],
    ["Requirements", booking.requirements],
    ["Additional Message", booking.additionalMessage]
  ];

  fields.forEach(([label, value]) => {
    const paragraph = document.createElement("p");
    paragraph.style.marginBottom = "10px";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    paragraph.append(strong, document.createTextNode(safeText(value) || "—"));
    content.appendChild(paragraph);
  });

  $("bookingStatus").value = booking.status || "Pending";
  $("adminTotal").value = booking.totalAmount ?? "";
  $("advanceAmount").value = booking.advanceAmount ?? "";
  $("paymentStatus").value = booking.paymentStatus || "Unpaid";
  $("paymentNote").value = "";
  $("adminNotes").value = booking.adminNotes || "";

  updatePaymentSummary();
  renderPaymentHistory(booking);

  $("bookingDetails").scrollIntoView({ behavior: "smooth" });
}


// PAYMENT CALCULATION

function updatePaymentSummary() {
  const total = Number($("adminTotal").value || 0);
  const advance = Number($("advanceAmount").value || 0);
  const remaining = total - advance;

  $("financeTotal").textContent = money(total);
  $("financeAdvance").textContent = money(advance);
  $("financeRemaining").textContent = money(remaining);
}

$("adminTotal")?.addEventListener("input", updatePaymentSummary);
$("advanceAmount")?.addEventListener("input", updatePaymentSummary);


// SAVE BOOKING CHANGES

$("saveBookingButton")?.addEventListener("click", async () => {
  if (!currentOwner || !selectedBookingId) return;

  const total = Number($("adminTotal").value);
  const advance = Number($("advanceAmount").value);

  if (!Number.isFinite(total) || !Number.isFinite(advance) ||
      total < 0 || advance < 0 || advance > total) {
    alert("Please enter valid amounts. Advance cannot exceed total.");
    return;
  }

  try {
    await updateDoc(
      doc(db, "bookings", selectedBookingId),
      {
        status: $("bookingStatus").value,
        totalAmount: total,
        advanceAmount: advance,
        remainingAmount: total - advance,
        paymentStatus: $("paymentStatus").value,
        adminNotes: $("adminNotes").value.trim(),
        updatedAt: serverTimestamp()
      }
    );

    alert("Booking updated successfully.");

  } catch (error) {
    console.error(error);
    alert("Could not update booking. Check permissions.");
  }
});


// RECORD PAYMENT

$("addPaymentButton")?.addEventListener("click", async () => {
  if (!currentOwner || !selectedBookingId) return;

  const amount = Number($("paymentNote").dataset.amount || 0);
  const note = $("paymentNote").value.trim();

  const paymentAmount = Number(
    prompt("Enter payment received amount (₹):")
  );

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    alert("Enter a valid payment amount.");
    return;
  }

  const booking = bookings.find(b => b.id === selectedBookingId);

  if (!booking) return;

  const total = Number(booking.totalAmount || 0);
  const previousAdvance = Number(booking.advanceAmount || 0);
  const newAdvance = previousAdvance + paymentAmount;

  if (newAdvance > total) {
    alert("Payment cannot exceed the remaining amount.");
    return;
  }

  try {
    await addDoc(
      collection(db, "bookings", selectedBookingId, "payments"),
      {
        amount: paymentAmount,
        note,
        recordedBy: currentOwner.uid,
        createdAt: serverTimestamp()
      }
    );

    await updateDoc(
      doc(db, "bookings", selectedBookingId),
      {
        advanceAmount: newAdvance,
        remainingAmount: total - newAdvance,
        paymentStatus:
          newAdvance === total ? "Paid" : "Partial",
        updatedAt: serverTimestamp()
      }
    );

    $("paymentNote").value = "";
    alert("Payment recorded successfully.");

  } catch (error) {
    console.error(error);
    alert("Payment could not be recorded.");
  }
});


async function renderPaymentHistory(booking) {
  const container = $("paymentHistory");
  container.textContent = "Loading payment history...";

  try {
    const snapshot = await getDocs(
      collection(db, "bookings", booking.id, "payments")
    );

    container.replaceChildren();

    if (snapshot.empty) {
      container.textContent = "No payment records.";
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const paragraph = document.createElement("p");

      paragraph.textContent =
        `${money(data.amount)} — ${data.note || "Payment received"}`;

      container.appendChild(paragraph);
    });

  } catch (error) {
    console.error(error);
    container.textContent = "Unable to load payment history.";
  }
}


// DELETE BOOKING

$("deleteBookingButton")?.addEventListener("click", async () => {
  if (!currentOwner || !selectedBookingId) return;

  const confirmed = confirm(
    "Are you sure you want to delete this booking?"
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "bookings", selectedBookingId));

    selectedBookingId = null;
    $("bookingDetails").hidden = true;

    alert("Booking deleted.");

  } catch (error) {
    console.error(error);
    alert("Unable to delete booking.");
  }
});


// SERVICE PRICING

async function loadPrices() {
  try {
    const snapshot = await getDoc(doc(db, "settings", "servicePrices"));

    prices = snapshot.exists() ? snapshot.data().prices || {} : {};

    renderPriceEditor();

  } catch (error) {
    console.error(error);
    alert("Unable to load service prices.");
  }
}


function renderPriceEditor() {
  const event = $("priceEvent").value;
  const container = $("priceServices");

  container.replaceChildren();

  services.forEach(service => {
    const row = document.createElement("div");
    row.className = "price-row";

    const label = document.createElement("label");
    label.textContent = service;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.placeholder = "Enter ₹ price";
    input.dataset.service = service;

    const value = prices[event]?.[service];

    input.value = value === undefined ? "" : value;

    if (service === "Traditional Photo Shoot") {
      input.value = "0";
      input.readOnly = true;
    }

    row.append(label, input);
    container.appendChild(row);
  });
}

$("priceEvent")?.addEventListener("change", renderPriceEditor);


$("savePricesButton")?.addEventListener("click", async () => {
  if (!currentOwner) return;

  const event = $("priceEvent").value;
  const inputs = $("priceServices").querySelectorAll("input");

  const eventPrices = {};

  for (const input of inputs) {
    const service = input.dataset.service;

    if (service === "Traditional Photo Shoot") {
      eventPrices[service] = 0;
      continue;
    }

    if (input.value.trim() === "") continue;

    const value = Number(input.value);

    if (!Number.isFinite(value) || value < 0) {
      alert("Enter valid service prices.");
      return;
    }

    eventPrices[service] = value;
  }

  try {
    prices[event] = eventPrices;

    await setDoc(
      doc(db, "settings", "servicePrices"),
      {
        prices,
        updatedAt: serverTimestamp(),
        updatedBy: currentOwner.uid
      },
      { merge: true }
    );

    alert("Service prices saved successfully.");

  } catch (error) {
    console.error(error);
    alert("Could not save prices. Check permissions.");
  }
});


// FINANCE DASHBOARD

function renderFinance() {
  const total = bookings.reduce(
    (sum, b) => sum + Number(b.totalAmount || 0), 0
  );

  const advance = bookings.reduce(
    (sum, b) => sum + Number(b.advanceAmount || 0), 0
  );

  const remaining = bookings.reduce(
    (sum, b) => sum + Number(b.remainingAmount || 0), 0
  );

  $("financeBookingTotal").textContent = money(total);
  $("financeAdvanceTotal").textContent = money(advance);
  $("financeRemainingTotal").textContent = money(remaining);

  const records = $("financeRecords");
  records.replaceChildren();

  bookings.forEach(booking => {
    const row = document.createElement("div");
    row.className = "booking-item";

    const title = document.createElement("h4");
    title.textContent =
      booking.customer?.fullName || "Customer";

    const details = document.createElement("p");
    details.textContent =
      `${booking.eventType || "Event"} | Total: ${money(booking.totalAmount)} | Received: ${money(booking.advanceAmount)} | Remaining: ${money(booking.remainingAmount)}`;

    row.append(title, details);
    records.appendChild(row);
  });

  if (!bookings.length) {
    records.textContent = "No finance records.";
  }
}


// CALENDAR

function renderCalendar() {
  const selectedDate = $("calendarDate")?.value;
  const container = $("calendarBookings");

  if (!selectedDate) return;

  container.replaceChildren();

  const matching = bookings.filter(booking =>
    (booking.dates || []).some(date => date.date === selectedDate)
  );

  if (!matching.length) {
    container.textContent = "No bookings on this date.";
    return;
  }

  matching.forEach(booking => {
    container.appendChild(createBookingCard(booking));
  });
}

$("calendarDate")?.addEventListener("change", renderCalendar);
