
import { db, firebaseReady } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const eventGrid = $("eventGrid");
const eventType = $("eventType");
const weddingOptions = $("weddingOptions");
const otherEventTime = $("otherEventTime");
const eventDates = $("eventDates");
const servicesContainer = $("servicesContainer");
const bookingSummary = $("bookingSummary");

let selectedServices = [];
let dateEntries = [];

const serviceLists = {
  Wedding: [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Candid Photo Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films (3 Reels + 1 Video)",
    "Pre-Wedding",
    "Live Screen Wall 4K",
    "Live Video Shoot with Crane",
    "Album Types"
  ],
  Barase: [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Live Screen Wall 4K",
    "Album Types"
  ],
  "Baby Shower": [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Live Screen Wall 4K",
    "Album Types"
  ],
  "Dohale Jevan": [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Live Screen Wall 4K",
    "Album Types"
  ],
  Birthday: [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Live Screen Wall 4K",
    "Album Types"
  ],
  "Shop Opening": [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Live Screen Wall 4K",
    "Album Types"
  ],
  "Car Delivery": [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Album Types"
  ],
  "Other Events": [
    "Traditional Photo Shoot",
    "Traditional Video Shoot",
    "Candid Photo Shoot",
    "Drone Shoot (Photos + Videos)",
    "Cinematic Films",
    "Pre-Wedding",
    "Live Screen Wall 4K",
    "Live Video Shoot with Crane",
    "Album Types"
  ]
};

const weddingDates = {
  "साखरपुडा + गावदेव + लग्न": [
    "साखरपुडा",
    "गावदेव",
    "लग्न"
  ],
  "गावदेव + लग्न": [
    "गावदेव",
    "लग्न"
  ]
};

const serviceState = {
  "Traditional Photo Shoot": 0
};

// EVENT SELECTION

eventGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".event-card");
  if (!card) return;

  document.querySelectorAll(".event-card")
    .forEach(btn => btn.classList.remove("active"));

  card.classList.add("active");

  const type = card.dataset.event;
  eventType.value = type;

  weddingOptions.hidden = type !== "Wedding";
  otherEventTime.hidden = type !== "Other Events";

  document.querySelectorAll('input[name="weddingType"]')
    .forEach(input => input.checked = false);

  $("eventTiming").value = "";

  selectedServices = [];
  dateEntries = [];

  servicesContainer.innerHTML =
    '<p class="empty-message">Select your event arrangement first.</p>';

  if (type === "Wedding") {
    eventDates.innerHTML =
      '<p class="empty-message">Select your wedding arrangement first.</p>';
  } else {
    renderDates();
    renderServices();
  }

  updateSummary();
});

// WEDDING ARRANGEMENT

document.querySelectorAll('input[name="weddingType"]')
  .forEach(input => {
    input.addEventListener("change", () => {
      dateEntries = [];
      selectedServices = [];

      renderDates();
      renderServices();
      updateSummary();
    });
  });

// EVENT DATES

function getDateNames() {
  const type = eventType.value;

  if (type === "Wedding") {
    const weddingType = document.querySelector(
      'input[name="weddingType"]:checked'
    )?.value;

    return weddingDates[weddingType] || [];
  }

  return type ? [type] : [];
}

function renderDates() {
  const names = getDateNames();

  if (!names.length) {
    eventDates.innerHTML =
      '<p class="empty-message">Please select event details first.</p>';
    return;
  }

  eventDates.innerHTML = "";

  names.forEach(name => {
    const group = document.createElement("div");
    group.className = "date-group";

    const title = document.createElement("h3");
    title.textContent = name;
    title.style.margin = "15px 0 10px";
    group.appendChild(title);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+ ADD DATE";
    addButton.className = "secondary-button";
    addButton.style.marginBottom = "12px";

    const rows = document.createElement("div");
    rows.className = "date-rows";

    addButton.addEventListener("click", () => {
      addDateRow(rows, name);
    });

    group.appendChild(addButton);
    group.appendChild(rows);
    eventDates.appendChild(group);

    addDateRow(rows, name);
  });
}

function addDateRow(container, name) {
  const row = document.createElement("div");
  row.className = "date-row";

  const input = document.createElement("input");
  input.type = "date";
  input.required = true;
  input.setAttribute("aria-label", name + " date");

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "REMOVE";
  remove.className = "secondary-button";
  remove.style.width = "auto";
  remove.style.padding = "10px";

  input.addEventListener("change", () => {
    dateEntries = Array.from(
      eventDates.querySelectorAll(".date-row")
    ).flatMap(dateRow => {
      const dateInput = dateRow.querySelector('input[type="date"]');
      const heading = dateRow.parentElement.parentElement
        .querySelector("h3").textContent;

      return dateInput.value
        ? [{ event: heading, date: dateInput.value }]
        : [];
    });

    updateSummary();
  });

  remove.addEventListener("click", () => {
    const rows = container.querySelectorAll(".date-row");

    if (rows.length <= 1) {
      input.value = "";
      dateEntries = dateEntries.filter(
        item => !(item.event === name)
      );
    } else {
      row.remove();
      input.dispatchEvent(new Event("change"));
    }

    updateSummary();
  });

  row.appendChild(input);
  row.appendChild(remove);
  container.appendChild(row);
}

// SERVICES

