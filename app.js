const firebaseConfig = {
  apiKey: "AIzaSyAN9W22AQJts2tYBLMBY31Ek8CK26te0M0",
  authDomain: "zakaat-vdy.firebaseapp.com",
  projectId: "zakaat-vdy",
  storageBucket: "zakaat-vdy.firebasestorage.app",
  messagingSenderId: "674061884787",
  appId: "1:674061884787:web:4f03997622efac44187906",
  measurementId: "G-ER2N9PTSSD"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let families = [];
let editFamilyId = null;

const allCountries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cote d'Ivoire", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other"
];

document.addEventListener("DOMContentLoaded", async () => {
    const countryList = document.getElementById("countryList");
    if (countryList) {
        allCountries.forEach((country) => {
            const option = document.createElement("option");
            option.value = country;
            countryList.appendChild(option);
        });
    }

    try {
        const userDoc = await db.collection("users").doc("admin").get();
        if (!userDoc.exists) {
            await db.collection("users").doc("admin").set({
                password: "1234",
                role: "Administrator"
            });
        }
    } catch (err) {
        console.error("Could not check/create users table in Firestore:", err);
    }

    try {
        const snapshot = await db.collection("families").get();
        families = [];
        snapshot.forEach((doc) => {
            families.push({ id: doc.id, ...doc.data() });
        });
        families.sort((a, b) => a.headName.localeCompare(b.headName));
    } catch (err) {
        console.error("Failed to load data from Firestore:", err);
        alert("Could not connect to Firebase database. Check your config and rules.");
    }

    if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("app").style.display = "block";
        renderDashboard();
    }
});

async function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    if (!u || !p) {
        alert("Please enter both username and password.");
        return;
    }

    try {
        const userDoc = await db.collection("users").doc(u).get();
        if (userDoc.exists && userDoc.data().password === p) {
            sessionStorage.setItem("isLoggedIn", "true");
            document.getElementById("loginPage").style.display = "none";
            document.getElementById("app").style.display = "block";
            document.getElementById("password").value = "";
            renderDashboard();
        } else {
            alert("Incorrect username or password.");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Login failed. Check your internet connection or Firestore rules.");
    }
}

function logout() {
    sessionStorage.removeItem("isLoggedIn");
    location.reload();
}

function toggleForm() {
    const form = document.getElementById("formSection");
    const dashboard = document.getElementById("dashboardSection");

    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
        dashboard.style.display = "none";
    } else {
        form.style.display = "none";
        dashboard.style.display = "block";
        clearForm();
    }
}

function toggleCountry() {
    const abroad = document.getElementById("abroad").value;
    const countryGroup = document.getElementById("countryGroup");
    const country = document.getElementById("country");
    if (abroad === "Yes") {
        countryGroup.style.display = "flex";
    } else {
        countryGroup.style.display = "none";
        country.value = "";
    }
}

