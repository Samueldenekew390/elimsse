/**
 * E-LMIS AUE - Applicant Profile Logic (Vanilla JavaScript)
 * Looks up applicant by OTP, listens for Realtime status updates, and displays payments, job offers, and e-visa.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initProfilePage();
});

// Mobile Hamburger Menu for Profile page
function initMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const navMenu = document.getElementById("navMenu");
  const navOverlay = document.getElementById("navOverlay");

  const closeMenu = () => {
    if (navMenu) navMenu.classList.remove("open");
    if (menuBtn) {
      menuBtn.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
    if (navOverlay) navOverlay.classList.remove("active");
  };

  const toggleMenu = () => {
    if (!navMenu || !menuBtn) return;
    const isOpen = navMenu.classList.toggle("open");
    menuBtn.classList.toggle("open", isOpen);
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (navOverlay) navOverlay.classList.toggle("active", isOpen);
  };

  if (menuBtn && navMenu) {
    menuBtn.addEventListener("click", toggleMenu);
    if (navOverlay) navOverlay.addEventListener("click", closeMenu);
    navMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });
  }
}

let currentApplicantId = null;
let realtimeChannel = null;

function initProfilePage() {
  const form = document.getElementById("profileLookupForm");
  const input = document.getElementById("profileOtpInput");
  const copyOtpBtn = document.getElementById("btnCopyProfileOtp");

  // Read URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const otpFromUrl = urlParams.get("otp");

  if (otpFromUrl) {
    input.value = otpFromUrl.trim().toUpperCase();
    loadProfile(otpFromUrl.trim().toUpperCase());
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const otp = input.value.trim().toUpperCase();
      if (!otp) return;
      // Update URL without reload
      window.history.pushState({}, "", `profile.html?otp=${encodeURIComponent(otp)}`);
      loadProfile(otp);
    });
  }

  if (copyOtpBtn) {
    copyOtpBtn.addEventListener("click", () => {
      const code = document.getElementById("profileOtpCode").textContent;
      navigator.clipboard.writeText(code);
      copyOtpBtn.textContent = "COPIED!";
      setTimeout(() => copyOtpBtn.textContent = "COPY OTP", 2000);
    });
  }
}

// Calculate age dynamically
function calculateAge(dobString) {
  if (!dobString) return "N/A";
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} ዓመት` : "N/A";
}

async function loadProfile(otp) {
  const loading = document.getElementById("profileLoadingState");
  const empty = document.getElementById("profileEmptyState");
  const container = document.getElementById("profileContainer");

  loading.style.display = "block";
  empty.style.display = "none";
  container.style.display = "none";

  try {
    const supabase = window.ELMIS.getClient();
    let data = null;

    if (supabase) {
      // Secure RPC lookup
      const { data: rpcResult, error: rpcError } = await supabase.rpc("lookup_applicant_by_otp", {
        input_otp: otp
      });

      if (!rpcError && rpcResult && rpcResult.success) {
        data = rpcResult;
      } else {
        // Fallback to direct query if RPC is not installed yet
        const { data: appData, error: appError } = await supabase
          .from("applicants")
          .select("*")
          .eq("otp", otp)
          .single();

        if (!appError && appData) {
          const { data: jobs } = await supabase.from("applicant_jobs").select("*").eq("applicant_id", appData.id);
          const { data: payments } = await supabase.from("payments").select("*").eq("applicant_id", appData.id);
          const { data: jobOffers } = await supabase.from("job_offers").select("*").eq("applicant_id", appData.id).order("created_at", { ascending: false }).limit(1);
          const { data: fp } = await supabase.from("fingerprint_status").select("*").eq("applicant_id", appData.id).single();
          const { data: ev } = await supabase.from("electronic_visas").select("*").eq("applicant_id", appData.id).eq("status", "Approved").single();

          data = {
            success: true,
            applicant: appData,
            jobs: jobs || [],
            payments: payments || [],
            job_offer: jobOffers && jobOffers[0] ? jobOffers[0] : null,
            fingerprint: fp || null,
            electronic_visa: ev || null
          };
        }
      }

      // Fetch appointments if not included
      if (data && data.applicant && !data.appointments) {
        const { data: appts } = await supabase
          .from("appointments")
          .select("*")
          .eq("applicant_id", data.applicant.id)
          .order("created_at", { ascending: true });
        data.appointments = appts || [];
      }
    } else {
      // Local demo fallback
      const local = JSON.parse(localStorage.getItem("elmis_demo_applicants") || "[]");
      const found = local.find(a => a.otp === otp);
      if (found) {
        const payments = JSON.parse(localStorage.getItem("elmis_demo_payments") || "[]").filter(p => p.otp === otp);
        const appts = JSON.parse(localStorage.getItem("elmis_demo_appointments") || "[]").filter(a => a.otp === otp || a.applicant_id === found.id);
        data = {
          success: true,
          applicant: found,
          jobs: (found.jobs || []).map(j => ({ job_name: j })),
          payments: payments,
          job_offer: found.job_offer || null,
          fingerprint: found.fingerprint || null,
          visa: found.visa || null,
          electronic_visa: found.electronic_visa || null,
          appointments: appts
        };
      }
    }

    if (!data || !data.success || !data.applicant) {
      loading.style.display = "none";
      empty.style.display = "block";
      empty.innerHTML = `
        <div style="color: var(--danger); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">
          ምንም መረጃ አልተገኘም
        </div>
        <p style="color: var(--text-muted);">ያስገቡት OTP (${otp}) በትክክል አልተመዘገበም። እባክዎ እንደገና ያረጋግጡ።</p>
      `;
      return;
    }

    currentApplicantId = data.applicant.id;
    renderProfileData(data);
    setupRealtime(otp, data.applicant.id);

    loading.style.display = "none";
    container.style.display = "block";
  } catch (err) {
    console.error("Profile load error:", err);
    loading.style.display = "none";
    empty.style.display = "block";
  }
}

function renderProfileData(data) {
  const app = data.applicant;

  // Header & Photo
  document.getElementById("profileFullName").textContent = app.full_name || "-";
  document.getElementById("profileOtpCode").textContent = app.otp || "-";
  document.getElementById("profileCountryBadge").textContent = app.country || "Dubai";
  document.getElementById("profileRegTypeBadge").textContent = app.registration_type === "eligible" ? "ማመልከት የሚችሉ (Eligible)" : "ማመልከት የማይችሉ (Ineligible)";

  const photoEl = document.getElementById("profilePhoto");
  photoEl.src = app.photo_path || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

  const statusBadge = document.getElementById("profileStatusBadge");
  statusBadge.textContent = app.status || "Pending";
  statusBadge.className = `badge ${app.status === "Approved" ? "badge-approved" : app.status === "Rejected" ? "badge-rejected" : "badge-pending"}`;

  // Personal Info
  document.getElementById("profileGender").textContent = app.gender || "-";
  document.getElementById("profileAge").textContent = calculateAge(app.date_of_birth);
  document.getElementById("profileMobile").textContent = app.mobile_number || "-";
  document.getElementById("profileEmail").textContent = app.email || "-";
  document.getElementById("profileAddress").textContent = app.address || "-";
  document.getElementById("profileFacebook").textContent = app.facebook_id || "-";

  // Jobs
  const jobsList = document.getElementById("profileJobsList");
  if (data.jobs && data.jobs.length > 0) {
    jobsList.innerHTML = data.jobs.map(j => `
      <span class="badge" style="background: #eff6ff; color: var(--primary-deep); border: 1px solid var(--border-color); font-size: 0.85rem; padding: 0.35rem 0.75rem;">
        ${j.job_name}
      </span>
    `).join("");
  } else {
    jobsList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">ምንም የተመረጠ ስራ የለም (መሰረታዊ ምዝገባ)</span>`;
  }

  // Payments Statuses
  const payments = data.payments || [];
  updatePaymentStatusBadge("statusPayReg", payments.find(p => p.payment_type === "registration"));
  updatePaymentStatusBadge("statusPayProc", payments.find(p => p.payment_type === "processing"));
  updatePaymentStatusBadge("statusPayBank", payments.find(p => p.payment_type === "bank_statement"));

  // Job Offer
  const jobOfferBox = document.getElementById("profileJobOfferContent");
  if (data.job_offer) {
    const jo = data.job_offer;
    jobOfferBox.innerHTML = `
      <div style="border-left: 4px solid var(--primary-blue); padding-left: 1rem;">
        <span class="badge badge-approved" style="margin-bottom: 0.5rem;">የስራ ጥሪ ዝግጁ ነው</span>
        <h4 style="font-size: 1.15rem; color: var(--primary-deep); font-weight: 800;">${jo.job_title}</h4>
        <p style="font-size: 0.9rem; color: var(--primary-blue); font-weight: 700;">ሀገር: ${jo.country}</p>
        <p style="font-size: 0.85rem; color: var(--text-main); margin-top: 0.4rem;">${jo.description || ""}</p>
        ${jo.image_path ? `
          <div style="margin-top: 0.75rem; max-height: 180px; overflow: hidden; border-radius: var(--radius-sm);">
            <img src="${jo.image_path}" alt="Offer Letter" style="width: 100%; object-fit: contain;" />
          </div>
        ` : ""}
      </div>
    `;
  } else {
    jobOfferBox.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">የስራ እድል ማስታወቂያዎ ገና አልተላከም።</p>`;
  }

  // Fingerprint Status
  const fpBadge = document.getElementById("profileFpBadge");
  if (data.fingerprint && data.fingerprint.status) {
    fpBadge.textContent = data.fingerprint.status;
    fpBadge.className = `badge ${data.fingerprint.status === "Completed" ? "badge-approved" : "badge-pending"}`;
  }

  // Visa & Electronic Visa
  const visaBox = document.getElementById("profileVisaContent");
  if (data.electronic_visa) {
    const ev = data.electronic_visa;
    visaBox.innerHTML = `
      <div style="background: #f0fdf4; border: 2px solid var(--success-border); border-radius: var(--radius-md); padding: 1.5rem; text-align: center;">
        <span class="badge badge-approved" style="font-size: 0.95rem; margin-bottom: 0.75rem;">ኤሌክትሮኒክ ቪዛ ጸድቋል (Electronic Visa Approved)</span>
        <h4 style="font-size: 1.3rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 0.5rem;">${ev.country} Work Visa</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">የቪዛ ማረጋገጫ ቁጥር: <strong>${ev.verification_code}</strong></p>
        <a href="verify.html?code=${encodeURIComponent(ev.verification_code)}" class="btn btn-primary" style="display: inline-flex;">
          ይፋዊ የቪዛ ሰርተፊኬት ይመልከቱ / VIEW E-VISA
        </a>
      </div>
    `;
  } else {
    const visaLink = document.getElementById("btnGoToVisaForm");
    if (visaLink) {
      visaLink.setAttribute("href", `visa.html?otp=${encodeURIComponent(app.otp)}`);
    }
  }

  // Appointments and 4-Stage Workflow Progression
  const appointments = data.appointments || [];
  const countBadge = document.getElementById("profileApptCountBadge");
  if (countBadge) {
    if (appointments.length > 0) {
      countBadge.textContent = `${appointments.length} የቀጠሮ ጥሪ(ዎች)`;
      countBadge.style.display = "inline-block";
    } else {
      countBadge.style.display = "none";
    }
  }

  // 1. Stage 1: Registration Fee (3,800 ETB) Appointment
  const regPayment = payments.find(p => p.payment_type === "registration");
  const regAppt = appointments.find(a => a.stage === "registration_fee");
  const step1El = document.getElementById("step1Status");
  const card1 = document.getElementById("stepCard1");
  if (step1El) {
    if (regAppt) {
      step1El.innerHTML = `<span class="badge badge-approved">ቀጠሮ: ${regAppt.appointment_date} (${regAppt.appointment_time})</span>`;
      if (card1) card1.style.borderTopColor = "var(--success)";
    } else if (regPayment && regPayment.status === "Approved") {
      step1El.innerHTML = `<span class="badge badge-approved">3,800 ብር ጸድቋል • ቀጠሮ በመጠባበቅ ላይ</span>`;
      if (card1) card1.style.borderTopColor = "var(--gold)";
    } else if (regPayment) {
      step1El.innerHTML = `<span class="badge badge-pending">3,800 ብር ተልኳል (በግምገማ ላይ)</span>`;
    } else {
      step1El.innerHTML = `<span class="badge badge-pending">3,800 ብር ክፍያ ይጠበቃል</span>`;
    }
  }

  // 2. Stage 2: Job Offer Appointment
  const jobAppt = appointments.find(a => a.stage === "job_offer");
  const step2El = document.getElementById("step2Status");
  const card2 = document.getElementById("stepCard2");
  if (step2El) {
    if (jobAppt) {
      step2El.innerHTML = `<span class="badge badge-approved">ቀጠሮ: ${jobAppt.appointment_date} (${jobAppt.appointment_time})</span>`;
      if (card2) card2.style.borderTopColor = "var(--success)";
    } else if (data.job_offer) {
      step2El.innerHTML = `<span class="badge badge-approved">የስራ ጥሪ ተዘጋጅቷል • ቀጠሮ በመጠባበቅ ላይ</span>`;
      if (card2) card2.style.borderTopColor = "var(--gold)";
    } else {
      step2El.innerHTML = `<span class="badge badge-pending">የስራ ጥሪ ይጠበቃል</span>`;
    }
  }

  // 3. Stage 3: Bank Statement Appointment
  const bankPayment = payments.find(p => p.payment_type === "bank_statement");
  const bankAppt = appointments.find(a => a.stage === "bank_statement");
  const step3El = document.getElementById("step3Status");
  const card3 = document.getElementById("stepCard3");
  if (step3El) {
    if (bankAppt) {
      step3El.innerHTML = `<span class="badge badge-approved">ቀጠሮ: ${bankAppt.appointment_date} (${bankAppt.appointment_time})</span>`;
      if (card3) card3.style.borderTopColor = "var(--success)";
    } else if (bankPayment && bankPayment.status === "Approved") {
      step3El.innerHTML = `<span class="badge badge-approved">ስቴትመንት ጸድቋል • ቀጠሮ በመጠባበቅ ላይ</span>`;
      if (card3) card3.style.borderTopColor = "var(--gold)";
    } else if (bankPayment) {
      step3El.innerHTML = `<span class="badge badge-pending">ስቴትመንት ተልኳል (በግምገማ ላይ)</span>`;
    } else {
      step3El.innerHTML = `<span class="badge badge-pending">የባንክ ስቴትመንት ይጠበቃል</span>`;
    }
  }

  // 4. Stage 4: Visa Appointment
  const hasVisa = !!(data.visa || data.electronic_visa || (data.applicant && data.applicant.has_visa));
  const visaAppt = appointments.find(a => a.stage === "visa");
  const step4El = document.getElementById("step4Status");
  const card4 = document.getElementById("stepCard4");
  if (step4El) {
    if (visaAppt) {
      step4El.innerHTML = `<span class="badge badge-approved">የቪዛ ቀጠሮ: ${visaAppt.appointment_date} (${visaAppt.appointment_time})</span>`;
      if (card4) card4.style.borderTopColor = "var(--success)";
    } else if (hasVisa) {
      step4El.innerHTML = `<span class="badge badge-approved">ቪዛ ተጠናቋል • ቀጠሮ በመጠባበቅ ላይ</span>`;
      if (card4) card4.style.borderTopColor = "var(--gold)";
    } else {
      step4El.innerHTML = `<span class="badge badge-pending">ቪዛ ማመልከቻ ይጠበቃል</span>`;
    }
  }

  // Appointments List Detail Box
  const apptsListEl = document.getElementById("profileAppointmentsList");
  if (apptsListEl) {
    if (appointments.length === 0) {
      apptsListEl.innerHTML = `
        <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
          እስካሁን የተላከ የቀጠሮ ጥሪ የለም። ክፍያዎን (3,800 ብር) ሲያስገቡ የመጀመሪያው የቀጠሮ ቀንና ሰዓት በአስተዳዳሪው ይላክልዎታል።
        </p>
      `;
    } else {
      const stageLabels = {
        "registration_fee": "ደረጃ 1: የ3,800 ብር ምዝገባ ክፍያ ቀጠሮ (Registration Fee Appointment)",
        "job_offer": "ደረጃ 2: የስራ እድል ጥሪ ቀጠሮ (Job Offer Appointment)",
        "bank_statement": "ደረጃ 3: የባንክ ስቴትመንት ቀጠሮ (Bank Statement Appointment)",
        "visa": "ደረጃ 4: የቪዛ ማጠናቀቂያ ቀጠሮ (Final Visa Appointment)"
      };

      apptsListEl.innerHTML = appointments.map(apt => {
        const stageTitle = stageLabels[apt.stage] || apt.stage;
        const isScheduled = apt.status === "Scheduled";
        return `
          <div style="background: white; border: 1px solid var(--border-color); border-left: 5px solid ${isScheduled ? "var(--primary-blue)" : "var(--success)"}; border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div>
                <span class="badge ${isScheduled ? "badge-approved" : "badge-pending"}" style="font-size: 0.75rem; margin-bottom: 0.25rem;">${apt.status || "Scheduled"}</span>
                <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); margin: 0;">${stageTitle}</h4>
              </div>
              <div style="background: #eff6ff; color: var(--primary-deep); font-weight: 700; font-size: 0.9rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid #bfdbfe;">
                📅 ${apt.appointment_date} &nbsp;|&nbsp; ⏰ ${apt.appointment_time}
              </div>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-main); margin-top: 0.5rem;">
              <strong>የቢሮ አድራሻ (Location):</strong> ${apt.location || "E-LMIS AUE Main Office, Addis Ababa, Bole Sub-City"}
            </div>
            ${apt.notes ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); background: #f8fafc; padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); margin-top: 0.5rem; border-left: 3px solid var(--gold);">
                <strong>መመሪያ / Instructions:</strong> ${apt.notes}
              </div>
            ` : ""}
          </div>
        `;
      }).join("");
    }
  }

  // Check Post-Visa Congratulations Notice:
  // "after visa let the sentence 'congratulations! now we will let you know when to come to our office by email'"
  const congratsBanner = document.getElementById("profileVisaCongratsBanner");
  if (congratsBanner) {
    if (hasVisa || visaAppt || data.electronic_visa) {
      congratsBanner.style.display = "block";
    } else {
      congratsBanner.style.display = "none";
    }
  }
}

function updatePaymentStatusBadge(elementId, paymentRecord) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!paymentRecord) {
    el.textContent = "Not Paid / አልተከፈለም";
    el.className = "badge badge-pending";
  } else if (paymentRecord.status === "Approved") {
    el.textContent = "Approved / ጸድቋል";
    el.className = "badge badge-approved";
  } else if (paymentRecord.status === "Rejected") {
    el.textContent = "Rejected / ውድቅ ተደርጓል";
    el.className = "badge badge-rejected";
  } else {
    el.textContent = "Pending / በግምገማ ላይ";
    el.className = "badge badge-pending";
  }
}

// Supabase Realtime Subscription for live updates
function setupRealtime(otp, applicantId) {
  const supabase = window.ELMIS.getClient();
  if (!supabase || !applicantId) return;

  // Clean up existing channel if any
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`applicant-profile-${applicantId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "applicants",
      filter: `id=eq.${applicantId}`
    }, (payload) => {
      console.log("Realtime applicant change received:", payload);
      loadProfile(otp);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "payments",
      filter: `applicant_id=eq.${applicantId}`
    }, () => {
      loadProfile(otp);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "job_offers",
      filter: `applicant_id=eq.${applicantId}`
    }, () => {
      loadProfile(otp);
    })
    .subscribe();
}
