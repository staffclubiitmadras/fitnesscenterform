// ════════════════════════════════════════════
//  CONFIGURATION  ← Replace with your Web App URL
// ════════════════════════════════════════════
const SHEET_WEBHOOK =
    "https://script.google.com/macros/s/AKfycbzpQIQW7YbMOgzgAcatYOP5SD6VcVvCI5KaItCjXyF4QH--_3w3d5cjhq_2W-UNMVrx/exec";

// ════════════════════════════════════════════
//  Fee Structure
// ════════════════════════════════════════════
const FEES = {
    Faculty: {
        Quarterly: 2000,
        Annual: 7000,
    },
    Staff: {
        Quarterly: 1500,
        Annual: 5000,
    },
    Guest_Faculty: { Monthly: 1000 },
    Guest_Staff: { Monthly: 750 },
};

const DISCOUNTS = [0, 0.1, 0.2, 0.3]; // index = additional member count (capped at 3+)

// ════════════════════════════════════════════
//  State
// ════════════════════════════════════════════
let currentStep = 1;
let formData = {};

// ════════════════════════════════════════════
//  Navigation
// ════════════════════════════════════════════
function goStep(n) {
    if (n > currentStep && !validateStep(currentStep)) return;

    // Hide current
    if (currentStep <= 2) {
        document
            .getElementById("step-" + currentStep)
            .classList.remove("active");
    } else if (currentStep === 3) {
        document
            .getElementById("step-confirm")
            .classList.remove("active");
    }

    currentStep = n;

    if (n === 3) {
        buildConfirmPage();
        // Reset declaration each time the review page is shown
        const chk = document.getElementById("declaration-chk");
        if (chk) {
            chk.checked = false;
        }
        document.getElementById("submit-btn").disabled = true;
        document
            .getElementById("step-confirm")
            .classList.add("active");
    } else {
        document
            .getElementById("step-" + n)
            .classList.add("active");
    }

    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
    const fill = document.getElementById("progress-fill");
    const pct = { 1: 33.33, 2: 66.66, 3: 100 };
    fill.style.width = (pct[currentStep] || 100) + "%";
    ["1", "2", "3"].forEach((i) => {
        const lbl = document.getElementById("lbl-" + i);
        lbl.classList.remove("active", "done");
        if (+i === currentStep) lbl.classList.add("active");
        else if (+i < currentStep) lbl.classList.add("done");
    });
}

// ════════════════════════════════════════════
//  Validation
// ════════════════════════════════════════════
function showErr(id, show) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle("show", show);
    }
}
function markField(id, error) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle("error", error);
    }
}

function validateStep(step) {
    let ok = true;

    if (step === 1) {
        const name = v("emp-name").trim();
        const eid = v("emp-id").trim();
        const mob = v("mobile").trim();
        const email = v("email").trim();
        const cat = document.querySelector(
            'input[name="emp-cat"]:checked',
        );

        const nameOk = name.length > 0;
        const eidOk = eid.length > 0;
        const mobOk = /^\d{10}$/.test(mob);
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const catOk = !!cat;

        markField("emp-name", !nameOk);
        showErr("err-emp-name", !nameOk);
        markField("emp-id", !eidOk);
        showErr("err-emp-id", !eidOk);
        markField("mobile", !mobOk);
        showErr("err-mobile", !mobOk);
        markField("email", !emailOk);
        showErr("err-email", !emailOk);
        showErr("err-emp-cat", !catOk);

        ok = nameOk && eidOk && mobOk && emailOk && catOk;
    }

    if (step === 2) {
        const type = v("membership-type");
        const plan = document.querySelector(
            'input[name="plan"]:checked',
        );
        const numDep = v("num-dependents");
        const numGuest = v("num-guests");

        const typeOk = !!type;
        const planOk = !typeOk || type === "guests-only" || !!plan;
        const depOk =
            !typeOk ||
            (type !== "employee-dependents" &&
                type !== "dependents-only") ||
            numDep !== "";
        const guestOk = !typeOk || numGuest !== "";

        markField("membership-type", !typeOk);
        showErr("err-membership-type", !typeOk);
        showErr("err-plan", !planOk);
        markField("num-dependents", !depOk);
        showErr("err-num-dependents", !depOk);
        markField("num-guests", !guestOk);
        showErr("err-num-guests", !guestOk);

        if (!typeOk || !planOk || !depOk || !guestOk) ok = false;

        // Validate dependent names
        const nDep = depOk && numDep ? parseInt(numDep) || 0 : 0;
        for (let i = 1; i <= nDep; i++) {
            const el = document.getElementById(`dep-name-dep-${i}`);
            if (el) {
                const filled = el.value.trim().length > 0;
                markField(`dep-name-dep-${i}`, !filled);
                const errEl = document.getElementById(
                    `err-dep-dep-${i}`,
                );
                if (errEl) errEl.classList.toggle("show", !filled);
                if (!filled) ok = false;
            }
        }

        // Validate guest names
        const nGuest =
            guestOk && numGuest ? parseInt(numGuest) || 0 : 0;
        for (let i = 1; i <= nGuest; i++) {
            const el = document.getElementById(
                `dep-name-guest-${i}`,
            );
            if (el) {
                const filled = el.value.trim().length > 0;
                markField(`dep-name-guest-${i}`, !filled);
                const errEl = document.getElementById(
                    `err-dep-guest-${i}`,
                );
                if (errEl) errEl.classList.toggle("show", !filled);
                if (!filled) ok = false;
            }
        }
    }

    return ok;
}