function calculateAgeFromDob(dobValue) {
    if (!dobValue) return "";

    const birthDate = new Date(`${dobValue}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return "";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age >= 0 ? age : "";
}

function updateHeadAge() {
    const dobInput = document.getElementById("dob");
    const ageInput = document.getElementById("age");
    if (!dobInput || !ageInput) return;

    ageInput.value = calculateAgeFromDob(dobInput.value);
}

function updateMemberAge(dobInput) {
    const memberEntry = dobInput.closest(".member-entry");
    if (!memberEntry) return;

    const ageInput = memberEntry.querySelector(".m-age");
    if (ageInput) {
        ageInput.value = calculateAgeFromDob(dobInput.value);
    }
}

function addMember() {
    const membersDiv = document.getElementById("members");
    const memberDiv = document.createElement("div");
    memberDiv.className = "member-entry";

    memberDiv.innerHTML = `
        <div class="input-group">
            <input type="text" placeholder="Member Name" class="m-name">
        </div>
        <div class="input-group">
            <input type="text" placeholder="Relation (e.g., Wife, Son)" class="m-relation">
        </div>
        <div class="input-group">
            <input type="date" placeholder="Date of Birth" class="m-dob" onchange="updateMemberAge(this)" oninput="updateMemberAge(this)">
        </div>
        <div class="input-group">
            <input type="number" placeholder="Age" class="m-age" min="0" max="150" readonly>
        </div>
        <div class="input-group">
            <select class="m-aalima-haafiz">
                <option>None</option>
                <option>Aalima</option>
                <option>Haafiz</option>
                <option>Aalima &amp; Haafiz</option>
            </select>
        </div>
        <div class="input-group">
            <input type="text" placeholder="Aadhar No" class="m-aadhar">
        </div>
        <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove()" style="align-self: center;">&times; Remove</button>
    `;
    membersDiv.appendChild(memberDiv);
}

async function saveFamily() {
    const headName = document.getElementById("headName").value.trim();
    const fatherName = document.getElementById("fatherName").value.trim();
    const motherName = document.getElementById("motherName").value.trim();
    const dob = document.getElementById("dob").value;
    const age = parseInt(document.getElementById("age").value, 10) || calculateAgeFromDob(dob) || 0;
    const phone = document.getElementById("phone").value.trim();
    const street = document.getElementById("street").value.trim();
    const address = document.getElementById("address").value.trim();
    const aadhar = document.getElementById("aadhar").value.trim();
    const ration = document.getElementById("ration").value.trim();
    const education = document.getElementById("education").value.trim();
    const aalimaHaafiz = document.getElementById("aalimaHaafiz").value;
    const abroad = document.getElementById("abroad").value;
    const country = document.getElementById("country").value.trim();
    const zakatGive = document.getElementById("zakatGive").value;
    const zakatReceive = document.getElementById("zakatReceive").value;

    if (!headName || !phone || !street || !address || !aadhar || !ration || !education) {
        alert("All fields are mandatory!");
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        alert("Phone number must be exactly 10 digits.");
        return;
    }

    if (!/^\d{12}$/.test(aadhar)) {
        alert("Aadhar number must be exactly 12 digits.");
        return;
    }

    if (abroad === "Yes" && !allCountries.includes(country)) {
        alert("Please select a valid country from the list since 'Working Abroad' is Yes.");
        return;
    }

    const memberElements = document.querySelectorAll(".member-entry");
    const members = [];
    let hasMemberAadharError = false;

    memberElements.forEach((el) => {
        const name = el.querySelector(".m-name").value.trim();
        if (name) {
            const mAadhar = el.querySelector(".m-aadhar").value.trim();
            if (mAadhar && !/^\d{12}$/.test(mAadhar)) {
                alert(`Aadhar number for member "${name}" must be exactly 12 digits.`);
                hasMemberAadharError = true;
            }
            const memberDob = el.querySelector(".m-dob").value;
            members.push({
                name,
                relation: el.querySelector(".m-relation").value.trim(),
                dob: memberDob,
                age: parseInt(el.querySelector(".m-age").value.trim(), 10) || calculateAgeFromDob(memberDob) || 0,
                aalimaHaafiz: el.querySelector(".m-aalima-haafiz").value,
                aadhar: mAadhar
            });
        }
    });

    if (hasMemberAadharError) {
        return;
    }

    const newFamily = {
        id: editFamilyId || Date.now().toString(),
        headName,
        fatherName,
        motherName,
        dob,
        age,
        phone,
        street,
        address,
        aadhar,
        ration,
        education,
        aalimaHaafiz,
        abroad,
        country,
        zakatGive,
        zakatReceive,
        members
    };

    const isDuplicate = families.some((f) =>
        f.id !== editFamilyId &&
        ((f.aadhar && f.aadhar === newFamily.aadhar) ||
        (f.phone && f.headName.toLowerCase() === newFamily.headName.toLowerCase() && f.phone === newFamily.phone))
    );

    if (isDuplicate) {
        if (!confirm("A family with this Aadhar or Name/Phone combination already exists. Add anyway?")) {
            return;
        }
    }

    try {
        if (editFamilyId) {
            await db.collection("families").doc(editFamilyId).set(newFamily);
            const idx = families.findIndex((f) => f.id === editFamilyId);
            if (idx !== -1) {
                families[idx] = newFamily;
            }
            editFamilyId = null;
        } else {
            await db.collection("families").doc(newFamily.id).set(newFamily);
            families.push(newFamily);
        }

        families.sort((a, b) => a.headName.localeCompare(b.headName));
        alert("Family saved successfully!");
        toggleForm();
        renderDashboard();
    } catch (error) {
        console.error("Error saving family: ", error);
        alert("Failed to save family. Check your internet connection or Firebase permissions.");
    }
}

function clearForm() {
    editFamilyId = null;
    const headerTitle = document.querySelector(".form-header h2");
    if (headerTitle) {
        headerTitle.textContent = "Add New Family";
    }

    const fields = ["headName", "fatherName", "motherName", "dob", "age", "phone", "street", "address", "aadhar", "ration", "education", "country"];
    fields.forEach((id) => {
        document.getElementById(id).value = "";
    });

    document.getElementById("abroad").value = "No";
    document.getElementById("countryGroup").style.display = "none";
    document.getElementById("aalimaHaafiz").value = "None";
    document.getElementById("zakatGive").value = "No";
    document.getElementById("zakatReceive").value = "No";
    document.getElementById("members").innerHTML = "";
}

function escapeHtml(unsafe) {
    if (unsafe == null) return "";
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderDashboard() {
    const streetsDiv = document.getElementById("streets");
    const familiesDiv = document.getElementById("families");
    const detailsDiv = document.getElementById("details");

    familiesDiv.innerHTML = "";
    detailsDiv.innerHTML = "";
    detailsDiv.classList.add("empty");

    const streets = [...new Set(families.map((f) => f.street).filter((s) => s))].sort();

    if (streets.length === 0) {
        streetsDiv.innerHTML = "<p style='color: var(--text-muted); font-size: 0.875rem; text-align: center;'>No survey data yet.</p>";
        familiesDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: var(--radius-md); border: 1px dashed var(--border-color); grid-column: 1 / -1;">
                <p style="color: var(--text-muted); margin-bottom: 1rem;">Start by adding your first family record.</p>
                <button class="btn-primary" onclick="toggleForm()">+ New Family</button>
            </div>
        `;
        return;
    }

    streetsDiv.innerHTML = "";
    streets.forEach((street) => {
        const btn = document.createElement("button");
        btn.textContent = street;
        btn.className = "pill-btn";
        btn.onclick = (e) => {
            document.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");
            showFamilies(street);
        };
        streetsDiv.appendChild(btn);
    });

    if (streets.length > 0) {
        streetsDiv.firstChild.click();
    }
}

