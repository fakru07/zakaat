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
let streetMasters = [];
let editStreetMasterId = null;
let streetMasterReady = false;


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

    ensureMarkedSurveyFields();
    ensureStreetMasterUI();

    const dobInput = document.getElementById("dob");
    if (dobInput) {
        dobInput.addEventListener("input", updateHeadAge);
        dobInput.addEventListener("change", updateHeadAge);
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
        families.sort((a, b) => (a.headName || "").localeCompare(b.headName || ""));

        await loadStreetMasters();
        await syncFamilyStreetsToMaster();
        refreshStreetDropdown();
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
        refreshStreetDropdown();
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

function getFieldValue(id, defaultValue = "") {
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    return (el.value || "").trim();
}

function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value || "";
}


function normalizeStreetName(value) {
    return (value || "").trim().replace(/\s+/g, " ");
}

function streetCompareKey(value) {
    return normalizeStreetName(value).toLocaleLowerCase("en-IN");
}

function formatStreetName(value) {
    return normalizeStreetName(value)
        .toLocaleLowerCase("en-IN")
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function getStreetUsageCount(streetName) {
    const key = streetCompareKey(streetName);
    return families.filter((family) => streetCompareKey(family.street) === key).length;
}

function getCanonicalStreetName(streetName) {
    const key = streetCompareKey(streetName);
    const master = streetMasters.find((item) => streetCompareKey(item.name) === key);
    return master ? master.name : normalizeStreetName(streetName);
}

function getDashboardStreetNames() {
    const streetMap = new Map();

    streetMasters.forEach((item) => {
        const name = normalizeStreetName(item.name);
        const key = streetCompareKey(name);
        if (key) streetMap.set(key, name);
    });

    families.forEach((family) => {
        const name = normalizeStreetName(family.street);
        const key = streetCompareKey(name);
        if (key && !streetMap.has(key)) streetMap.set(key, name);
    });

    return Array.from(streetMap.values()).sort((a, b) => a.localeCompare(b));
}

function ensureStreetMasterUI() {
    replaceStreetTextBoxWithDropdown();

    if (!document.getElementById("streetMasterStyles")) {
        const style = document.createElement("style");
        style.id = "streetMasterStyles";
        style.textContent = `
            .street-master-btn {
                border: 1px solid #dbe2ea;
                background: #ffffff;
                color: #0f172a;
                border-radius: 9px;
                padding: 0.72rem 1rem;
                font-weight: 600;
                cursor: pointer;
            }
            .street-master-btn:hover { background: #f8fafc; }
            .street-master-overlay {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(15, 23, 42, 0.55);
                padding: 1rem;
                z-index: 10000;
            }
            .street-master-overlay.open { display: flex; }
            .street-master-dialog {
                width: min(760px, 96vw);
                max-height: 88vh;
                overflow: hidden;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
                display: flex;
                flex-direction: column;
            }
            .street-master-header,
            .street-master-form,
            .street-master-footer {
                padding: 1rem 1.25rem;
                border-bottom: 1px solid #e5e7eb;
            }
            .street-master-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
            }
            .street-master-header h3 { margin: 0; }
            .street-master-close {
                border: 0;
                background: transparent;
                font-size: 1.6rem;
                cursor: pointer;
                color: #64748b;
            }
            .street-master-form {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto auto;
                gap: 0.75rem;
                align-items: center;
            }
            .street-master-form input {
                width: 100%;
                min-width: 0;
                border: 1px solid #dbe2ea;
                border-radius: 9px;
                padding: 0.72rem 0.85rem;
            }
            .street-master-list {
                overflow: auto;
                padding: 0.25rem 1.25rem 1rem;
            }
            .street-master-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 100px 150px;
                gap: 0.75rem;
                align-items: center;
                border-bottom: 1px solid #eef2f7;
                padding: 0.8rem 0;
            }
            .street-master-row strong { overflow-wrap: anywhere; }
            .street-master-count {
                color: #64748b;
                font-size: 0.85rem;
                text-align: center;
            }
            .street-master-actions {
                display: flex;
                justify-content: flex-end;
                gap: 0.5rem;
            }
            .street-master-actions button {
                border-radius: 7px;
                padding: 0.45rem 0.7rem;
                cursor: pointer;
            }
            .street-master-edit { border: 1px solid #cbd5e1; background: #ffffff; }
            .street-master-delete { border: 1px solid #fecaca; background: #fff1f2; color: #be123c; }
            .street-master-empty {
                text-align: center;
                color: #64748b;
                padding: 2rem 0;
            }
            .street-master-footer {
                border-bottom: 0;
                border-top: 1px solid #e5e7eb;
                color: #64748b;
                font-size: 0.85rem;
            }
            @media (max-width: 640px) {
                .street-master-form { grid-template-columns: 1fr; }
                .street-master-row { grid-template-columns: minmax(0, 1fr); }
                .street-master-count { text-align: left; }
                .street-master-actions { justify-content: flex-start; }
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById("streetMasterButton")) {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "streetMasterButton";
        button.className = "street-master-btn";
        button.textContent = "Street Master";
        button.addEventListener("click", openStreetMaster);

        const dashboard = document.getElementById("dashboardSection");
        const newFamilyButton = dashboard
            ? Array.from(dashboard.querySelectorAll("button")).find((item) =>
                (item.getAttribute("onclick") || "").includes("toggleForm") ||
                item.textContent.includes("New Family")
            )
            : null;

        if (newFamilyButton && newFamilyButton.parentElement) {
            newFamilyButton.insertAdjacentElement("beforebegin", button);
        } else if (dashboard) {
            dashboard.insertAdjacentElement("afterbegin", button);
        }
    }

    if (!document.getElementById("streetMasterOverlay")) {
        const overlay = document.createElement("div");
        overlay.id = "streetMasterOverlay";
        overlay.className = "street-master-overlay";
        overlay.innerHTML = `
            <div class="street-master-dialog" role="dialog" aria-modal="true" aria-labelledby="streetMasterTitle">
                <div class="street-master-header">
                    <div>
                        <h3 id="streetMasterTitle">Street Master</h3>
                        <div style="color:#64748b;font-size:0.85rem;margin-top:0.2rem;">Add, rename or remove street names.</div>
                    </div>
                    <button type="button" class="street-master-close" aria-label="Close" onclick="closeStreetMaster()">&times;</button>
                </div>
                <div class="street-master-form">
                    <input id="streetMasterName" type="text" maxlength="120" placeholder="Enter street name">
                    <button id="streetMasterSaveButton" type="button" class="btn-primary" onclick="saveStreetMaster()">Add Street</button>
                    <button id="streetMasterCancelButton" type="button" class="street-master-btn" style="display:none;" onclick="cancelStreetMasterEdit()">Cancel</button>
                </div>
                <div id="streetMasterList" class="street-master-list"></div>
                <div class="street-master-footer">A street cannot be deleted while family records are using it. Renaming a street updates all linked families.</div>
            </div>
        `;
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) closeStreetMaster();
        });
        document.body.appendChild(overlay);

        const input = document.getElementById("streetMasterName");
        if (input) {
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") saveStreetMaster();
                if (event.key === "Escape") closeStreetMaster();
            });
        }
    }
}

function replaceStreetTextBoxWithDropdown() {
    const currentStreetControl = document.getElementById("street");
    if (!currentStreetControl || currentStreetControl.tagName === "SELECT") return;

    const streetSelect = document.createElement("select");
    streetSelect.id = "street";
    streetSelect.name = currentStreetControl.name || "street";
    streetSelect.className = currentStreetControl.className || "";
    streetSelect.required = true;
    streetSelect.setAttribute("aria-label", "Street");

    currentStreetControl.replaceWith(streetSelect);
    refreshStreetDropdown();
}

function refreshStreetDropdown(selectedValue = null) {
    const streetSelect = document.getElementById("street");
    if (!streetSelect) return;

    const currentValue = selectedValue !== null ? selectedValue : streetSelect.value;
    streetSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = streetMasters.length > 0 ? "Select street *" : "Add street in Street Master first";
    streetSelect.appendChild(placeholder);

    streetMasters
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((street) => {
            const option = document.createElement("option");
            option.value = street.name;
            option.textContent = street.name;
            streetSelect.appendChild(option);
        });

    const canonicalCurrentValue = getCanonicalStreetName(currentValue);
    const hasCurrentValue = streetMasters.some(
        (item) => streetCompareKey(item.name) === streetCompareKey(canonicalCurrentValue)
    );

    if (canonicalCurrentValue && !hasCurrentValue) {
        const legacyOption = document.createElement("option");
        legacyOption.value = canonicalCurrentValue;
        legacyOption.textContent = `${canonicalCurrentValue} (Legacy)`;
        streetSelect.appendChild(legacyOption);
    }

    streetSelect.value = canonicalCurrentValue || "";
}

async function loadStreetMasters() {
    const snapshot = await db.collection("streetMasters").get();
    streetMasters = [];

    snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const name = normalizeStreetName(data.name);
        if (name) streetMasters.push({ id: doc.id, ...data, name });
    });

    streetMasters.sort((a, b) => a.name.localeCompare(b.name));
    streetMasterReady = true;
    renderStreetMasterList();
}

async function writeFamilyStreetUpdates(updates) {
    const chunkSize = 400;

    for (let start = 0; start < updates.length; start += chunkSize) {
        const batch = db.batch();
        updates.slice(start, start + chunkSize).forEach((update) => {
            batch.update(db.collection("families").doc(update.id), {
                street: update.street
            });
        });
        await batch.commit();
    }
}

async function syncFamilyStreetsToMaster() {
    const masterByKey = new Map();
    streetMasters.forEach((street) => {
        masterByKey.set(streetCompareKey(street.name), street);
    });

    const familiesToUpdate = [];

    for (const family of families) {
        const rawName = normalizeStreetName(family.street);
        if (!rawName) continue;

        const key = streetCompareKey(rawName);
        let master = masterByKey.get(key);

        if (!master) {
            const canonicalName = formatStreetName(rawName);
            const docRef = await db.collection("streetMasters").add({
                name: canonicalName,
                normalizedName: streetCompareKey(canonicalName),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            master = { id: docRef.id, name: canonicalName, active: true };
            streetMasters.push(master);
            masterByKey.set(key, master);
        }

        if (family.street !== master.name) {
            family.street = master.name;
            familiesToUpdate.push({ id: family.id, street: master.name });
        }
    }

    if (familiesToUpdate.length > 0) {
        await writeFamilyStreetUpdates(familiesToUpdate);
    }

    streetMasters.sort((a, b) => a.name.localeCompare(b.name));
    renderStreetMasterList();
}

function openStreetMaster() {
    ensureStreetMasterUI();
    renderStreetMasterList();
    const overlay = document.getElementById("streetMasterOverlay");
    if (overlay) overlay.classList.add("open");

    const input = document.getElementById("streetMasterName");
    if (input) setTimeout(() => input.focus(), 0);
}

function closeStreetMaster() {
    cancelStreetMasterEdit();
    const overlay = document.getElementById("streetMasterOverlay");
    if (overlay) overlay.classList.remove("open");
}

function renderStreetMasterList() {
    const list = document.getElementById("streetMasterList");
    if (!list) return;

    if (!streetMasterReady && streetMasters.length === 0) {
        list.innerHTML = '<div class="street-master-empty">Loading street names...</div>';
        return;
    }

    if (streetMasters.length === 0) {
        list.innerHTML = '<div class="street-master-empty">No street names added yet.</div>';
        return;
    }

    list.innerHTML = streetMasters
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((street) => {
            const count = getStreetUsageCount(street.name);
            return `
                <div class="street-master-row">
                    <strong>${escapeHtml(street.name)}</strong>
                    <span class="street-master-count">${count} ${count === 1 ? "family" : "families"}</span>
                    <div class="street-master-actions">
                        <button type="button" class="street-master-edit" onclick="startStreetMasterEdit('${street.id}')">Edit</button>
                        <button type="button" class="street-master-delete" onclick="deleteStreetMaster('${street.id}')">Delete</button>
                    </div>
                </div>
            `;
        })
        .join("");
}

function startStreetMasterEdit(id) {
    const street = streetMasters.find((item) => item.id === id);
    if (!street) return;

    editStreetMasterId = id;
    const input = document.getElementById("streetMasterName");
    const saveButton = document.getElementById("streetMasterSaveButton");
    const cancelButton = document.getElementById("streetMasterCancelButton");

    if (input) {
        input.value = street.name;
        input.focus();
        input.select();
    }
    if (saveButton) saveButton.textContent = "Update Street";
    if (cancelButton) cancelButton.style.display = "inline-flex";
}

function cancelStreetMasterEdit() {
    editStreetMasterId = null;
    const input = document.getElementById("streetMasterName");
    const saveButton = document.getElementById("streetMasterSaveButton");
    const cancelButton = document.getElementById("streetMasterCancelButton");

    if (input) input.value = "";
    if (saveButton) saveButton.textContent = "Add Street";
    if (cancelButton) cancelButton.style.display = "none";
}

async function saveStreetMaster() {
    const input = document.getElementById("streetMasterName");
    const enteredName = input ? normalizeStreetName(input.value) : "";
    const name = formatStreetName(enteredName);

    if (!name) {
        alert("Please enter a street name.");
        if (input) input.focus();
        return;
    }

    const duplicate = streetMasters.find(
        (item) => item.id !== editStreetMasterId && streetCompareKey(item.name) === streetCompareKey(name)
    );

    if (duplicate) {
        alert(`Street "${duplicate.name}" already exists.`);
        if (input) input.focus();
        return;
    }

    try {
        if (editStreetMasterId) {
            const street = streetMasters.find((item) => item.id === editStreetMasterId);
            if (!street) return;

            const oldName = street.name;
            await db.collection("streetMasters").doc(street.id).update({
                name,
                normalizedName: streetCompareKey(name),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const linkedFamilies = families.filter(
                (family) => streetCompareKey(family.street) === streetCompareKey(oldName)
            );
            linkedFamilies.forEach((family) => {
                family.street = name;
            });
            await writeFamilyStreetUpdates(linkedFamilies.map((family) => ({
                id: family.id,
                street: name
            })));

            street.name = name;
        } else {
            const docRef = await db.collection("streetMasters").add({
                name,
                normalizedName: streetCompareKey(name),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            streetMasters.push({ id: docRef.id, name, active: true });
        }

        streetMasters.sort((a, b) => a.name.localeCompare(b.name));
        cancelStreetMasterEdit();
        renderStreetMasterList();
        refreshStreetDropdown();
        renderDashboard();
    } catch (error) {
        console.error("Failed to save street master:", error);
        alert("Could not save the street name. Check Firebase permissions.");
    }
}

async function deleteStreetMaster(id) {
    const street = streetMasters.find((item) => item.id === id);
    if (!street) return;

    const usageCount = getStreetUsageCount(street.name);
    if (usageCount > 0) {
        alert(`Cannot delete "${street.name}" because ${usageCount} family record(s) use it. Edit the street name instead, or move those families to another street first.`);
        return;
    }

    if (!confirm(`Delete street "${street.name}"?`)) return;

    try {
        await db.collection("streetMasters").doc(id).delete();
        streetMasters = streetMasters.filter((item) => item.id !== id);
        if (editStreetMasterId === id) cancelStreetMasterEdit();
        renderStreetMasterList();
        refreshStreetDropdown();
        renderDashboard();
    } catch (error) {
        console.error("Failed to delete street master:", error);
        alert("Could not delete the street name. Check Firebase permissions.");
    }
}


function addOptions(selectElement, options) {
    options.forEach((item) => {
        const option = document.createElement("option");
        if (typeof item === "string") {
            option.value = item;
            option.textContent = item;
        } else {
            option.value = item.value;
            option.textContent = item.label;
        }
        selectElement.appendChild(option);
    });
}

function createInputGroup(labelText, control) {
    const group = document.createElement("div");
    group.className = "input-group marked-survey-field";

    const label = document.createElement("label");
    label.textContent = labelText;
    if (control.id) {
        label.setAttribute("for", control.id);
    }

    group.appendChild(label);
    group.appendChild(control);
    return group;
}

function createSelect(id, options, onChangeHandler) {
    const select = document.createElement("select");
    select.id = id;
    if (onChangeHandler) {
        select.addEventListener("change", onChangeHandler);
    }
    addOptions(select, options);
    return select;
}

function createTextInput(id, placeholder, type = "text") {
    const input = document.createElement("input");
    input.id = id;
    input.type = type;
    input.placeholder = placeholder;
    return input;
}

function createTextArea(id, placeholder) {
    const textarea = document.createElement("textarea");
    textarea.id = id;
    textarea.placeholder = placeholder;
    textarea.rows = 3;
    textarea.style.resize = "vertical";
    textarea.style.width = "100%";
    return textarea;
}

function insertGroupsAfter(referenceInputId, groups) {
    const referenceInput = document.getElementById(referenceInputId);
    if (!referenceInput || !referenceInput.parentElement) return;

    let anchor = referenceInput.closest(".input-group") || referenceInput.parentElement;

    groups.forEach((group) => {
        anchor.insertAdjacentElement("afterend", group);
        anchor = group;
    });
}

function ensureMarkedSurveyFields() {
    if (document.getElementById("familyIncome")) return;

    const familyIncomeOtherGroup = createInputGroup(
        "Other Family Income",
        createTextInput("familyIncomeOther", "Enter monthly income amount", "number")
    );
    familyIncomeOtherGroup.id = "familyIncomeOtherGroup";
    familyIncomeOtherGroup.style.display = "none";

    const houseTypeOtherGroup = createInputGroup(
        "Other House Type",
        createTextInput("houseTypeOther", "Enter house type")
    );
    houseTypeOtherGroup.id = "houseTypeOtherGroup";
    houseTypeOtherGroup.style.display = "none";

    const markedGroups = [
        createInputGroup("Banking Details", createTextArea("bankDetails", "Enter bank name / account details / IFSC if available")),
        createInputGroup("Family Income (Monthly)", createSelect("familyIncome", [
            { value: "", label: "Select monthly income" },
            { value: "5000", label: "5000" },
            { value: "10000", label: "10000" },
            { value: "15000", label: "15000" },
            { value: "20000", label: "20000" },
            { value: "Others", label: "Others" }
        ], toggleFamilyIncomeOther)),
        familyIncomeOtherGroup,
        createInputGroup("Residential Type", createSelect("residentialType", [
            { value: "", label: "Select residential type" },
            "Own House",
            "Rented",
            "Lease"
        ])),
        createInputGroup("House Type", createSelect("houseType", [
            { value: "", label: "Select house type" },
            "Hut",
            "Tiled House",
            "Sheet House",
            "Concrete House",
            "Apartment",
            "Other"
        ], toggleHouseTypeOther)),
        houseTypeOtherGroup,
        createInputGroup("Life Style", createSelect("lifeStyle", [
            { value: "", label: "Select life style" },
            "Poor",
            "Middle",
            "Upper"
        ])),
        createInputGroup("Need Home?", createSelect("needHome", ["No", "Yes"])),
        createInputGroup("Need Toilet?", createSelect("needToilet", ["No", "Yes"])),
        createInputGroup("Need Medical Insurance Card?", createSelect("needMedicalInsurance", ["No", "Yes"])),
        createInputGroup("Need Food?", createSelect("needFood", ["No", "Yes"])),
        createInputGroup("Family Without Male Support?", createSelect("noMaleSupport", ["No", "Yes"])),
        createInputGroup("Smart Card / Ration Card Requirement", createSelect("smartCardNeed", [
            "No",
            "New Card",
            "Alteration"
        ])),
        createInputGroup("Need Govt Docs Correction?", createSelect("govtDocsCorrection", [
            "No",
            "Aadhar",
            "Voter ID",
            "Pension",
            "Others"
        ])),
        createInputGroup("General Remarks", createTextArea("generalRemarks", "Enter remarks / special needs / other details"))
    ];

    insertGroupsAfter("education", markedGroups);
}

function toggleFamilyIncomeOther() {
    const income = document.getElementById("familyIncome");
    const otherGroup = document.getElementById("familyIncomeOtherGroup");
    const otherInput = document.getElementById("familyIncomeOther");
    if (!income || !otherGroup || !otherInput) return;

    if (income.value === "Others") {
        otherGroup.style.display = "flex";
    } else {
        otherGroup.style.display = "none";
        otherInput.value = "";
    }
}

function toggleHouseTypeOther() {
    const houseType = document.getElementById("houseType");
    const otherGroup = document.getElementById("houseTypeOtherGroup");
    const otherInput = document.getElementById("houseTypeOther");
    if (!houseType || !otherGroup || !otherInput) return;

    if (houseType.value === "Other") {
        otherGroup.style.display = "flex";
    } else {
        otherGroup.style.display = "none";
        otherInput.value = "";
    }
}

function getFamilyIncomeValue() {
    const income = getFieldValue("familyIncome");
    if (income === "Others") {
        return getFieldValue("familyIncomeOther");
    }
    return income;
}

function getHouseTypeValue() {
    const houseType = getFieldValue("houseType");
    if (houseType === "Other") {
        return getFieldValue("houseTypeOther");
    }
    return houseType;
}

function setFamilyIncomeValue(value) {
    const standardValues = ["", "5000", "10000", "15000", "20000"];
    if (standardValues.includes(value || "")) {
        setFieldValue("familyIncome", value || "");
        setFieldValue("familyIncomeOther", "");
    } else if (value) {
        setFieldValue("familyIncome", "Others");
        setFieldValue("familyIncomeOther", value);
    } else {
        setFieldValue("familyIncome", "");
        setFieldValue("familyIncomeOther", "");
    }
    toggleFamilyIncomeOther();
}

function setHouseTypeValue(value) {
    const standardValues = ["", "Hut", "Tiled House", "Sheet House", "Concrete House", "Apartment"];
    if (standardValues.includes(value || "")) {
        setFieldValue("houseType", value || "");
        setFieldValue("houseTypeOther", "");
    } else if (value) {
        setFieldValue("houseType", "Other");
        setFieldValue("houseTypeOther", value);
    } else {
        setFieldValue("houseType", "");
        setFieldValue("houseTypeOther", "");
    }
    toggleHouseTypeOther();
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

function getMemberRelationshipDisplay(member) {
    if (!member) return "";

    const relation = (member.relation || "").trim();
    const relationOther = (member.relationOther || "").trim();

    if (relation === "Other") {
        return relationOther || "Other";
    }

    return relation || relationOther;
}

function toggleMemberRelationshipOther(selectElement) {
    const memberEntry = selectElement.closest(".member-entry");
    if (!memberEntry) return;

    const otherGroup = memberEntry.querySelector(".m-relation-other-group");
    const otherInput = memberEntry.querySelector(".m-relation-other");
    if (!otherGroup || !otherInput) return;

    if (selectElement.value === "Other") {
        otherGroup.style.display = "flex";
    } else {
        otherGroup.style.display = "none";
        otherInput.value = "";
    }
}

function setMemberRelationshipValue(memberEntry, relationValue, relationOtherValue = "") {
    const relationSelect = memberEntry.querySelector(".m-relation");
    const relationOther = memberEntry.querySelector(".m-relation-other");
    if (!relationSelect || !relationOther) return;

    const standardRelationships = [
        "",
        "Husband",
        "Wife",
        "Son",
        "Daughter",
        "Father",
        "Mother",
        "Brother",
        "Sister",
        "Grandfather",
        "Grandmother",
        "Grandson",
        "Granddaughter",
        "Son-in-law",
        "Daughter-in-law",
        "Father-in-law",
        "Mother-in-law",
        "Brother-in-law",
        "Sister-in-law",
        "Uncle",
        "Aunt",
        "Nephew",
        "Niece",
        "Guardian",
        "Other Dependent",
        "Other"
    ];

    const relation = (relationValue || "").trim();
    const customRelation = (relationOtherValue || "").trim();

    if (!relation) {
        relationSelect.value = "";
        relationOther.value = "";
    } else if (relation === "Other") {
        relationSelect.value = "Other";
        relationOther.value = customRelation;
    } else if (standardRelationships.includes(relation)) {
        relationSelect.value = relation;
        relationOther.value = "";
    } else {
        // Backward compatibility for an older custom relationship stored directly in relation.
        relationSelect.value = "Other";
        relationOther.value = relation;
    }

    toggleMemberRelationshipOther(relationSelect);
}

function toggleMemberOccupationOther(selectElement) {

    const memberEntry = selectElement.closest(".member-entry");
    if (!memberEntry) return;

    const otherGroup = memberEntry.querySelector(".m-occupation-other-group");
    const otherInput = memberEntry.querySelector(".m-occupation-other");
    if (!otherGroup || !otherInput) return;

    if (selectElement.value === "Others") {
        otherGroup.style.display = "flex";
    } else {
        otherGroup.style.display = "none";
        otherInput.value = "";
    }
}

function setMemberOccupationValue(memberEntry, value) {
    const occupationSelect = memberEntry.querySelector(".m-occupation");
    const occupationOther = memberEntry.querySelector(".m-occupation-other");
    if (!occupationSelect || !occupationOther) return;

    const standardValues = ["", "Student", "Housewife"];
    if (standardValues.includes(value || "")) {
        occupationSelect.value = value || "";
        occupationOther.value = "";
    } else if (value) {
        occupationSelect.value = "Others";
        occupationOther.value = value;
    } else {
        occupationSelect.value = "";
        occupationOther.value = "";
    }
    toggleMemberOccupationOther(occupationSelect);
}

function toggleMemberChallengeDescription(selectElement, descriptionGroupSelector, descriptionInputSelector) {
    const memberEntry = selectElement.closest(".member-entry");
    if (!memberEntry) return;

    const descriptionGroup = memberEntry.querySelector(descriptionGroupSelector);
    const descriptionInput = memberEntry.querySelector(descriptionInputSelector);
    if (!descriptionGroup || !descriptionInput) return;

    if (selectElement.value === "Yes") {
        descriptionGroup.style.display = "flex";
    } else {
        descriptionGroup.style.display = "none";
        descriptionInput.value = "";
    }
}

function toggleMemberAbroadCountry(selectElement) {
    const memberEntry = selectElement.closest(".member-entry");
    if (!memberEntry) return;

    const countryGroup = memberEntry.querySelector(".m-country-group");
    const countryInput = memberEntry.querySelector(".m-country");
    if (!countryGroup || !countryInput) return;

    if (selectElement.value === "Yes") {
        countryGroup.style.display = "flex";
    } else {
        countryGroup.style.display = "none";
        countryInput.value = "";
    }
}


function addMember() {
    const membersDiv = document.getElementById("members");
    const memberDiv = document.createElement("div");
    memberDiv.className = "member-entry";

    memberDiv.innerHTML = `
<div class="input-group">
            <input type="text" placeholder="Name *" class="m-name">
        </div>
        <div class="input-group">
            <select class="m-relation" onchange="toggleMemberRelationshipOther(this)">
                <option value="">Select Relationship to Family Head *</option>
                <option>Husband</option>
                <option>Wife</option>
                <option>Son</option>
                <option>Daughter</option>
                <option>Father</option>
                <option>Mother</option>
                <option>Brother</option>
                <option>Sister</option>
                <option>Grandfather</option>
                <option>Grandmother</option>
                <option>Grandson</option>
                <option>Granddaughter</option>
                <option>Son-in-law</option>
                <option>Daughter-in-law</option>
                <option>Father-in-law</option>
                <option>Mother-in-law</option>
                <option>Brother-in-law</option>
                <option>Sister-in-law</option>
                <option>Uncle</option>
                <option>Aunt</option>
                <option>Nephew</option>
                <option>Niece</option>
                <option>Guardian</option>
                <option>Other Dependent</option>
                <option>Other</option>
            </select>
        </div>
        <div class="input-group m-relation-other-group" style="display: none;">
            <input type="text" placeholder="Specify Relationship *" class="m-relation-other" maxlength="80">
        </div>
        <div class="input-group">
            <select class="m-gender">

                <option value="">Select Gender *</option>
                <option>Male</option>
                <option>Female</option>
            </select>
        </div>
        <div class="input-group">
            <select class="m-marital-status">
                <option value="">Select Marital Status *</option>
                <option>Single</option>
                <option>Married</option>
                <option>Widow</option>
                <option>Divorced</option>
                <option>Separated</option>
            </select>
        </div>
        <div class="input-group">
            <select class="m-blood-group">
                <option value="">Select Blood Group</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
                <option>O+</option>
                <option>O-</option>
            </select>
        </div>
        <div class="input-group">
            <select class="m-blood-donor">
                <option value="">Blood Donor?</option>
                <option>No</option>
                <option>Yes</option>
            </select>
        </div>
        <div class="input-group">
            <input type="date" placeholder="Date of Birth *" class="m-dob" onchange="updateMemberAge(this)" oninput="updateMemberAge(this)">
        </div>
        <div class="input-group">
            <input type="number" placeholder="Age *" class="m-age" min="0" max="150" readonly>
        </div>
        <div class="input-group">
            <input type="text" placeholder="Aadhar Number" class="m-aadhar">
        </div>
        <div class="input-group">
            <input type="text" placeholder="Qualification *" class="m-qualification">
        </div>
        <div class="input-group">
            <select class="m-occupation" onchange="toggleMemberOccupationOther(this)">
                <option value="">Select Occupation *</option>
                <option>Student</option>
                <option>Housewife</option>
                <option>Others</option>
            </select>
        </div>
        <div class="input-group m-occupation-other-group" style="display: none;">
            <input type="text" placeholder="Enter Occupation *" class="m-occupation-other">
        </div>
        <div class="input-group">
            <input type="tel" placeholder="Mobile Number" class="m-mobile" maxlength="10">
        </div>
        <div class="input-group">
            <select class="m-aalima-haafiz">
                <option value="">Aalima / Haafiz?</option>
                <option>None</option>
                <option>Aalima</option>
                <option>Haafiz</option>
            </select>
        </div>
        <div class="input-group">
            <select class="m-abroad" onchange="toggleMemberAbroadCountry(this)">
                <option value="">Working Abroad?</option>
                <option>No</option>
                <option>Yes</option>
            </select>
        </div>
        <div class="input-group m-country-group" style="display: none;">
            <input type="text" placeholder="Select Country *" class="m-country" list="countryList">
        </div>
        <div class="input-group">
            <select class="m-orphan">
                <option value="">Orphan? *</option>
                <option>No</option>
                <option>Yes</option>
            </select>
        </div>
        <div class="input-group">
            <select class="m-mentally-challenged" onchange="toggleMemberChallengeDescription(this, '.m-mentally-challenged-description-group', '.m-mentally-challenged-description')">
                <option value="">Mentally Challenged? *</option>
                <option>No</option>
                <option>Yes</option>
            </select>
        </div>
        <div class="input-group m-mentally-challenged-description-group" style="display: none;">
            <textarea placeholder="Describe mentally challenged details *" class="m-mentally-challenged-description" rows="3" style="resize: vertical; width: 100%;"></textarea>
        </div>
        <div class="input-group">
            <select class="m-physically-challenged" onchange="toggleMemberChallengeDescription(this, '.m-physically-challenged-description-group', '.m-physically-challenged-description')">
                <option value="">Physically Challenged? *</option>
                <option>No</option>
                <option>Yes</option>
            </select>
        </div>
        <div class="input-group m-physically-challenged-description-group" style="display: none;">
            <textarea placeholder="Describe physically challenged details *" class="m-physically-challenged-description" rows="3" style="resize: vertical; width: 100%;"></textarea>
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
    const bankDetails = getFieldValue("bankDetails");
    const familyIncome = getFamilyIncomeValue();
    const residentialType = getFieldValue("residentialType");
    const houseType = getHouseTypeValue();
    const lifeStyle = getFieldValue("lifeStyle");
    const needHome = getFieldValue("needHome", "No") || "No";
    const needToilet = getFieldValue("needToilet", "No") || "No";
    const needMedicalInsurance = getFieldValue("needMedicalInsurance", "No") || "No";
    const needFood = getFieldValue("needFood", "No") || "No";
    const noMaleSupport = getFieldValue("noMaleSupport", "No") || "No";
    const smartCardNeed = getFieldValue("smartCardNeed", "No") || "No";
    const govtDocsCorrection = getFieldValue("govtDocsCorrection", "No") || "No";
    const generalRemarks = getFieldValue("generalRemarks");
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
    let hasMemberValidationError = false;

    memberElements.forEach((el, index) => {
        const readMemberInput = (selector) => {
            const input = el.querySelector(selector);
            return input ? (input.value || "").trim() : "";
        };

const name = readMemberInput(".m-name");
        const relation = readMemberInput(".m-relation");
        const relationOther = readMemberInput(".m-relation-other");
        const gender = readMemberInput(".m-gender");

        const maritalStatus = readMemberInput(".m-marital-status");
        const bloodGroup = readMemberInput(".m-blood-group");
        const bloodDonor = readMemberInput(".m-blood-donor");
        const memberDob = readMemberInput(".m-dob");
        const memberAge = parseInt(readMemberInput(".m-age"), 10) || calculateAgeFromDob(memberDob) || 0;
        const mAadhar = readMemberInput(".m-aadhar");
        const qualification = readMemberInput(".m-qualification") || readMemberInput(".m-education");
        const occupationSelect = readMemberInput(".m-occupation");
        const occupationOther = readMemberInput(".m-occupation-other");
        const occupation = occupationSelect === "Others" ? occupationOther : occupationSelect;
        const mobile = readMemberInput(".m-mobile");
        const memberAalimaHaafiz = readMemberInput(".m-aalima-haafiz") || "None";
        const memberAbroad = readMemberInput(".m-abroad") || "No";
        const memberCountry = readMemberInput(".m-country");
        const orphan = readMemberInput(".m-orphan");
        const mentallyChallenged = readMemberInput(".m-mentally-challenged");
        const mentallyChallengedDescription = readMemberInput(".m-mentally-challenged-description");
        const physicallyChallenged = readMemberInput(".m-physically-challenged");
        const physicallyChallengedDescription = readMemberInput(".m-physically-challenged-description");

const hasAnyMemberData = [
            name, relation, relationOther, gender, maritalStatus, bloodGroup, bloodDonor, memberDob,

            mAadhar, qualification, occupationSelect, occupationOther, mobile,
            memberAalimaHaafiz === "None" ? "" : memberAalimaHaafiz,
            memberAbroad === "No" ? "" : memberAbroad,
            memberCountry, orphan, mentallyChallenged, mentallyChallengedDescription,
            physicallyChallenged, physicallyChallengedDescription
        ].some((value) => value !== "");

        if (!hasAnyMemberData) {
            return;
        }

const missingFields = [];
        if (!name) missingFields.push("Name");
        if (!relation) missingFields.push("Relationship to Family Head");
        if (relation === "Other" && !relationOther) missingFields.push("Specify Relationship");
        if (!gender) missingFields.push("Gender");

        if (!maritalStatus) missingFields.push("Marital Status");
        if (!memberDob) missingFields.push("Date of Birth");
        if (!qualification) missingFields.push("Qualification");
        if (!occupation) missingFields.push("Occupation");
        if (!orphan) missingFields.push("Orphan");
        if (!mentallyChallenged) missingFields.push("Mentally Challenged");
        if (mentallyChallenged === "Yes" && !mentallyChallengedDescription) missingFields.push("Mentally Challenged Description");
        if (!physicallyChallenged) missingFields.push("Physically Challenged");
        if (physicallyChallenged === "Yes" && !physicallyChallengedDescription) missingFields.push("Physically Challenged Description");

        if (missingFields.length > 0) {
            alert(`Please fill mandatory fields for family member ${index + 1}:\n${missingFields.join(", ")}`);
            hasMemberValidationError = true;
            return;
        }

        if (mobile && !/^\d{10}$/.test(mobile)) {
            alert(`Mobile number for member "${name}" must be exactly 10 digits.`);
            hasMemberValidationError = true;
            return;
        }

        if (mAadhar && !/^\d{12}$/.test(mAadhar)) {
            alert(`Aadhar number for member "${name}" must be exactly 12 digits.`);
            hasMemberValidationError = true;
            return;
        }

        if (memberAbroad === "Yes" && !allCountries.includes(memberCountry)) {
            alert(`Please select a valid country for member "${name}" since Working Abroad is Yes.`);
            hasMemberValidationError = true;
            return;
        }

members.push({
            name,
            relation,
            relationOther: relation === "Other" ? relationOther : "",
            gender,

            maritalStatus,
            bloodGroup,
            bloodDonor,
            dob: memberDob,
            age: memberAge,
            aadhar: mAadhar,
            qualification,
            education: qualification,
            occupation,
            mobile,
            aalimaHaafiz: memberAalimaHaafiz,
            abroad: memberAbroad,
            country: memberAbroad === "Yes" ? memberCountry : "",
            orphan,
            mentallyChallenged,
            mentallyChallengedDescription: mentallyChallenged === "Yes" ? mentallyChallengedDescription : "",
            physicallyChallenged,
            physicallyChallengedDescription: physicallyChallenged === "Yes" ? physicallyChallengedDescription : ""
        });

    });

    if (hasMemberValidationError) {
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
        bankDetails,
        familyIncome,
        residentialType,
        houseType,
        lifeStyle,
        needHome,
        needToilet,
        needMedicalInsurance,
        needFood,
        noMaleSupport,
        smartCardNeed,
        govtDocsCorrection,
        generalRemarks,
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

    const fields = [
        "headName", "fatherName", "motherName", "dob", "age", "phone", "street", "address",
        "aadhar", "ration", "education", "country", "bankDetails", "familyIncomeOther",
        "houseTypeOther", "generalRemarks"
    ];
    fields.forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.value = "";
    });

    document.getElementById("abroad").value = "No";
    document.getElementById("countryGroup").style.display = "none";
 document.getElementById("aalimaHaafiz").value = "None";
    document.getElementById("zakatGive").value = "No";
    document.getElementById("zakatReceive").value = "No";

    setFieldValue("familyIncome", "");
    setFieldValue("residentialType", "");
    setFieldValue("houseType", "");
    setFieldValue("lifeStyle", "");
    setFieldValue("needHome", "No");
    setFieldValue("needToilet", "No");
    setFieldValue("needMedicalInsurance", "No");
    setFieldValue("needFood", "No");
    setFieldValue("noMaleSupport", "No");
    setFieldValue("smartCardNeed", "No");
    setFieldValue("govtDocsCorrection", "No");
    toggleFamilyIncomeOther();
    toggleHouseTypeOther();

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

    if (!streetsDiv || !familiesDiv || !detailsDiv) return;

    familiesDiv.innerHTML = "";
    detailsDiv.innerHTML = "";
    detailsDiv.classList.add("empty");

    const streets = getDashboardStreetNames();

    if (streets.length === 0) {
        streetsDiv.innerHTML = "<p style='color: var(--text-muted); font-size: 0.875rem; text-align: center;'>No streets added yet.</p>";
        familiesDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: var(--radius-md); border: 1px dashed var(--border-color); grid-column: 1 / -1;">
                <p style="color: var(--text-muted); margin-bottom: 1rem;">Add street names in Street Master before creating family records.</p>
                <button class="street-master-btn" onclick="openStreetMaster()">Open Street Master</button>
            </div>
        `;
        return;
    }

    streetsDiv.innerHTML = "";
    streets.forEach((street) => {
        const btn = document.createElement("button");
        btn.textContent = street;
        btn.className = "pill-btn";
        btn.onclick = (event) => {
            document.querySelectorAll(".pill-btn").forEach((item) => item.classList.remove("active"));
            event.currentTarget.classList.add("active");
            showFamilies(street);
        };
        streetsDiv.appendChild(btn);
    });

    streetsDiv.firstChild.click();
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

    const streetKey = streetCompareKey(street);
    const filtered = families
        .filter((family) => streetCompareKey(family.street) === streetKey)
        .sort((a, b) => (a.headName || "").localeCompare(b.headName || ""));

    if (filtered.length === 0) {
        familiesDiv.innerHTML = `
            <div style="text-align:center;padding:2rem;background:#fff;border:1px dashed #dbe2ea;border-radius:10px;grid-column:1/-1;">
                <p style="color:var(--text-muted);margin:0;">No families are assigned to ${escapeHtml(street)}.</p>
            </div>
        `;
        return;
    }

    filtered.forEach((family) => {
        appendFamilyCard(family, familiesDiv, false);
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
        (f.bankDetails && f.bankDetails.toLowerCase().includes(query)) ||
        (f.familyIncome && f.familyIncome.toString().toLowerCase().includes(query)) ||
        (f.residentialType && f.residentialType.toLowerCase().includes(query)) ||
        (f.houseType && f.houseType.toLowerCase().includes(query)) ||
        (f.lifeStyle && f.lifeStyle.toLowerCase().includes(query)) ||
        (f.generalRemarks && f.generalRemarks.toLowerCase().includes(query)) ||
       (Array.isArray(f.members) && f.members.some((m) =>
            (m.name && m.name.toLowerCase().includes(query)) ||
            (m.gender && m.gender.toLowerCase().includes(query)) ||
            (m.maritalStatus && m.maritalStatus.toLowerCase().includes(query)) ||
            (m.bloodGroup && m.bloodGroup.toLowerCase().includes(query)) ||
            (m.bloodDonor && m.bloodDonor.toLowerCase().includes(query)) ||
(m.relation && m.relation.toLowerCase().includes(query)) ||
            (m.relationOther && m.relationOther.toLowerCase().includes(query)) ||
            (m.fatherName && m.fatherName.toLowerCase().includes(query)) ||

            (m.motherName && m.motherName.toLowerCase().includes(query)) ||
            (m.qualification && m.qualification.toLowerCase().includes(query)) ||
            (m.education && m.education.toLowerCase().includes(query)) ||
            (m.occupation && m.occupation.toLowerCase().includes(query)) ||
            (m.mobile && m.mobile.includes(query)) ||
            (m.orphan && m.orphan.toLowerCase().includes(query)) ||
            (m.mentallyChallenged && m.mentallyChallenged.toLowerCase().includes(query)) ||
            (m.mentallyChallengedDescription && m.mentallyChallengedDescription.toLowerCase().includes(query)) ||
            (m.physicallyChallenged && m.physicallyChallenged.toLowerCase().includes(query)) ||
            (m.physicallyChallengedDescription && m.physicallyChallengedDescription.toLowerCase().includes(query)) ||
            (m.income && m.income.toString().toLowerCase().includes(query)) ||
            (m.aalimaHaafiz && m.aalimaHaafiz.toLowerCase().includes(query)) ||
            (m.abroad && m.abroad.toLowerCase().includes(query)) ||
            (m.country && m.country.toLowerCase().includes(query)) ||
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
                <span class="detail-label">Banking Details</span>
                <span class="detail-value">${escapeHtml(family.bankDetails) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Family Income (Monthly)</span>
                <span class="detail-value">${escapeHtml(family.familyIncome) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Residential Type</span>
                <span class="detail-value">${escapeHtml(family.residentialType) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">House Type</span>
                <span class="detail-value">${escapeHtml(family.houseType) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Life Style</span>
                <span class="detail-value">${escapeHtml(family.lifeStyle) || "-"}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Need Home?</span>
                <span class="detail-value">${escapeHtml(family.needHome || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Need Toilet?</span>
                <span class="detail-value">${escapeHtml(family.needToilet || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Need Medical Insurance Card?</span>
                <span class="detail-value">${escapeHtml(family.needMedicalInsurance || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Need Food?</span>
                <span class="detail-value">${escapeHtml(family.needFood || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Family Without Male Support?</span>
                <span class="detail-value">${escapeHtml(family.noMaleSupport || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Smart Card / Ration Card Requirement</span>
                <span class="detail-value">${escapeHtml(family.smartCardNeed || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Need Govt Docs Correction?</span>
                <span class="detail-value">${escapeHtml(family.govtDocsCorrection || "No")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">General Remarks</span>
                <span class="detail-value">${escapeHtml(family.generalRemarks) || "-"}</span>
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
                            <th>Relationship</th>
                            <th>Gender</th>

                            <th>Marital Status</th>
                            <th>Blood Group</th>
                            <th>Blood Donor</th>
                            <th>DOB</th>
                            <th>Age</th>
                            <th>Aadhar</th>
                            <th>Qualification</th>
                            <th>Occupation</th>
                            <th>Mobile</th>
                            <th>Aalima / Haafiz</th>
                            <th>Working Abroad</th>
                            <th>Orphan</th>
                            <th>Mentally Challenged</th>
                            <th>Mental Description</th>
                            <th>Physically Challenged</th>
                            <th>Physical Description</th>

                        </tr>
                    </thead>
                    <tbody>
        `;
members.forEach((m) => {
            const qualification = m.qualification || m.education || "";
            const relationship = getMemberRelationshipDisplay(m);
            html += `

                <tr>
<td><strong>${escapeHtml(m.name)}</strong></td>
                    <td>${escapeHtml(relationship) || "Not Specified"}</td>
                    <td>${escapeHtml(m.gender) || "-"}</td>

                    <td>${escapeHtml(m.maritalStatus) || "-"}</td>
                    <td>${escapeHtml(m.bloodGroup) || "-"}</td>
                    <td>${escapeHtml(m.bloodDonor) || "-"}</td>
                    <td>${escapeHtml(m.dob) || "-"}</td>
                    <td>${m.age || "-"}</td>
                    <td>${escapeHtml(m.aadhar) || "-"}</td>
                    <td>${escapeHtml(qualification) || "-"}</td>
                    <td>${escapeHtml(m.occupation) || "-"}</td>
                    <td>${escapeHtml(m.mobile) || "-"}</td>
                    <td>${escapeHtml(m.aalimaHaafiz || "None")}</td>
                    <td>${escapeHtml(m.abroad || "No")} ${(m.abroad || "No") === "Yes" ? `(${escapeHtml(m.country)})` : ""}</td>
                    <td>${escapeHtml(m.orphan) || "-"}</td>
                    <td>${escapeHtml(m.mentallyChallenged) || "-"}</td>
                    <td>${escapeHtml(m.mentallyChallengedDescription) || "-"}</td>
                    <td>${escapeHtml(m.physicallyChallenged) || "-"}</td>
                    <td>${escapeHtml(m.physicallyChallengedDescription) || "-"}</td>

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
    refreshStreetDropdown(family.street || "");
    document.getElementById("address").value = family.address || "";

    document.getElementById("aadhar").value = family.aadhar || "";
    document.getElementById("ration").value = family.ration || "";
    document.getElementById("education").value = family.education || "";
    setFieldValue("bankDetails", family.bankDetails || "");
    setFamilyIncomeValue(family.familyIncome || "");
    setFieldValue("residentialType", family.residentialType || "");
    setHouseTypeValue(family.houseType || "");
    setFieldValue("lifeStyle", family.lifeStyle || "");
    setFieldValue("needHome", family.needHome || "No");
    setFieldValue("needToilet", family.needToilet || "No");
    setFieldValue("needMedicalInsurance", family.needMedicalInsurance || "No");
    setFieldValue("needFood", family.needFood || "No");
    setFieldValue("noMaleSupport", family.noMaleSupport || "No");
    setFieldValue("smartCardNeed", family.smartCardNeed || "No");
    setFieldValue("govtDocsCorrection", family.govtDocsCorrection || "No");
    setFieldValue("generalRemarks", family.generalRemarks || "");
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
            setMemberRelationshipValue(lastEntry, m.relation || "", m.relationOther || "");
            lastEntry.querySelector(".m-gender").value = m.gender || "";

            lastEntry.querySelector(".m-marital-status").value = m.maritalStatus || "";
            lastEntry.querySelector(".m-blood-group").value = m.bloodGroup || "";
            lastEntry.querySelector(".m-blood-donor").value = m.bloodDonor || "";
            lastEntry.querySelector(".m-dob").value = m.dob || "";
            lastEntry.querySelector(".m-age").value = m.age || calculateAgeFromDob(m.dob || "") || "";
            lastEntry.querySelector(".m-aadhar").value = m.aadhar || "";
            lastEntry.querySelector(".m-qualification").value = m.qualification || m.education || "";
            setMemberOccupationValue(lastEntry, m.occupation || "");
            lastEntry.querySelector(".m-mobile").value = m.mobile || "";
            lastEntry.querySelector(".m-aalima-haafiz").value = m.aalimaHaafiz || "None";
            lastEntry.querySelector(".m-abroad").value = m.abroad || "No";
            toggleMemberAbroadCountry(lastEntry.querySelector(".m-abroad"));
            if ((m.abroad || "No") === "Yes") {
                lastEntry.querySelector(".m-country").value = m.country || "";
            }
            lastEntry.querySelector(".m-orphan").value = m.orphan || "";
            lastEntry.querySelector(".m-mentally-challenged").value = m.mentallyChallenged || "";
            lastEntry.querySelector(".m-mentally-challenged-description").value = m.mentallyChallengedDescription || "";
            toggleMemberChallengeDescription(lastEntry.querySelector(".m-mentally-challenged"), ".m-mentally-challenged-description-group", ".m-mentally-challenged-description");
            lastEntry.querySelector(".m-physically-challenged").value = m.physicallyChallenged || "";
            lastEntry.querySelector(".m-physically-challenged-description").value = m.physicallyChallengedDescription || "";
            toggleMemberChallengeDescription(lastEntry.querySelector(".m-physically-challenged"), ".m-physically-challenged-description-group", ".m-physically-challenged-description");

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
        "Banking Details",
        "Family Income",
        "Residential Type",
        "House Type",
        "Life Style",
        "Need Home",
        "Need Toilet",
        "Need Medical Insurance",
        "Need Food",
        "Family Without Male Support",
        "Smart Card Need",
        "Govt Docs Correction",
        "General Remarks",
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
            `"${escapeCSV(f.bankDetails)}"`,
            `"${escapeCSV(f.familyIncome)}"`,
            `"${escapeCSV(f.residentialType)}"`,
            `"${escapeCSV(f.houseType)}"`,
            `"${escapeCSV(f.lifeStyle)}"`,
            `"${escapeCSV(f.needHome || "No")}"`,
            `"${escapeCSV(f.needToilet || "No")}"`,
            `"${escapeCSV(f.needMedicalInsurance || "No")}"`,
            `"${escapeCSV(f.needFood || "No")}"`,
            `"${escapeCSV(f.noMaleSupport || "No")}"`,
            `"${escapeCSV(f.smartCardNeed || "No")}"`,
            `"${escapeCSV(f.govtDocsCorrection || "No")}"`,
            `"${escapeCSV(f.generalRemarks)}"`,
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
                        bankDetails: readCol(cols, "Banking Details"),
                        familyIncome: readCol(cols, "Family Income"),
                        residentialType: readCol(cols, "Residential Type"),
                        houseType: readCol(cols, "House Type"),
                        lifeStyle: readCol(cols, "Life Style"),
                        needHome: readCol(cols, "Need Home") || "No",
                        needToilet: readCol(cols, "Need Toilet") || "No",
                        needMedicalInsurance: readCol(cols, "Need Medical Insurance") || "No",
                        needFood: readCol(cols, "Need Food") || "No",
                        noMaleSupport: readCol(cols, "Family Without Male Support") || "No",
                        smartCardNeed: readCol(cols, "Smart Card Need") || "No",
                        govtDocsCorrection: readCol(cols, "Govt Docs Correction") || "No",
                        generalRemarks: readCol(cols, "General Remarks"),
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
                        bankDetails: "",
                        familyIncome: "",
                        residentialType: "",
                        houseType: "",
                        lifeStyle: "",
                        needHome: "No",
                        needToilet: "No",
                        needMedicalInsurance: "No",
                        needFood: "No",
                        noMaleSupport: "No",
                        smartCardNeed: "No",
                        govtDocsCorrection: "No",
                        generalRemarks: "",
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
                        bankDetails: "",
                        familyIncome: "",
                        residentialType: "",
                        houseType: "",
                        lifeStyle: "",
                        needHome: "No",
                        needToilet: "No",
                        needMedicalInsurance: "No",
                        needFood: "No",
                        noMaleSupport: "No",
                        smartCardNeed: "No",
                        govtDocsCorrection: "No",
                        generalRemarks: "",
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

familyData.members = (familyData.members || []).map((member) => {
                    const qualification = member.qualification || member.education || "";
                    const memberAbroad = member.abroad || "No";
                   return {
                        name: member.name || "",
                        relation: member.relation || "",
                        relationOther: member.relationOther || "",
                        gender: member.gender || "",

                        maritalStatus: member.maritalStatus || "",
                        bloodGroup: member.bloodGroup || "",
                        bloodDonor: member.bloodDonor || "",
                        dob: member.dob || "",
                        age: parseInt(member.age, 10) || calculateAgeFromDob(member.dob || "") || 0,
                        aadhar: member.aadhar || "",
                        qualification,
                        education: qualification,
                        occupation: member.occupation || "",
                        mobile: member.mobile || "",
                        aalimaHaafiz: member.aalimaHaafiz || "None",
                        abroad: memberAbroad,
                        country: memberAbroad === "Yes" ? (member.country || "") : "",
                        orphan: member.orphan || "",
                        mentallyChallenged: member.mentallyChallenged || "",
                        mentallyChallengedDescription: member.mentallyChallengedDescription || "",
                        physicallyChallenged: member.physicallyChallenged || "",
                        physicallyChallengedDescription: member.physicallyChallengedDescription || ""
                    };
                });


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

families.sort((a, b) => (a.headName || "").localeCompare(b.headName || ""));
            await loadStreetMasters();
            await syncFamilyStreetsToMaster();
            refreshStreetDropdown();
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