function v(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

// ════════════════════════════════════════════
//  Step 1 – Category Change
// ════════════════════════════════════════════
function onCategoryChange() {
    ["opt-faculty", "opt-staff"].forEach((id) => {
        const el = document.getElementById(id);
        if (el)
            el.classList.toggle(
                "selected",
                el.querySelector("input").checked,
            );
    });
    resetStep2();
}

function resetStep2() {
    document.getElementById("membership-type").value = "";
    document.getElementById("plan-wrapper").style.display = "none";
    document.getElementById("num-dep-wrapper").style.display =
        "none";
    document.getElementById("num-guest-wrapper").style.display =
        "none";
    document.getElementById("plan-group").innerHTML = "";
    document
        .querySelectorAll('input[name="plan"]')
        .forEach((i) => (i.checked = false));
    document.getElementById("num-dependents").value = "";
    document.getElementById("num-guests").value = "";
    document.getElementById("dependent-section").innerHTML = "";
    document.getElementById("fee-summary").style.display = "none";
}

// ════════════════════════════════════════════
//  Step 2 – Membership Type Change
// ════════════════════════════════════════════
function onMembershipTypeChange() {
    const type = v("membership-type");
    const cat = getCategory();

    // Reset downstream
    document.getElementById("plan-group").innerHTML = "";
    document
        .querySelectorAll('input[name="plan"]')
        .forEach((i) => (i.checked = false));
    document.getElementById("num-dependents").value = "";
    document.getElementById("dependent-section").innerHTML = "";
    document.getElementById("fee-summary").style.display = "none";

    const showPlan = type && type !== "guests-only";
    const showDep =
        type === "employee-dependents" ||
        type === "dependents-only";
    const showGuests = type === "guests-only";

    document.getElementById("plan-wrapper").style.display = showPlan
        ? "block"
        : "none";
    document.getElementById("num-dep-wrapper").style.display =
        showDep ? "block" : "none";
    document.getElementById("num-guest-wrapper").style.display =
        showGuests ? "block" : "none";

    if (showPlan) buildPlanOptions();

    // Build guest dropdown: guests-only requires ≥1; others default to 0
    buildGuestDropdown(type === "guests-only");

    // Update hint with category-specific rate
    const guestRate = cat === "Staff" ? "₹750" : "₹1,000";
    const hint = document.getElementById("guest-hint");
    if (hint)
        hint.textContent = `Monthly plan · ${cat || "Faculty/Staff"} guest: ${guestRate}/person`;
}

function buildGuestDropdown(required) {
    const sel = document.getElementById("num-guests");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Choose --</option>';
    if (!required)
        sel.innerHTML += '<option value="0">0 (No guests)</option>';
    for (let i = 1; i <= 5; i++)
        sel.innerHTML += `<option value="${i}">${i}</option>`;
    if (!required) sel.value = "0"; // default to no guests for non-guest-only types
}

// ════════════════════════════════════════════
//  Step 2 – Build Plan Options
// ════════════════════════════════════════════
function buildPlanOptions() {
    const cat = getCategory();
    const group = document.getElementById("plan-group");
    if (!group) return;
    group.innerHTML = "";

    const plans =
        cat === "Staff"
            ? [
                  {
                      value: "Quarterly",
                      label: "Quarterly",
                      desc: "3-month membership",
                      price: 1500,
                  },
                  {
                      value: "Annual",
                      label: "Annual",
                      desc: "12-month membership (Best Value)",
                      price: 5000,
                  },
              ]
            : [
                  {
                      value: "Quarterly",
                      label: "Quarterly",
                      desc: "3-month membership",
                      price: 2000,
                  },
                  {
                      value: "Annual",
                      label: "Annual",
                      desc: "12-month membership (Best Value)",
                      price: 7000,
                  },
              ];

    plans.forEach((p) => {
        const lbl = document.createElement("label");
        lbl.className = "radio-option";
        lbl.id = "opt-plan-" + p.value;
        lbl.innerHTML = `
  <input type="radio" name="plan" value="${p.value}" onchange="onPlanChange()" />
  <div>
    <div class="option-label">${p.label}</div>
    <div class="option-desc">${p.desc}</div>
  </div>
  <span class="option-badge">₹ ${p.price.toLocaleString()}</span>
`;
        group.appendChild(lbl);
    });
}

function onPlanChange() {
    document.querySelectorAll(".radio-option").forEach((el) => {
        const inp = el.querySelector("input");
        if (inp && inp.name === "plan")
            el.classList.toggle("selected", inp.checked);
    });
    buildMemberCards();
    updateFeeSummary();
}

// ════════════════════════════════════════════
//  Step 2 – Member count change
// ════════════════════════════════════════════
function onMembersChange() {
    buildMemberCards();
    updateFeeSummary();
}

function buildMemberCards() {
    const type = v("membership-type");
    const numDep =
        type === "employee-dependents" || type === "dependents-only"
            ? parseInt(v("num-dependents")) || 0
            : 0;
    const numGuest = parseInt(v("num-guests")) || 0;
    const section = document.getElementById("dependent-section");
    section.innerHTML = "";

    // poolPos tracks discount position; employee (if present) occupies position 0
    let poolPos =
        type === "employee-only" || type === "employee-dependents"
            ? 1
            : 0;

    // Dependent cards
    for (let i = 1; i <= numDep; i++) {
        const discPct = DISCOUNTS[Math.min(poolPos, 3)] * 100;
        const badge =
            discPct > 0
                ? `<span class="member-badge">${discPct}% Discount</span>`
                : "";
        section.innerHTML += memberCardHTML(
            `dep-${i}`,
            `Dependent ${i}`,
            badge,
        );
        poolPos++;
    }

    // Guest cards (fixed rate, no discount)
    const cat = getCategory();
    const guestRate = cat === "Staff" ? 750 : 1000;
    for (let i = 1; i <= numGuest; i++) {
        const badge = `<span class="member-badge" style="background:var(--green)">₹${guestRate}/month</span>`;
        section.innerHTML += memberCardHTML(
            `guest-${i}`,
            `Guest ${i}`,
            badge,
        );
    }
}

function memberCardHTML(prefix, title, badge) {
    const idName = `dep-name-${prefix}`;
    const idRel = `dep-rel-${prefix}`;
    const errId = `err-dep-${prefix}`;
    return `
<div class="member-card">
  <h4>${title} Details ${badge}</h4>
  <div class="member-grid">
    <div class="field-group" style="margin-bottom:0">
      <label for="${idName}">Full Name <span class="req">*</span></label>
      <input type="text" id="${idName}" placeholder="${title}'s full name" oninput="updateFeeSummary()" />
      <div class="field-error" id="${errId}">Please enter the name.</div>
    </div>
    <div class="field-group" style="margin-bottom:0">
      <label for="${idRel}">Relationship</label>
      <input type="text" id="${idRel}" placeholder="e.g. Spouse, Child, Guest…" />
    </div>
  </div>
</div>
`;
}

// ════════════════════════════════════════════
//  Fee Calculation
// ════════════════════════════════════════════
function getCategory() {
    const inp = document.querySelector(
        'input[name="emp-cat"]:checked',
    );
    return inp ? inp.value : null;
}

function getSelectedPlan() {
    const inp = document.querySelector(
        'input[name="plan"]:checked',
    );
    return inp ? inp.value : null;
}

function getBasePrice(cat, plan) {
    if (!cat || !plan) return 0;
    return FEES[cat] && FEES[cat][plan] ? FEES[cat][plan] : 0;
}

function computeFees() {
    const cat = getCategory();
    const type = v("membership-type");
    const plan = type === "guests-only" ? null : getSelectedPlan();
    const numDep =
        type === "employee-dependents" || type === "dependents-only"
            ? parseInt(v("num-dependents")) || 0
            : 0;
    const numGuest = parseInt(v("num-guests")) || 0;

    if (!cat || !type) return null;
    if (type !== "guests-only" && !plan) return null;
    if (
        (type === "employee-dependents" ||
            type === "dependents-only") &&
        !numDep
    )
        return null;
    if (type === "guests-only" && !numGuest) return null;

    const base =
        type !== "guests-only" ? getBasePrice(cat, plan) : 0;
    const guestRate =
        cat === "Staff"
            ? FEES.Guest_Staff.Monthly
            : FEES.Guest_Faculty.Monthly;
    const lines = [];
    let poolPos = 0;

    if (
        type === "employee-only" ||
        type === "employee-dependents"
    ) {
        lines.push({
            label: "Employee",
            originalAmt: base,
            discount: 0,
            finalAmt: base,
        });
        poolPos++;
    }

    for (let i = 1; i <= numDep; i++) {
        const disc = DISCOUNTS[Math.min(poolPos, 3)];
        const amt = Math.round(base * (1 - disc));
        lines.push({
            label: `Dependent ${i}`,
            originalAmt: base,
            discount: disc,
            finalAmt: amt,
        });
        poolPos++;
    }

    for (let i = 1; i <= numGuest; i++) {
        lines.push({
            label: `Guest ${i}`,
            originalAmt: guestRate,
            discount: 0,
            finalAmt: guestRate,
            isGuest: true,
        });
    }

    return lines;
}

function updateFeeSummary() {
    const summaryEl = document.getElementById("fee-summary");
    const lines = computeFees();
    if (!lines || lines.length === 0) {
        summaryEl.style.display = "none";
        return;
    }

    const total = lines.reduce((s, l) => s + l.finalAmt, 0);

    document.getElementById("fee-rows").innerHTML = lines
        .map(
            (l) => `
<div class="fee-row">
  <span>${l.label}${l.isGuest ? ' <span style="font-size:.75rem;color:var(--green)">(Monthly)</span>' : ""}</span>
  <span>
    ${
        l.discount > 0
            ? `<s style="color:#aaa">₹${l.originalAmt.toLocaleString()}</s>
         <span class="discount"> −${Math.round(l.discount * 100)}%</span>&nbsp;
         <strong>₹${l.finalAmt.toLocaleString()}</strong>`
            : `₹${l.finalAmt.toLocaleString()}`
    }
  </span>
</div>
`,
        )
        .join("");

    document.getElementById("fee-total").textContent =
        "₹ " + total.toLocaleString();
    summaryEl.style.display = "block";
}

// ════════════════════════════════════════════
//  Step 3 – Build Confirm Page
// ════════════════════════════════════════════
function buildConfirmPage() {
    const cat = getCategory();
    const type = v("membership-type");
    const plan = getSelectedPlan();
    const numDep = parseInt(v("num-dependents")) || 0;
    const numGuest = parseInt(v("num-guests")) || 0;

    const typeLabels = {
        "employee-only": "Employee Only",
        "employee-dependents": "Employee + Dependent(s)",
        "dependents-only": "Dependent(s) Only",
        "guests-only": "Guest(s) Only",
    };

    const rows = [
        ["Name", v("emp-name")],
        ["Employee ID", v("emp-id")],
        ["Mobile No.", v("mobile")],
        ["IITM Email", v("email")],
        ["Employee Category", cat],
        ["Membership Type", typeLabels[type] || type],
        [
            "Membership Plan",
            type === "guests-only"
                ? "Monthly (Guest)"
                : plan || "—",
        ],
    ];

    if (numDep > 0) rows.push(["No. of Dependents", numDep]);
    if (numGuest > 0) rows.push(["No. of Guests", numGuest]);

    for (let i = 1; i <= numDep; i++) {
        const nm = v(`dep-name-dep-${i}`);
        const rel = v(`dep-rel-dep-${i}`);
        rows.push([
            `Dependent ${i}`,
            nm + (rel ? ` (${rel})` : ""),
        ]);
    }
    for (let i = 1; i <= numGuest; i++) {
        const nm = v(`dep-name-guest-${i}`);
        const rel = v(`dep-rel-guest-${i}`);
        rows.push([`Guest ${i}`, nm + (rel ? ` (${rel})` : "")]);
    }

    document.getElementById("confirm-table").innerHTML = rows
        .map(
            ([k, val]) =>
                `<tr><td>${k}</td><td>${val || "—"}</td></tr>`,
        )
        .join("");

    const lines = computeFees();
    const total = lines
        ? lines.reduce((s, l) => s + l.finalAmt, 0)
        : 0;
    document.getElementById("confirm-fee-rows").innerHTML = (
        lines || []
    )
        .map(
            (l) => `
<div class="fee-row">
  <span>${l.label}${l.isGuest ? ' <span style="font-size:.75rem;color:var(--green)">(Monthly)</span>' : ""}</span>
  <span>
    ${
        l.discount > 0
            ? `<span class="discount">−${Math.round(l.discount * 100)}%</span>&nbsp;<strong>₹${l.finalAmt.toLocaleString()}</strong>`
            : `₹${l.finalAmt.toLocaleString()}`
    }
  </span>
</div>
`,
        )
        .join("");
    document.getElementById("confirm-fee-total").textContent =
        "₹ " + total.toLocaleString();
}

// ════════════════════════════════════════════
//  Submit
// ════════════════════════════════════════════
function submitForm() {
    const cat = getCategory();
    const type = v("membership-type");
    const plan = getSelectedPlan();
    const numDep = parseInt(v("num-dependents")) || 0;
    const numGuest = parseInt(v("num-guests")) || 0;
    const lines = computeFees() || [];
    const total = lines.reduce((s, l) => s + l.finalAmt, 0);

    const members = [];
    for (let i = 1; i <= numDep; i++) {
        members.push({
            name: v(`dep-name-dep-${i}`),
            relationship: v(`dep-rel-dep-${i}`),
            type: "Dependent",
        });
    }
    for (let i = 1; i <= numGuest; i++) {
        members.push({
            name: v(`dep-name-guest-${i}`),
            relationship: "Guest",
            type: "Guest",
        });
    }

    const payload = {
        timestamp: new Date().toISOString(),
        employeeName: v("emp-name"),
        employeeId: v("emp-id"),
        mobile: v("mobile"),
        email: v("email"),
        category: cat,
        membershipType: type,
        membershipPlan:
            type === "guests-only" ? "Monthly (Guest)" : plan || "",
        numberOfDependents: numDep,
        numberOfGuests: numGuest,
        members: JSON.stringify(members),
        totalFee: total,
    };

    document.getElementById("submit-label").textContent =
        "Submitting…";
    document
        .getElementById("submit-spinner")
        .classList.remove("hidden");
    document.getElementById("submit-btn").disabled = true;

    fetch(SHEET_WEBHOOK, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
        .then(() => showSuccess())
        .catch(() => showSuccess());
}

function onDeclarationChange() {
    const checked =
        document.getElementById("declaration-chk").checked;
    document.getElementById("submit-btn").disabled = !checked;
}

function showSuccess() {
    document
        .getElementById("step-confirm")
        .classList.remove("active");
    document.getElementById("step-success").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