function showFamilies(street) {
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value) {
        searchInput.value = "";
    }

    const familiesDiv = document.getElementById("families");
    const detailsDiv = document.getElementById("details");
    detailsDiv.innerHTML = "";
    detailsDiv.classList.add("empty");
    familiesDiv.innerHTML = "";

    const filtered = families
        .filter((f) => f.street === street)
        .sort((a, b) => a.headName.localeCompare(b.headName));

    filtered.forEach((f) => {
        appendFamilyCard(f, familiesDiv, false);
    });
}

function searchFamilies() {
    const query = document.getElementById("searchInput").value.toLowerCase().trim();
    const familiesDiv = document.getElementById("families");
    const detailsDiv = document.getElementById("details");

    detailsDiv.innerHTML = "";
    detailsDiv.classList.add("empty");
    familiesDiv.innerHTML = "";

    if (!query) {
        const activePill = document.querySelector(".pill-btn.active");
        if (activePill) {
            const filtered = families
                .filter((f) => f.street === activePill.textContent)
                .sort((a, b) => a.headName.localeCompare(b.headName));
            filtered.forEach((f) => appendFamilyCard(f, familiesDiv));
        } else if (families.length > 0) {
            renderDashboard();
        }
        return;
    }

    document.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));

    const filtered = families.filter((f) =>
        (f.headName && f.headName.toLowerCase().includes(query)) ||
        (f.fatherName && f.fatherName.toLowerCase().includes(query)) ||
        (f.motherName && f.motherName.toLowerCase().includes(query)) ||
        (f.aalimaHaafiz && f.aalimaHaafiz.toLowerCase().includes(query)) ||
        (f.phone && f.phone.includes(query)) ||
        (f.aadhar && f.aadhar.includes(query)) ||
        (f.ration && f.ration.toLowerCase().includes(query)) ||
        (Array.isArray(f.members) && f.members.some((m) =>
            (m.name && m.name.toLowerCase().includes(query)) ||
            (m.relation && m.relation.toLowerCase().includes(query)) ||
            (m.aalimaHaafiz && m.aalimaHaafiz.toLowerCase().includes(query)) ||
            (m.aadhar && m.aadhar.includes(query))
        ))
    ).sort((a, b) => a.headName.localeCompare(b.headName));

    if (filtered.length === 0) {
        familiesDiv.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem;">No families found matching "${escapeHtml(query)}".</p>`;
        return;
    }

    filtered.forEach((f) => appendFamilyCard(f, familiesDiv, true));
}