function renderServices() {
  const type = eventType.value;

  if (!type) return;

  if (type === "Wedding" &&
      !document.querySelector('input[name="weddingType"]:checked')) {
    servicesContainer.innerHTML =
      '<p class="empty-message">Select wedding arrangement first.</p>';
    return;
  }

  servicesContainer.innerHTML = "";

  serviceLists[type].forEach(service => {
    const label = document.createElement("label");
    label.className = "service-card";

    const left = document.createElement("div");

    const name = document.createElement("div");
    name.className = "service-name";
    name.textContent = service;

    const description = document.createElement("div");
    description.className = "service-description";
    description.textContent =
      service === "Traditional Photo Shoot"
        ? "FREE by Studio"
        : "Price confirmed by Studio";

    left.appendChild(name);
    left.appendChild(description);

    const right = document.createElement("span");
    right.className = "service-price";
    right.textContent =
      service === "Traditional Photo Shoot" ? "FREE" : "As per rate";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = service;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedServices.push(service);
      } else {
        selectedServices = selectedServices.filter(
          item => item !== service
        );
      }

      updateSummary();
    });

    label.appendChild(left);
    label.appendChild(right);
    label.appendChild(checkbox);

    servicesContainer.appendChild(label);
  });
}

// BOOKING SUMMARY

function updateSummary() {
  const type = eventType.value || "Not selected";

  const lines = [];

  lines.push("Event: " + type);

  const weddingType = document.querySelector(
    'input[name="weddingType"]:checked'
  )?.value;

  if (weddingType) {
    lines.push("Arrangement: " + weddingType);
  }

  if (type === "Other Events" && $("eventTiming").value) {
    lines.push("Timing: " + $("eventTiming").value);
  }

  if (dateEntries.length) {
    lines.push("Dates: " + dateEntries.map(
      item => item.event + " - " + item.date
    ).join(", "));
  }

  lines.push(
    "Services: " +
    (selectedServices.length
      ? selectedServices.join(", ")
      : "None")
  );

  bookingSummary.textContent = lines.join(" | ");
  $("totalAmount").textContent = "To be confirmed by studio";
}

// PREVIEW

function getBookingData() {
  return {
    fullName: $("fullName").value.trim(),
    contact: $("contact").value.trim(),
    whatsapp: $("whatsapp").value.trim(),
    address: $("address").value.trim(),
    eventType: eventType.value,
    weddingType: document.querySelector(
      'input[name="weddingType"]:checked'
    )?.value || "",
    eventTiming: $("eventTiming").value,
    dates: dateEntries,
    services: selectedServices,
    requirements: $("requirements").value.trim(),
    additionalMessage: $("additionalMessage").value.trim()
  };
}

$("previewButton").addEventListener("click", () => {
  const form = $("bookingForm");

  if (!form.reportValidity()) return;

  if (!eventType.value) {
    alert("Please select an event type.");
    return;
  }

  if (eventType.value === "Wedding" &&
      !document.querySelector('input[name="weddingType"]:checked')) {
    alert("Please select wedding arrangement.");
    return;
  }

  if (!dateEntries.length) {
    alert("Please select at least one event date.");
    return;
  }

  if (!selectedServices.length) {
    alert("Please select at least one service.");
    return;
  }

  const data = getBookingData();

  $("previewContent").textContent = JSON.stringify(data, null, 2);
  $("previewSection").hidden = false;

  $("previewSection").scrollIntoView({
    behavior: "smooth"
  });
});

$("editBooking").addEventListener("click", () => {
  $("previewSection").hidden = true;
  $("bookingForm").scrollIntoView({ behavior: "smooth" });
});

// WHATSAPP ENQUIRY

$("whatsappButton").addEventListener("click", () => {
  if (!eventType.value) {
    alert("Please select an event type first.");
    return;
  }

  const data = getBookingData();

  const message = [
    "SANJAY PHOTO STUDIO & FILMS",
    "BOOKING ENQUIRY",
    "",
    "Name: " + data.fullName,
    "Contact: " + data.contact,
    "WhatsApp: " + data.whatsapp,
    "Address: " + data.address,
    "Event: " + data.eventType,
    "Wedding Arrangement: " + data.weddingType,
    "Timing: " + data.eventTiming,
    "Dates: " + data.dates.map(
      d => d.event + " - " + d.date
    ).join(", "),
    "Services: " + data.services.join(", "),
    "Requirements: " + data.requirements,
    "Message: " + data.additionalMessage,
    "",
    "Please contact me regarding this booking."
  ].join("\n");

  const url = "https://wa.me/?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank", "noopener,noreferrer");
});

// FINAL SUBMISSION - BACKEND CONNECTION TO BE ADDED


$("bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!firebaseReady || !db) {
    alert("Firebase setup is pending. Please try again later.");
    return;
  }

  const data = getBookingData();

  const booking = {
    fullName: data.fullName,
    contactNumber: data.contact,
    whatsappNumber: data.whatsapp,
    address: data.address,
    eventType: data.eventType,
    weddingType: data.weddingType || "",
    otherEventTiming: data.eventTiming || "",
    dates: data.dates,
    services: data.services,
    enquiry: data.requirements || "",
    additionalMessage: data.additionalMessage || "",
    status: "Pending",
    createdAt: serverTimestamp()
  };

  try {
    const result = await addDoc(
      collection(db, "bookings"),
      booking
    );

    alert(
      "Booking enquiry submitted successfully!\nReference: " +
      result.id
    );

  } catch (error) {
    console.error("Booking error:", error);
    alert("Booking could not be submitted. Please try again.");
  }
});


// OTHER EVENT TIMING

$("eventTiming").addEventListener("change", updateSummary);

updateSummary();