function appendFamilyCard(f, familiesDiv, showStreet = false) {
    const card = document.createElement("div");
    card.className = "family-card";

    let badgesHtml = "";
    if (f.zakatGive === "Yes") badgesHtml += `<span class="badge give">Gives Zakaat</span>`;
    if (f.zakatReceive === "Yes") badgesHtml += `<span class="badge receive">Receives Zakaat</span>`;
    if (f.aalimaHaafiz && f.aalimaHaafiz !== "None") badgesHtml += `<span class="badge qualification">${escapeHtml(f.aalimaHaafiz)}</span>`;
    if (f.abroad === "Yes") badgesHtml += `<span class="badge abroad">NRI (${escapeHtml(f.country)})</span>`;

    const streetHtml = showStreet ? `<p style="font-size: 0.75rem; color: var(--primary); margin-top: 0.2rem; font-weight: 500;">Street: ${escapeHtml(f.street)}</p>` : "";

    card.innerHTML = `
        <h4>${escapeHtml(f.headName)}</h4>
        <p>${escapeHtml(f.phone || "No phone number")}</p>
        ${streetHtml}
        <div class="badges">
            ${badgesHtml}
        </div>
    `;
    card.onclick = () => showDetails(f.id);
    familiesDiv.appendChild(card);
}

function showDetails(id) {
    const detailsDiv = document.getElementById("details");
    detailsDiv.classList.remove("empty");

    const family = families.find((f) => f.id === id);
    if (!family) return;

    const members = Array.isArray(family.members) ? family.members : [];

    let html = `
        <div class="details-header">
            <h3>${escapeHtml(family.headName)}</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem;">${escapeHtml(family.address)}, ${escapeHtml(family.street)}</p>
        </div>

        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Father Name</span>
                <span class="detail-value">${escapeHtml(family.fatherName) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Mother Name</span>
                <span class="detail-value">${escapeHtml(family.motherName) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date of Birth</span>
                <span class="detail-value">${escapeHtml(family.dob) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Age</span>
                <span class="detail-value">${family.age || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${escapeHtml(family.phone) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Aadhar</span>
                <span class="detail-value">${escapeHtml(family.aadhar) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Ration Card</span>
                <span class="detail-value">${escapeHtml(family.ration) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Education</span>
                <span class="detail-value">${escapeHtml(family.education) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Aalima / Haafiz</span>
                <span class="detail-value">${escapeHtml(family.aalimaHaafiz || "None")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Working Abroad</span>
                <span class="detail-value">${escapeHtml(family.abroad)} ${family.abroad === "Yes" ? `(${escapeHtml(family.country)})` : ""}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Eligible to Give Zakaat</span>
                <span class="detail-value">${escapeHtml(family.zakatGive)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Eligible to Receive Zakaat</span>
                <span class="detail-value">${escapeHtml(family.zakatReceive)}</span>
            </div>
        </div>

        <div class="members-list">
            <h4>Family Members (${members.length})</h4>
    `;

    if (members.length === 0) {
        html += `<p style="color: var(--text-muted); font-size: 0.875rem; font-style: italic;">No additional members recorded.</p>`;
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="member-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Relation</th>
                            <th>DOB</th>
                            <th>Age</th>
                            <th>Aalima / Haafiz</th>
                            <th>Aadhar</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        members.forEach((m) => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(m.name)}</strong></td>
                    <td>${escapeHtml(m.relation)}</td>
                    <td>${escapeHtml(m.dob) || "-"}</td>
                    <td>${m.age || "-"}</td>
                    <td>${escapeHtml(m.aalimaHaafiz || "None")}</td>
                    <td>${escapeHtml(m.aadhar) || "-"}</td>
                </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `
        </div>
        <div class="details-actions" style="gap: 1rem;">
            <button class="btn-primary" onclick="editFamily('${family.id}')">Edit Record</button>
            <button class="btn-danger" onclick="deleteFamily('${family.id}')">Delete Record</button>
        </div>
    `;

    detailsDiv.innerHTML = html;

    if (window.innerWidth <= 768) {
        detailsDiv.scrollIntoView({ behavior: "smooth" });
    }
}

function editFamily(id) {
    const family = families.find((f) => f.id === id);
    if (!family) return;

    editFamilyId = id;

    document.getElementById("headName").value = family.headName || "";
    document.getElementById("fatherName").value = family.fatherName || "";
    document.getElementById("motherName").value = family.motherName || "";
    document.getElementById("dob").value = family.dob || "";
    document.getElementById("age").value = family.age || calculateAgeFromDob(family.dob || "") || "";
    document.getElementById("phone").value = family.phone || "";
    document.getElementById("street").value = family.street || "";
    document.getElementById("address").value = family.address || "";
    document.getElementById("aadhar").value = family.aadhar || "";
    document.getElementById("ration").value = family.ration || "";
    document.getElementById("education").value = family.education || "";
    document.getElementById("aalimaHaafiz").value = family.aalimaHaafiz || "None";
    document.getElementById("abroad").value = family.abroad || "No";
    toggleCountry();
    if (family.abroad === "Yes") {
        document.getElementById("country").value = family.country || "";
    }

    document.getElementById("zakatGive").value = family.zakatGive || "No";
    document.getElementById("zakatReceive").value = family.zakatReceive || "No";

    const membersDiv = document.getElementById("members");
    membersDiv.innerHTML = "";
    const editMembers = Array.isArray(family.members) ? family.members : [];
    if (editMembers.length > 0) {
        editMembers.forEach((m) => {
            addMember();
            const lastEntry = membersDiv.lastElementChild;
            lastEntry.querySelector(".m-name").value = m.name || "";
            lastEntry.querySelector(".m-relation").value = m.relation || "";
            lastEntry.querySelector(".m-dob").value = m.dob || "";
            lastEntry.querySelector(".m-age").value = m.age || calculateAgeFromDob(m.dob || "") || "";
            lastEntry.querySelector(".m-aalima-haafiz").value = m.aalimaHaafiz || "None";
            lastEntry.querySelector(".m-aadhar").value = m.aadhar || "";
        });
    }

    const headerTitle = document.querySelector(".form-header h2");
    if (headerTitle) {
        headerTitle.textContent = "Edit Family Record";
    }

    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("formSection").style.display = "block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteFamily(id) {
    if (confirm("Are you sure you want to delete this family record permanently?")) {
        try {
            await db.collection("families").doc(id).delete();
            families = families.filter((f) => f.id !== id);

            const detailsDiv = document.getElementById("details");
            detailsDiv.innerHTML = "";
            detailsDiv.classList.add("empty");

            renderDashboard();
        } catch (err) {
            console.error("Error deleting family:", err);
            alert("Failed to delete. Check Firebase permissions.");
        }
    }
}

function generateCSVString() {
    if (families.length === 0) return "";

    const headers = [
        "ID",
        "Head Name",
        "Father Name",
        "Mother Name",
        "Phone",
        "Street",
        "Address",
        "Aadhar",
        "Ration",
        "Education",
        "DOB",
        "Age",
        "Aalima/Haafiz",
        "Abroad",
        "Country",
        "Zakaat Give",
        "Zakaat Receive",
        "Members JSON"
    ];

    const rows = families.map((f) => {
        let membersData = "";
        if (f.members && f.members.length > 0) {
            membersData = btoa(encodeURIComponent(JSON.stringify(f.members)));
        }

        return [
            `"${f.id}"`,
            `"${escapeCSV(f.headName)}"`,
            `"${escapeCSV(f.fatherName)}"`,
            `"${escapeCSV(f.motherName)}"`,
            `"${escapeCSV(f.phone)}"`,
            `"${escapeCSV(f.street)}"`,
            `"${escapeCSV(f.address)}"`,
            `"${escapeCSV(f.aadhar)}"`,
            `"${escapeCSV(f.ration)}"`,
            `"${escapeCSV(f.education)}"`,
            `"${escapeCSV(f.dob)}"`,
            `"${escapeCSV(f.age)}"`,
            `"${escapeCSV(f.aalimaHaafiz || "None")}"`,
            `"${escapeCSV(f.abroad)}"`,
            `"${escapeCSV(f.country)}"`,
            `"${escapeCSV(f.zakatGive)}"`,
            `"${escapeCSV(f.zakatReceive)}"`,
            `"${membersData}"`
        ];
    });

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCSV() {
    if (families.length === 0) {
        alert("No data to download!");
        return;
    }

    const csvContent = generateCSVString();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `zakaat_families_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeCSV(str) {
    if (!str) return "";
    return str.toString().replace(/"/g, "\"\"");
}

function loadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
            if (lines.length <= 1) {
                alert("File is empty or invalid format.");
                return;
            }

            let imported = 0;
            let updated = 0;
            const headerLine = lines[0];
            const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());
            const headerIndex = (name) => headers.indexOf(name.toLowerCase());
            const hasNewFields = headerIndex("Father Name") >= 0 || headerIndex("Aalima/Haafiz") >= 0 || headerIndex("DOB") >= 0;
            const hasEducation = headerIndex("Education") >= 0;

            const readCol = (cols, name, fallbackIndex = -1) => {
                const idx = headerIndex(name);
                if (idx >= 0) return cols[idx] || "";
                if (fallbackIndex >= 0) return cols[fallbackIndex] || "";
                return "";
            };

            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < 11) continue;

                const id = readCol(cols, "ID", 0) || `${Date.now()}${i}`;
                let members = [];

                let familyData = {};
                if (hasNewFields) {
                    if (readCol(cols, "Members JSON")) {
                        try { members = JSON.parse(decodeURIComponent(atob(readCol(cols, "Members JSON")))); } catch (err) {}
                    }
                    familyData = {
                        id,
                        headName: readCol(cols, "Head Name", 1),
                        fatherName: readCol(cols, "Father Name"),
                        motherName: readCol(cols, "Mother Name"),
                        phone: readCol(cols, "Phone", 4),
                        street: readCol(cols, "Street", 5),
                        address: readCol(cols, "Address", 6),
                        aadhar: readCol(cols, "Aadhar", 7),
                        ration: readCol(cols, "Ration", 8),
                        education: readCol(cols, "Education", 9),
                        dob: readCol(cols, "DOB"),
                        age: parseInt(readCol(cols, "Age"), 10) || calculateAgeFromDob(readCol(cols, "DOB")) || 0,
                        aalimaHaafiz: readCol(cols, "Aalima/Haafiz") || "None",
                        abroad: readCol(cols, "Abroad", 13),
                        country: readCol(cols, "Country", 14),
                        zakatGive: readCol(cols, "Zakaat Give", 15),
                        zakatReceive: readCol(cols, "Zakaat Receive", 16),
                        members
                    };
                } else if (hasEducation) {
                    if (cols[12]) {
                        try { members = JSON.parse(decodeURIComponent(atob(cols[12]))); } catch (err) {}
                    }
                    familyData = {
                        id,
                        headName: cols[1],
                        fatherName: "",
                        motherName: "",
                        phone: cols[2],
                        street: cols[3],
                        address: cols[4],
                        aadhar: cols[5],
                        ration: cols[6],
                        education: cols[7],
                        dob: "",
                        age: 0,
                        aalimaHaafiz: "None",
                        abroad: cols[8],
                        country: cols[9],
                        zakatGive: cols[10],
                        zakatReceive: cols[11],
                        members
                    };
                } else {
                    if (cols[11]) {
                        try { members = JSON.parse(decodeURIComponent(atob(cols[11]))); } catch (err) {}
                    }
                    familyData = {
                        id,
                        headName: cols[1],
                        fatherName: "",
                        motherName: "",
                        phone: cols[2],
                        street: cols[3],
                        address: cols[4],
                        aadhar: cols[5],
                        ration: cols[6],
                        education: "",
                        dob: "",
                        age: 0,
                        aalimaHaafiz: "None",
                        abroad: cols[7],
                        country: cols[8],
                        zakatGive: cols[9],
                        zakatReceive: cols[10],
                        members
                    };
                }

                familyData.members = (familyData.members || []).map((member) => ({
                    name: member.name || "",
                    relation: member.relation || "",
                    dob: member.dob || "",
                    age: parseInt(member.age, 10) || calculateAgeFromDob(member.dob || "") || 0,
                    aalimaHaafiz: member.aalimaHaafiz || "None",
                    aadhar: member.aadhar || ""
                }));

                const existingIdx = families.findIndex((f) => f.id === id);
                if (existingIdx >= 0) {
                    families[existingIdx] = familyData;
                    updated++;
                } else {
                    families.push(familyData);
                    imported++;
                }
            }

            const batch = db.batch();
            families.forEach((f) => {
                const docRef = db.collection("families").doc(f.id);
                batch.set(docRef, f);
            });
            await batch.commit();

            families.sort((a, b) => a.headName.localeCompare(b.headName));
            alert(`CSV Processed Successfully!\nImported: ${imported}\nUpdated: ${updated}`);
            renderDashboard();
        } catch (err) {
            alert("Error parsing CSV file. Please ensure it was generated by this application.");
            console.error(err);
        } finally {
            event.target.value = "";
        }
    };
    reader.readAsText(file);
}

function parseCSVLine(text) {
    const result = [];
    let curVal = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === "\"") {
                if (i + 1 < text.length && text[i + 1] === "\"") {
                    curVal += "\"";
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                curVal += char;
            }
        } else if (char === "\"") {
            inQuotes = true;
        } else if (char === ",") {
            result.push(curVal);
            curVal = "";
        } else {
            curVal += char;
        }
    }
    result.push(curVal);
    return result;
}
