/**
 * E-LMIS AUE - Admin Portal Logic
 * Handles Authentication, Applicant approvals, Payment verification, Visa issuance, and Settings updates.
 */

let currentAdminUser = null;
let currentTab = "applicants";

document.addEventListener("DOMContentLoaded", () => {
  initAdminAuth();
  initTabNavigation();
  initModals();
  initSettingsTab();
});

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function calculateAge(dobString) {
  if (!dobString) return "N/A";
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? `${age} ዓመት` : "N/A";
}

// 1. AUTHENTICATION
function initAdminAuth() {
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("btnAdminLogout");
  const supabase = window.ELMIS.getClient();

  // Check existing session
  if (supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleUserLoggedIn(session.user);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleUserLoggedIn(session.user);
      } else {
        handleUserLoggedOut();
      }
    });
  } else {
    // Check demo local session
    const demoUser = localStorage.getItem("elmis_admin_logged_in");
    if (demoUser) {
      handleUserLoggedIn({ email: demoUser });
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("adminLoginEmail").value.trim();
      const password = document.getElementById("adminLoginPassword").value;
      const submitBtn = document.getElementById("btnAdminLoginSubmit");

      submitBtn.disabled = true;
      submitBtn.textContent = "እየገባ ነው...";

      try {
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          handleUserLoggedIn(data.user);
          showToast("እንኳን ደህና መጡ! በተሳካ ሁኔታ ገብተዋል።", "success");
        } else {
          // Demo fallback
          localStorage.setItem("elmis_admin_logged_in", email);
          handleUserLoggedIn({ email });
          showToast("Demo Mode: ገብተዋል", "success");
        }
      } catch (err) {
        console.error("Login failed:", err);
        showToast(err.message || "የተሳሳተ ኢሜል ወይም የይለፍ ቃል።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "ግባ / LOGIN";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem("elmis_admin_logged_in");
      handleUserLoggedOut();
      showToast("በተሳካ ሁኔታ ወጥተዋል።", "info");
    });
  }
}

function handleUserLoggedIn(user) {
  currentAdminUser = user;
  document.getElementById("adminLoginSection").style.display = "none";
  document.getElementById("adminDashboardSection").style.display = "block";
  document.getElementById("adminNavUserSection").style.display = "flex";
  document.getElementById("adminUserEmail").textContent =
    user.email || "Staff Admin";

  loadApplicantsTab();
}

function handleUserLoggedOut() {
  currentAdminUser = null;
  document.getElementById("adminLoginSection").style.display = "block";
  document.getElementById("adminDashboardSection").style.display = "none";
  document.getElementById("adminNavUserSection").style.display = "none";
}

// 2. TAB NAVIGATION
function initTabNavigation() {
  const tabs = document.querySelectorAll(".admin-tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active", "btn-primary");
        t.classList.add("btn-secondary");
      });
      tab.classList.add("active", "btn-primary");
      tab.classList.remove("btn-secondary");

      const tabName = tab.getAttribute("data-tab");
      currentTab = tabName;

      document
        .querySelectorAll(".admin-tab-content")
        .forEach((c) => (c.style.display = "none"));

      if (tabName === "applicants") {
        document.getElementById("tabContentApplicants").style.display = "block";
        loadApplicantsTab();
      } else if (tabName === "payments") {
        document.getElementById("tabContentPayments").style.display = "block";
        loadPaymentsTab();
      } else if (tabName === "visas") {
        document.getElementById("tabContentVisas").style.display = "block";
        loadVisasTab();
      } else if (tabName === "appointments") {
        document.getElementById("tabContentAppointments").style.display =
          "block";
        loadAppointmentsTab();
      } else if (tabName === "settings") {
        document.getElementById("tabContentSettings").style.display = "block";
        loadSettingsTab();
      } else if (tabName === "logs") {
        document.getElementById("tabContentLogs").style.display = "block";
        loadLogsTab();
      }
    });
  });

  // Applicants filter events
  const searchInput = document.getElementById("adminSearchApplicant");
  const filterCountry = document.getElementById("adminFilterCountry");
  const filterStatus = document.getElementById("adminFilterStatus");
  const filterType = document.getElementById("adminFilterType");
  const btnRefresh = document.getElementById("btnRefreshApplicants");

  [searchInput, filterCountry, filterStatus, filterType].forEach((el) => {
    if (el) el.addEventListener("change", () => loadApplicantsTab());
  });
  if (searchInput)
    searchInput.addEventListener(
      "input",
      debounce(() => loadApplicantsTab(), 400),
    );
  if (btnRefresh)
    btnRefresh.addEventListener("click", () => loadApplicantsTab());

  // Payments filter
  const filterPayment = document.getElementById("adminFilterPaymentType");
  if (filterPayment) {
    filterPayment.addEventListener("change", () => loadPaymentsTab());
  }

  // Appointments filter events
  const searchAppt = document.getElementById("adminSearchAppointment");
  const filterAppStage = document.getElementById("adminFilterAppStage");
  const filterAppStatus = document.getElementById("adminFilterAppStatus");
  const btnRefreshAppts = document.getElementById("btnRefreshAppointments");

  [filterAppStage, filterAppStatus].forEach((el) => {
    if (el) el.addEventListener("change", () => loadAppointmentsTab());
  });
  if (searchAppt)
    searchAppt.addEventListener(
      "input",
      debounce(() => loadAppointmentsTab(), 400),
    );
  if (btnRefreshAppts)
    btnRefreshAppts.addEventListener("click", () => loadAppointmentsTab());
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 3. APPLICANTS TAB
async function loadApplicantsTab() {
  const tbody = document.getElementById("adminApplicantsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">መረጃ በመጫን ላይ ነው...</td></tr>`;

  const search = document
    .getElementById("adminSearchApplicant")
    .value.trim()
    .toLowerCase();
  const country = document.getElementById("adminFilterCountry").value;
  const status = document.getElementById("adminFilterStatus").value;
  const type = document.getElementById("adminFilterType").value;

  try {
    const supabase = window.ELMIS.getClient();
    let applicants = [];

    if (supabase) {
      let query = supabase
        .from("applicants")
        .select("*")
        .order("created_at", { ascending: false });

      if (country !== "ALL") query = query.eq("country", country);
      if (status !== "ALL") query = query.eq("status", status);
      if (type !== "ALL") query = query.eq("registration_type", type);
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,otp.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (!error && data) applicants = data;
    } else {
      let local = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );
      if (country !== "ALL") local = local.filter((a) => a.country === country);
      if (status !== "ALL") local = local.filter((a) => a.status === status);
      if (type !== "ALL")
        local = local.filter((a) => a.registration_type === type);
      if (search) {
        local = local.filter(
          (a) =>
            (a.full_name || "").toLowerCase().includes(search) ||
            (a.otp || "").toLowerCase().includes(search),
        );
      }
      applicants = local;
    }

    if (applicants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">ምንም አመልካች አልተገኘም</td></tr>`;
      return;
    }

    tbody.innerHTML = applicants
      .map((app) => {
        const age = calculateAge(app.date_of_birth);
        const photo =
          app.photo_path ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        const badgeClass =
          app.status === "Approved"
            ? "badge-approved"
            : app.status === "Rejected"
              ? "badge-rejected"
              : "badge-pending";

        return `
        <tr>
          <td>
            <img src="${photo}" alt="" style="width: 42px; height: 42px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-light);" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 24 24\\' fill=\\'%23cbd5e1\\'%3E%3Cpath d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E'" />
          </td>
          <td><code style="font-weight: 700; color: var(--primary-deep);">${app.otp}</code></td>
          <td><strong>${app.full_name}</strong></td>
          <td>${app.country || "Dubai"}</td>
          <td>${app.gender || "-"} / ${age}</td>
          <td>${app.mobile_number || "-"}</td>
          <td><span class="badge ${badgeClass}">${app.status}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(app.created_at || Date.now()).toLocaleDateString()}</td>
          <td>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary" onclick="viewApplicantDetails('${app.id || app.otp}')" style="min-height: 32px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                ዝርዝር / View
              </button>
              <button type="button" class="btn btn-primary" onclick="openJobOfferModal('${app.id || app.otp}', '${app.country || "Dubai"}')" style="min-height: 32px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                Offer
              </button>
              ${
                app.status !== "Approved"
                  ? `
                <button type="button" class="btn btn-primary" onclick="quickUpdateStatus('${app.id || app.otp}', 'Approved')" style="min-height: 32px; padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--success);">
                  âœ“
                </button>
              `
                  : ""
              }
              ${
                app.status !== "Rejected"
                  ? `
                <button type="button" class="btn btn-secondary" onclick="quickUpdateStatus('${app.id || app.otp}', 'Rejected')" style="min-height: 32px; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger);">
                  âœ—
                </button>
              `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Load applicants error:", err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger);">መረጃውን ማምጣት አልተቻለም።</td></tr>`;
  }
}

// Quick Status Update
window.quickUpdateStatus = async function (idOrOtp, newStatus) {
  try {
    const supabase = window.ELMIS.getClient();
    if (supabase) {
      await supabase
        .from("applicants")
        .update({ status: newStatus })
        .or(`id.eq.${idOrOtp},otp.eq.${idOrOtp}`);

      // Log audit
      await logAuditAction(
        "Update Applicant Status",
        `Set status to ${newStatus} for applicant ${idOrOtp}`,
      );
    } else {
      const local = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );
      const app = local.find((a) => a.id === idOrOtp || a.otp === idOrOtp);
      if (app) app.status = newStatus;
      localStorage.setItem("elmis_demo_applicants", JSON.stringify(local));
    }
    showToast(`ሁኔታው ወደ ${newStatus} ተቀይሯል!`, "success");
    loadApplicantsTab();
  } catch (err) {
    console.error(err);
    showToast("ሁኔታውን መቀየር አልተቻለም።", "error");
  }
};

// 4. APPLICANT DETAILS MODAL
window.viewApplicantDetails = async function (idOrOtp) {
  const modal = document.getElementById("applicantDetailsModal");
  const body = document.getElementById("modalAppBodyContent");

  modal.style.display = "flex";
  body.innerHTML = `<div style="text-align: center; padding: 2rem;">እየተጫነ ነው...</div>`;

  try {
    const supabase = window.ELMIS.getClient();
    let app = null;
    let jobs = [];
    let payments = [];
    let fp = null;

    if (supabase) {
      const { data } = await supabase
        .from("applicants")
        .select("*")
        .or(`id.eq.${idOrOtp},otp.eq.${idOrOtp}`)
        .single();
      app = data;

      if (app) {
        const { data: jobData } = await supabase
          .from("applicant_jobs")
          .select("*")
          .eq("applicant_id", app.id);
        const { data: payData } = await supabase
          .from("payments")
          .select("*")
          .eq("applicant_id", app.id);
        const { data: fpData } = await supabase
          .from("fingerprint_status")
          .select("*")
          .eq("applicant_id", app.id)
          .single();
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*")
          .eq("applicant_id", app.id)
          .order("created_at", { ascending: true });
        jobs = jobData || [];
        payments = payData || [];
        fp = fpData;
        appts = apptData || [];
      }
    } else {
      const local = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );
      app = local.find((a) => a.id === idOrOtp || a.otp === idOrOtp);
      if (app) {
        jobs = (app.jobs || []).map((j) => ({ job_name: j }));
        payments = JSON.parse(
          localStorage.getItem("elmis_demo_payments") || "[]",
        ).filter((p) => p.otp === app.otp);
        appts = JSON.parse(
          localStorage.getItem("elmis_demo_appointments") || "[]",
        ).filter((a) => a.otp === app.otp || a.applicant_id === app.id);
      }
    }

    if (!app) {
      body.innerHTML = `<div style="color: var(--danger);">አመልካቹ አልተገኘም</div>`;
      return;
    }

    const age = calculateAge(app.date_of_birth);
    const photo =
      app.photo_path ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

    body.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-light); padding-bottom: 1rem; flex-wrap: wrap;">
        <img src="${photo}" alt="" style="width: 100px; height: 100px; object-fit: cover; border-radius: var(--radius-md); border: 2px solid var(--primary-blue);" />
        <div style="flex: 1;">
          <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--primary-deep);">${app.full_name}</h3>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            OTP: <strong style="color: var(--primary-blue);">${app.otp}</strong> | ሀገር: <strong>${app.country}</strong>
          </p>
          <span class="badge ${app.status === "Approved" ? "badge-approved" : app.status === "Rejected" ? "badge-rejected" : "badge-pending"}">
            ${app.status}
          </span>
        </div>
      </div>

      <!-- Info Details -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <div><strong>ፆታ:</strong> ${app.gender || "-"}</div>
        <div><strong>እድሜ:</strong> ${age}</div>
        <div><strong>ስልክ:</strong> <a href="tel:${app.mobile_number}">${app.mobile_number}</a></div>
        <div><strong>ኢሜል:</strong> ${app.email || "-"}</div>
        <div><strong>አድራሻ:</strong> ${app.address || "-"}</div>
        <div><strong>Facebook:</strong> ${app.facebook_id || "-"}</div>
        <div><strong>ምዝገባ አይነት:</strong> ${app.registration_type}</div>
        <div><strong>የተመዘገበበት ቀን:</strong> ${new Date(app.created_at || Date.now()).toLocaleString()}</div>
      </div>

      <!-- Job Choices -->
      <div style="margin-bottom: 1.5rem;">
        <strong style="display: block; margin-bottom: 0.5rem;">የተመረጡ የስራ አይነቶች:</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
          ${jobs.length > 0 ? jobs.map((j) => `<span class="badge" style="background:#eff6ff; color:var(--primary-deep); border:1px solid var(--border-color);">${j.job_name}</span>`).join("") : `<span style="color:var(--text-muted);">የለም</span>`}
        </div>
      </div>

      <!-- Fingerprint Updater -->
      <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <strong style="display: block; margin-bottom: 0.5rem; color: var(--primary-deep);">
          5 Fingerprint / የአምስት ጣት ምልክት ሁኔታ:
        </strong>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <select id="modalFpSelect" class="form-control" style="width: 200px;">
            <option value="Not Scheduled" ${fp?.status === "Not Scheduled" ? "selected" : ""}>Not Scheduled</option>
            <option value="Scheduled" ${fp?.status === "Scheduled" ? "selected" : ""}>Scheduled</option>
            <option value="Completed" ${fp?.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>
          <button type="button" class="btn btn-primary" onclick="saveFingerprintStatus('${app.id}', '${app.otp}')" style="min-height: 38px; padding: 0.35rem 0.75rem;">
            ሁኔታውን መዝግብ
          </button>
        </div>
      </div>

      <!-- Appointments & 4-Stage Workflow Section -->
      <div style="background: #f8fafc; border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <strong style="color: var(--primary-deep); font-size: 1rem;">📅 የተላኩ ይፋዊ ቀጠሮዎች (${appts.length}) / Scheduled Appointments:</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted);">4-Stage Appointment Workflow</span>
        </div>

        ${
          appts.length > 0
            ? `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            ${appts
              .map(
                (apt) => `
              <div style="background: white; border: 1px solid var(--border-color); border-left: 4px solid var(--primary-blue); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <strong style="color: var(--primary-deep);">${apt.stage}</strong>: 📅 ${apt.appointment_date} @ ⏰ ${apt.appointment_time}
                  <div style="color: var(--text-muted); font-size: 0.8rem;">📍 ${apt.location || ""} ${apt.notes ? `| 📝 ${apt.notes}` : ""}</div>
                </div>
                <span class="badge ${apt.status === "Scheduled" ? "badge-approved" : "badge-pending"}">${apt.status}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : `<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">እስካሁን የተላከ ቀጠሮ የለም።</p>`
        }

        <div style="border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">አዲስ ቀጠሮ ላክ (Send Stage Appointment):</span>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('applicantDetailsModal').style.display='none'; openAppointmentModal('${app.id}', '${app.otp}', '${encodeURIComponent(app.full_name || "")}', '${app.country || "Dubai"}', 'registration_fee')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
              + 1. የ3,800 ብር ክፍያ ቀጠሮ
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('applicantDetailsModal').style.display='none'; openAppointmentModal('${app.id}', '${app.otp}', '${encodeURIComponent(app.full_name || "")}', '${app.country || "Dubai"}', 'job_offer')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
              + 2. የስራ ጥሪ ቀጠሮ
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('applicantDetailsModal').style.display='none'; openAppointmentModal('${app.id}', '${app.otp}', '${encodeURIComponent(app.full_name || "")}', '${app.country || "Dubai"}', 'bank_statement')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
              + 3. የባንክ ስቴትመንት ቀጠሮ
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('applicantDetailsModal').style.display='none'; openAppointmentModal('${app.id}', '${app.otp}', '${encodeURIComponent(app.full_name || "")}', '${app.country || "Dubai"}', 'visa')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
              + 4. የቪዛ ማጠናቀቂያ ቀጠሮ
            </button>
          </div>
        </div>
      </div>

      <!-- Overall Status Changer -->
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="quickUpdateStatus('${app.id}', 'Pending'); document.getElementById('applicantDetailsModal').style.display='none';">
          Set Pending
        </button>
        <button type="button" class="btn btn-secondary" style="color: var(--danger);" onclick="quickUpdateStatus('${app.id}', 'Rejected'); document.getElementById('applicantDetailsModal').style.display='none';">
          Reject
        </button>
        <button type="button" class="btn btn-primary" style="background: var(--success);" onclick="quickUpdateStatus('${app.id}', 'Approved'); document.getElementById('applicantDetailsModal').style.display='none';">
          Approve
        </button>
      </div>
    `;
  } catch (err) {
    console.error("View applicant error:", err);
  }
};

window.saveFingerprintStatus = async function (applicantId, otp) {
  const status = document.getElementById("modalFpSelect").value;
  try {
    const supabase = window.ELMIS.getClient();
    if (supabase) {
      await supabase.from("fingerprint_status").upsert(
        {
          applicant_id: applicantId,
          status: status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "applicant_id" },
      );
      await logAuditAction(
        "Update Fingerprint",
        `Set fingerprint to ${status} for applicant ${applicantId}`,
      );
    } else {
      const local = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );
      const a = local.find((x) => x.otp === otp || x.id === applicantId);
      if (a) {
        a.fingerprint = { status };
        localStorage.setItem("elmis_demo_applicants", JSON.stringify(local));
      }
    }
    showToast("የጣት ምልክት ሁኔታ ተመዝግቧል!", "success");
  } catch (err) {
    console.error(err);
    showToast("ማስቀመጥ አልተቻለም።", "error");
  }
};

// 5. JOB OFFER MODAL
window.openJobOfferModal = function (applicantId, country) {
  const modal = document.getElementById("jobOfferModal");
  document.getElementById("offerApplicantId").value = applicantId;
  document.getElementById("offerCountry").value = country || "Dubai";
  modal.style.display = "flex";
};

// 6. PAYMENTS TAB
async function loadPaymentsTab() {
  const tbody = document.getElementById("adminPaymentsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">ክፍያዎች በመጫን ላይ ናቸው...</td></tr>`;

  const filterType = document.getElementById("adminFilterPaymentType").value;

  try {
    const supabase = window.ELMIS.getClient();
    let payments = [];

    if (supabase) {
      let query = supabase
        .from("payments")
        .select("*, applicants(full_name, otp, mobile_number)")
        .order("created_at", { ascending: false });
      if (filterType !== "ALL") query = query.eq("payment_type", filterType);
      const { data, error } = await query;
      if (!error && data) payments = data;
    } else {
      let demo = JSON.parse(
        localStorage.getItem("elmis_demo_payments") || "[]",
      );
      if (filterType !== "ALL")
        demo = demo.filter((p) => p.payment_type === filterType);
      payments = demo;
    }

    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">ምንም የክፍያ መዝገብ የለም</td></tr>`;
      return;
    }

    tbody.innerHTML = payments
      .map((p) => {
        const applicantName = p.applicants?.full_name || "Applicant";
        const otp = p.applicants?.otp || p.otp || "-";
        const typeLabel =
          p.payment_type === "registration"
            ? "ምዝገባ (3,800 ETB)"
            : p.payment_type === "processing"
              ? "ሂደት (18,200 ETB)"
              : "ስቴትመንት (46,300 ETB)";
        const badgeClass =
          p.status === "Approved"
            ? "badge-approved"
            : p.status === "Rejected"
              ? "badge-rejected"
              : "badge-pending";

        return `
        <tr>
          <td>
            <strong>${applicantName}</strong><br>
            <code style="font-size: 0.8rem; color: var(--primary-deep);">${otp}</code>
          </td>
          <td>${typeLabel}</td>
          <td><strong>${p.amount} ETB</strong></td>
          <td>
            ${
              p.receipt_path
                ? `
              <a href="${p.receipt_path}" target="_blank" class="btn btn-secondary" style="min-height: 28px; padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                ደረሰኝ ይመልከቱ / View
              </a>
            `
                : `<span style="color: var(--text-muted); font-size: 0.8rem;">${p.filename || "Uploaded"}</span>`
            }
          </td>
          <td style="font-size: 0.8rem;">${new Date(p.created_at || Date.now()).toLocaleDateString()}</td>
          <td><span class="badge ${badgeClass}">${p.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <button type="button" class="btn btn-primary" onclick="updatePaymentDecision('${p.id || p.otp}', 'Approved')" style="min-height: 30px; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: var(--success);">
                Approve
              </button>
              <button type="button" class="btn btn-secondary" onclick="updatePaymentDecision('${p.id || p.otp}', 'Rejected')" style="min-height: 30px; padding: 0.2rem 0.6rem; font-size: 0.75rem; color: var(--danger);">
                Reject
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Load payments error:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">መጫን አልተቻለም</td></tr>`;
  }
}

window.updatePaymentDecision = async function (idOrOtp, decision) {
  try {
    const supabase = window.ELMIS.getClient();
    if (supabase) {
      await supabase
        .from("payments")
        .update({ status: decision })
        .eq("id", idOrOtp);
      await logAuditAction(
        "Payment Decision",
        `Set payment ${idOrOtp} to ${decision}`,
      );
    } else {
      const demo = JSON.parse(
        localStorage.getItem("elmis_demo_payments") || "[]",
      );
      const found = demo.find((p) => p.otp === idOrOtp);
      if (found) found.status = decision;
      localStorage.setItem("elmis_demo_payments", JSON.stringify(demo));
    }
    showToast(`የክፍያው ሁኔታ ${decision} ተብሏል!`, "success");
    loadPaymentsTab();
  } catch (err) {
    console.error(err);
    showToast("ውሳኔውን መመዝገብ አልተቻለም።", "error");
  }
};

// 7. VISAS TAB
async function loadVisasTab() {
  const tbody = document.getElementById("adminVisasTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">የቪዛ ማመልከቻዎች በመጫን ላይ ናቸው...</td></tr>`;

  try {
    const supabase = window.ELMIS.getClient();
    let visas = [];

    if (supabase) {
      const { data, error } = await supabase
        .from("visa_applications")
        .select("*, applicants(full_name, otp)")
        .order("created_at", { ascending: false });
      if (!error && data) visas = data;
    } else {
      visas = JSON.parse(localStorage.getItem("elmis_demo_visas") || "[]");
    }

    if (visas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">ምንም የቪዛ ማመልከቻ አልተገኘም</td></tr>`;
      return;
    }

    tbody.innerHTML = visas
      .map((v) => {
        const appName =
          v.applicants?.full_name ||
          `${v.first_name || ""} ${v.last_name || ""}`;
        const otp = v.applicants?.otp || v.otp || "-";
        const isApproved = v.status === "Approved";

        return `
        <tr>
          <td>
            <strong>${appName}</strong><br>
            <code style="font-size: 0.8rem; color: var(--primary-deep);">${otp}</code>
          </td>
          <td>${v.country}</td>
          <td><strong style="font-family: monospace;">${v.passport_number}</strong></td>
          <td>${v.passport_expiry_date || "-"}</td>
          <td>${v.travel_date || "-"}</td>
          <td>
            ${
              v.signature_data
                ? `
              <img src="${v.signature_data}" alt="Signature" style="max-height: 28px; background: #fff; border: 1px solid var(--border-light); padding: 2px;" />
            `
                : `<span style="color: var(--text-muted);">-</span>`
            }
          </td>
          <td><span class="badge ${isApproved ? "badge-approved" : "badge-pending"}">${v.status}</span></td>
          <td>
            ${
              !isApproved
                ? `
              <button type="button" class="btn btn-primary" onclick="openIssueVisaModal('${v.applicant_id || v.otp}', '${v.id || ""}', '${v.country}')" style="min-height: 30px; padding: 0.2rem 0.6rem; font-size: 0.75rem;">
                ቪዛ አጽድቅ / Issue E-Visa
              </button>
            `
                : `
              <span style="font-size: 0.8rem; color: var(--success); font-weight: 700;">âœ“ ጸድቋል</span>
            `
            }
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Load visas error:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">መጫን አልተቻለም</td></tr>`;
  }
}

window.openIssueVisaModal = function (applicantId, applicationId, country) {
  const modal = document.getElementById("issueVisaModal");
  document.getElementById("issueVisaApplicantId").value = applicantId;
  document.getElementById("issueVisaApplicationId").value = applicationId;
  document.getElementById("issueVisaCountry").value = country;

  // Defaults: travel date 30 days ahead, expiry 2 years ahead
  const now = new Date();
  const travelDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const expiryDate = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  document.getElementById("issueVisaTravelDate").value = travelDate;
  document.getElementById("issueVisaExpiryDate").value = expiryDate;

  modal.style.display = "flex";
};

// 8. SETTINGS TAB
function initSettingsTab() {
  const form = document.getElementById("adminSettingsForm");
  const passwordForm = document.getElementById("adminPasswordForm");

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("adminNewPassword").value;
      const confirmPassword = document.getElementById(
        "adminConfirmPassword",
      ).value;
      const submitBtn = document.getElementById("btnChangeAdminPassword");

      if (newPassword !== confirmPassword) {
        showToast("የይለፍ ቃሎቹ አይመሳሰሉም።", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "እየተቀየረ ነው...";

      try {
        const supabase = window.ELMIS.getClient();
        if (!supabase) throw new Error("Supabase Auth is not configured.");

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        passwordForm.reset();
        showToast("የአስተዳዳሪ ይለፍ ቃል ተቀይሯል።", "success");
        await logAuditAction(
          "Change Admin Password",
          "Changed the signed-in admin password",
        );
      } catch (err) {
        console.error("Change password error:", err);
        showToast(err.message || "የይለፍ ቃሉን መቀየር አልተቻለም።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "ይለፍ ቃል ቀይር / CHANGE PASSWORD";
      }
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("settingPhoneNumber").value.trim();
    const bank = document.getElementById("settingBankAcc").value.trim();
    const heroTitle = document.getElementById("settingHeroTitle").value.trim();
    const heroDesc = document.getElementById("settingHeroDesc").value.trim();
    const bankStatement = document
      .getElementById("settingBankStatement")
      .value.trim();

    const submitBtn = document.getElementById("btnSaveSettings");
    submitBtn.disabled = true;
    submitBtn.textContent = "እየተቀመጠ ነው...";

    try {
      const supabase = window.ELMIS.getClient();
      const settingsPayload = [
        { setting_key: "phone_number", setting_value: phone },
        { setting_key: "bank_account_number", setting_value: bank },
        { setting_key: "hero_title", setting_value: heroTitle },
        { setting_key: "hero_description", setting_value: heroDesc },
        { setting_key: "bank_statement_text", setting_value: bankStatement },
      ];

      if (supabase) {
        for (const item of settingsPayload) {
          await supabase
            .from("settings")
            .upsert(item, { onConflict: "setting_key" });
        }
        await logAuditAction(
          "Update Settings",
          "Updated portal phone, bank, and copy settings",
        );
      }

      // Update local storage defaults
      window.ELMIS.defaults.PHONE_NUMBER = phone;
      window.ELMIS.defaults.BANK_ACCOUNT_NUMBER = bank;
      window.ELMIS.defaults.HERO_DESCRIPTION = heroDesc;
      window.ELMIS.defaults.BANK_STATEMENT_TEXT = bankStatement;

      showToast("ቅንብሮቹ በተሳካ ሁኔታ ተቀምጠዋል!", "success");
    } catch (err) {
      console.error("Save settings error:", err);
      showToast("ቅንብሮቹን ማስቀመጥ አልተቻለም።", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "ቅንብሮችን መዝግብ / SAVE SETTINGS";
    }
  });
}

async function loadSettingsTab() {
  const supabase = window.ELMIS.getClient();
  if (!supabase) return;

  try {
    const { data } = await supabase.from("settings").select("*");
    if (data) {
      data.forEach((item) => {
        if (item.setting_key === "phone_number")
          document.getElementById("settingPhoneNumber").value =
            item.setting_value;
        if (item.setting_key === "bank_account_number")
          document.getElementById("settingBankAcc").value = item.setting_value;
        if (item.setting_key === "hero_title")
          document.getElementById("settingHeroTitle").value =
            item.setting_value;
        if (item.setting_key === "hero_description")
          document.getElementById("settingHeroDesc").value = item.setting_value;
        if (item.setting_key === "bank_statement_text")
          document.getElementById("settingBankStatement").value =
            item.setting_value;
      });
    }
  } catch (err) {
    console.warn("Could not load settings:", err);
  }
}

// 9. AUDIT LOGS TAB
async function loadLogsTab() {
  const tbody = document.getElementById("adminLogsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem;">ሎግ በመጫን ላይ ነው...</td></tr>`;

  try {
    const supabase = window.ELMIS.getClient();
    let logs = [];

    if (supabase) {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) logs = data;
    } else {
      logs = JSON.parse(localStorage.getItem("elmis_demo_logs") || "[]");
    }

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">ምንም እንቅስቃሴ አልተመዘገበም</td></tr>`;
      return;
    }

    tbody.innerHTML = logs
      .map(
        (l) => `
      <tr>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(l.created_at || Date.now()).toLocaleString()}</td>
        <td><strong>${l.user_email || "Admin Staff"}</strong></td>
        <td><span class="badge badge-pending">${l.action}</span></td>
        <td>${l.details || "-"}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

async function logAuditAction(action, details) {
  try {
    const supabase = window.ELMIS.getClient();
    const userEmail = currentAdminUser
      ? currentAdminUser.email
      : "admin@elmis.gov";

    if (supabase) {
      await supabase.from("audit_logs").insert([
        {
          user_email: userEmail,
          action: action,
          details: details,
        },
      ]);
    } else {
      const logs = JSON.parse(localStorage.getItem("elmis_demo_logs") || "[]");
      logs.unshift({
        user_email: userEmail,
        action: action,
        details: details,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("elmis_demo_logs", JSON.stringify(logs));
    }
  } catch (err) {
    console.warn("Audit logging failed:", err);
  }
}

// 10. MODAL EVENT HANDLERS
function initModals() {
  // Close buttons
  document.getElementById("btnCloseAppModal")?.addEventListener("click", () => {
    document.getElementById("applicantDetailsModal").style.display = "none";
  });
  document
    .getElementById("btnCloseJobOfferModal")
    ?.addEventListener("click", () => {
      document.getElementById("jobOfferModal").style.display = "none";
    });
  document
    .getElementById("btnCloseIssueVisaModal")
    ?.addEventListener("click", () => {
      document.getElementById("issueVisaModal").style.display = "none";
    });
  document
    .getElementById("btnCloseAppointmentModal")
    ?.addEventListener("click", () => {
      document.getElementById("appointmentModal").style.display = "none";
    });

  // Close when clicking backdrop
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.style.display = "none";
    });
  });

  // Submit Job Offer Form
  const jobOfferForm = document.getElementById("jobOfferForm");
  if (jobOfferForm) {
    jobOfferForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const applicantId = document.getElementById("offerApplicantId").value;
      const jobTitle = document.getElementById("offerJobTitle").value.trim();
      const country = document.getElementById("offerCountry").value;
      const desc = document.getElementById("offerDescription").value.trim();
      const imageInput = document.getElementById("offerImageInput");
      const submitBtn = document.getElementById("btnSubmitJobOffer");

      submitBtn.disabled = true;
      submitBtn.textContent = "እየተላከ ነው...";

      try {
        const supabase = window.ELMIS.getClient();
        let imagePath = null;

        if (imageInput.files && imageInput.files[0]) {
          const file = imageInput.files[0];
          if (supabase) {
            const ext = file.name.split(".").pop();
            const filePath = `offers/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("offer-letters")
              .upload(filePath, file);
            if (!upErr) {
              const { data: pubData } = supabase.storage
                .from("offer-letters")
                .getPublicUrl(filePath);
              imagePath = pubData?.publicUrl || filePath;
            }
          } else {
            // Read file as data URL for demo
            imagePath = await new Promise((resolve) => {
              const r = new FileReader();
              r.onload = (ev) => resolve(ev.target.result);
              r.readAsDataURL(file);
            });
          }
        }

        if (supabase) {
          await supabase.from("job_offers").insert([
            {
              applicant_id: applicantId,
              job_title: jobTitle,
              country: country,
              description: desc,
              image_path: imagePath,
            },
          ]);
          await logAuditAction(
            "Job Offer Issued",
            `Issued job offer ${jobTitle} for applicant ${applicantId}`,
          );
        } else {
          const local = JSON.parse(
            localStorage.getItem("elmis_demo_applicants") || "[]",
          );
          const a = local.find(
            (x) => x.id === applicantId || x.otp === applicantId,
          );
          if (a) {
            a.job_offer = {
              job_title: jobTitle,
              country,
              description: desc,
              image_path: imagePath,
              created_at: new Date().toISOString(),
            };
            localStorage.setItem(
              "elmis_demo_applicants",
              JSON.stringify(local),
            );
          }
        }

        showToast("የስራ ጥሪ ማስታወቂያው በተሳካ ሁኔታ ተልኳል!", "success");
        document.getElementById("jobOfferModal").style.display = "none";
        jobOfferForm.reset();
      } catch (err) {
        console.error("Job offer submit error:", err);
        showToast("የስራ ጥሪውን መላክ አልተቻለም።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "የስራ ጥሪውን ላክ / SEND OFFER";
      }
    });
  }

  // Submit Issue Visa Form
  const issueVisaForm = document.getElementById("issueVisaForm");
  if (issueVisaForm) {
    issueVisaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const applicantId = document.getElementById("issueVisaApplicantId").value;
      const applicationId = document.getElementById(
        "issueVisaApplicationId",
      ).value;
      const country = document.getElementById("issueVisaCountry").value;
      const travelDate = document.getElementById("issueVisaTravelDate").value;
      const expiryDate = document.getElementById("issueVisaExpiryDate").value;
      const submitBtn = document.getElementById("btnSubmitIssueVisa");

      submitBtn.disabled = true;
      submitBtn.textContent = "እየተፈጠረ ነው...";

      try {
        const verificationCode = `EV-${Math.floor(100000 + Math.random() * 900000)}`;
        const supabase = window.ELMIS.getClient();

        if (supabase) {
          // Insert into electronic_visas
          const { error: evError } = await supabase
            .from("electronic_visas")
            .insert([
              {
                applicant_id: applicantId,
                verification_code: verificationCode,
                country: country,
                visa_type: "Work Visa",
                travel_date: travelDate,
                expiry_date: expiryDate,
                status: "Approved",
              },
            ]);

          if (evError) throw evError;

          // Update visa application status
          if (applicationId) {
            await supabase
              .from("visa_applications")
              .update({ status: "Approved" })
              .eq("id", applicationId);
          }

          // Update applicant status
          await supabase
            .from("applicants")
            .update({ status: "Approved" })
            .eq("id", applicantId);

          await logAuditAction(
            "Issued Electronic Visa",
            `Created e-visa ${verificationCode} for applicant ${applicantId}`,
          );
        } else {
          // Demo fallback
          const demoEvisas = JSON.parse(
            localStorage.getItem("elmis_demo_evisas") || "[]",
          );
          demoEvisas.unshift({
            verification_code: verificationCode,
            applicant_id: applicantId,
            country: country,
            visa_type: "Work Visa",
            travel_date: travelDate,
            expiry_date: expiryDate,
            issue_date: new Date().toISOString(),
            status: "Approved",
            full_name: "Applicant",
          });
          localStorage.setItem("elmis_demo_evisas", JSON.stringify(demoEvisas));

          const localApps = JSON.parse(
            localStorage.getItem("elmis_demo_applicants") || "[]",
          );
          const found = localApps.find(
            (a) => a.id === applicantId || a.otp === applicantId,
          );
          if (found) {
            found.status = "Approved";
            found.electronic_visa = {
              verification_code: verificationCode,
              country,
              status: "Approved",
            };
            localStorage.setItem(
              "elmis_demo_applicants",
              JSON.stringify(localApps),
            );
          }
        }

        showToast(`ኤሌክትሮኒክ ቪዛ ጸድቋል! ኮድ: ${verificationCode}`, "success");
        document.getElementById("issueVisaModal").style.display = "none";
        loadVisasTab();
      } catch (err) {
        console.error("Issue visa error:", err);
        showToast("ቪዛውን ማጽደቅ አልተቻለም።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "ቪዛውን አጽድቅና ሰርተፊኬት ፍጠር / APPROVE & ISSUE";
      }
    });
  }

  initAppointmentModal();
}

// 11. APPOINTMENTS TAB & MODAL (4-Stage Workflow)
const STAGE_CONFIGS = {
  registration_fee: {
    label: "1. የ3,800 ብር ክፍያ ቀጠሮ (Registration Fee Appt)",
    defaultNotes:
      "የ3,800 ብር የቅድመ ክፍያ ደረሰኝዎ ስለጸደቀ እባክዎ የመጀመሪያ ደረጃ ቃለ-መጠይቅ እና ሰነዶችዎን ለማረጋገጥ ወደ ቢሮአችን ይምጡ።",
  },
  job_offer: {
    label: "2. የስራ እድል ጥሪ ቀጠሮ (Job Offer Appt)",
    defaultNotes:
      "የተዘጋጀውን ይፋዊ የስራ ጥሪ ስምምነት (Job Offer Contract) ለመፈረም እና የጣት አሻራ ሂደት ለመጀመር ይምጡ።",
  },
  bank_statement: {
    label: "3. የባንክ ስቴትመንት ቀጠሮ (Bank Statement Appt)",
    defaultNotes:
      "የ46,300 ብር የባንክ ስቴትመንት ሂደት ማረጋገጫ ለመውሰድ እና የፋይናንስ ሰነድ ለመፈረም ይምጡ።",
  },
  visa: {
    label: "4. የቪዛ ማጠናቀቂያ ቀጠሮ (Final Visa Appt)",
    defaultNotes: "ቪዛዎ ተጠናቋል! ፓስፖርትዎን እና ይፋዊ የጉዞ ቪዛዎን ለመውሰድ ወደ ቢሮአችን ይምጡ።",
  },
};

window.openAppointmentModal = function (
  applicantId,
  otp,
  name,
  country,
  stage = "registration_fee",
) {
  const modal = document.getElementById("appointmentModal");
  if (!modal) return;

  const decodedName = name ? decodeURIComponent(name) : "Applicant";

  document.getElementById("appApplicantId").value = applicantId || "";
  document.getElementById("appApplicantOtp").value = otp || "";
  document.getElementById("appApplicantNameDisplay").textContent = decodedName;
  document.getElementById("appApplicantOtpDisplay").textContent = otp || "-";
  document.getElementById("appApplicantCountryDisplay").textContent =
    country || "Dubai";

  const stageSelect = document.getElementById("appointmentStage");
  if (stageSelect) {
    stageSelect.value = stage;
  }

  // Pre-fill date to tomorrow (YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  document.getElementById("appointmentDate").value = `${yyyy}-${mm}-${dd}`;
  document.getElementById("appointmentDate").min = new Date()
    .toISOString()
    .split("T")[0];

  document.getElementById("appointmentTime").value = "09:30 AM (3:30 የጠዋት ሰዓት)";
  document.getElementById("appointmentLocation").value =
    "E-LMIS AUE Main Office, Addis Ababa, Bole Sub-City";

  const cfg = STAGE_CONFIGS[stage] || STAGE_CONFIGS["registration_fee"];
  document.getElementById("appointmentNotes").value = cfg.defaultNotes;

  modal.style.display = "flex";
};

window.openAppointmentModalForApplicant = function (
  applicantId,
  otp,
  name,
  country,
  stage,
) {
  openAppointmentModal(applicantId, otp, name, country, stage);
};

window.openAppointmentModalForPaymentRecord = async function (
  applicantId,
  otp,
  paymentType,
) {
  let stage = "registration_fee";
  if (paymentType === "bank_statement") stage = "bank_statement";
  else if (paymentType === "processing") stage = "job_offer";

  let name = "Applicant";
  let country = "Dubai";
  const supabase = window.ELMIS.getClient();
  if (supabase) {
    const { data } = await supabase
      .from("applicants")
      .select("id, otp, full_name, country")
      .or(`id.eq.${applicantId},otp.eq.${otp}`)
      .single();
    if (data) {
      applicantId = data.id;
      otp = data.otp;
      name = data.full_name;
      country = data.country;
    }
  } else {
    const local = JSON.parse(
      localStorage.getItem("elmis_demo_applicants") || "[]",
    );
    const found = local.find((a) => a.id === applicantId || a.otp === otp);
    if (found) {
      name = found.full_name;
      country = found.country;
      applicantId = found.id;
      otp = found.otp;
    }
  }

  openAppointmentModal(applicantId, otp, name, country, stage);
};

function initAppointmentModal() {
  const form = document.getElementById("appointmentForm");
  const stageSelect = document.getElementById("appointmentStage");

  if (stageSelect) {
    stageSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      const cfg = STAGE_CONFIGS[selected];
      if (
        cfg &&
        !document.getElementById("appointmentNotes").value.includes("ተስተካክሏል")
      ) {
        document.getElementById("appointmentNotes").value = cfg.defaultNotes;
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const applicantId = document.getElementById("appApplicantId").value;
      const otp = document.getElementById("appApplicantOtp").value;
      const stage = document.getElementById("appointmentStage").value;
      const date = document.getElementById("appointmentDate").value;
      const time = document.getElementById("appointmentTime").value.trim();
      const location = document
        .getElementById("appointmentLocation")
        .value.trim();
      const notes = document.getElementById("appointmentNotes").value.trim();
      const submitBtn = document.getElementById("btnSubmitAppointment");

      submitBtn.disabled = true;
      submitBtn.textContent = "እየተላከ ነው...";

      try {
        const supabase = window.ELMIS.getClient();
        if (supabase) {
          const { error } = await supabase.from("appointments").insert([
            {
              applicant_id: applicantId,
              stage: stage,
              appointment_date: date,
              appointment_time: time,
              location: location,
              notes: notes,
              status: "Scheduled",
            },
          ]);
          if (error) throw error;
          await logAuditAction(
            "Scheduled Appointment",
            `Sent ${stage} appointment on ${date} ${time} to applicant ${applicantId}`,
          );
        } else {
          // Demo fallback
          const localAppts = JSON.parse(
            localStorage.getItem("elmis_demo_appointments") || "[]",
          );
          localAppts.unshift({
            id: `apt-${Date.now()}`,
            applicant_id: applicantId,
            otp: otp,
            stage: stage,
            appointment_date: date,
            appointment_time: time,
            location: location,
            notes: notes,
            status: "Scheduled",
            created_at: new Date().toISOString(),
          });
          localStorage.setItem(
            "elmis_demo_appointments",
            JSON.stringify(localAppts),
          );
        }

        showToast("የቀጠሮ ጥሪው በተሳካ ሁኔታ ለአመልካቹ ተልኳል!", "success");
        document.getElementById("appointmentModal").style.display = "none";
        form.reset();

        if (currentTab === "appointments") {
          loadAppointmentsTab();
        }
      } catch (err) {
        console.error("Save appointment error:", err);
        showToast("ቀጠሮውን መላክ አልተቻለም።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "ቀጠሮውን ለአመልካቹ ላክ / SEND APPOINTMENT";
      }
    });
  }
}

async function loadAppointmentsTab() {
  const tbody = document.getElementById("adminAppointmentsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">ቀጠሮዎች በመጫን ላይ ናቸው...</td></tr>`;

  try {
    const stageFilter =
      document.getElementById("adminFilterAppStage")?.value || "ALL";
    const statusFilter =
      document.getElementById("adminFilterAppStatus")?.value || "ALL";
    const searchFilter = (
      document.getElementById("adminSearchAppointment")?.value || ""
    )
      .trim()
      .toLowerCase();

    const supabase = window.ELMIS.getClient();
    let appointments = [];

    if (supabase) {
      let query = supabase
        .from("appointments")
        .select("*, applicants(id, full_name, otp, country)")
        .order("created_at", { ascending: false });

      if (stageFilter !== "ALL") query = query.eq("stage", stageFilter);
      if (statusFilter !== "ALL") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (!error && data) appointments = data;
    } else {
      appointments = JSON.parse(
        localStorage.getItem("elmis_demo_appointments") || "[]",
      );
      const localApps = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );

      appointments = appointments.map((apt) => {
        const found = localApps.find(
          (a) => a.id === apt.applicant_id || a.otp === apt.otp,
        );
        return {
          ...apt,
          applicants: found
            ? {
                id: found.id,
                full_name: found.full_name,
                otp: found.otp,
                country: found.country,
              }
            : {
                id: apt.applicant_id,
                full_name: "Applicant",
                otp: apt.otp,
                country: "Dubai",
              },
        };
      });

      if (stageFilter !== "ALL")
        appointments = appointments.filter((a) => a.stage === stageFilter);
      if (statusFilter !== "ALL")
        appointments = appointments.filter((a) => a.status === statusFilter);
    }

    if (searchFilter) {
      appointments = appointments.filter((a) => {
        const name = (a.applicants?.full_name || "").toLowerCase();
        const otp = (a.applicants?.otp || a.otp || "").toLowerCase();
        return name.includes(searchFilter) || otp.includes(searchFilter);
      });
    }

    if (appointments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">ምንም የቀጠሮ መረጃ አልተገኘም</td></tr>`;
      return;
    }

    tbody.innerHTML = appointments
      .map((apt) => {
        const appName = apt.applicants?.full_name || "Applicant";
        const otp = apt.applicants?.otp || apt.otp || "-";
        const stageObj = STAGE_CONFIGS[apt.stage] || { label: apt.stage };
        const isScheduled = apt.status === "Scheduled";
        const isCompleted = apt.status === "Completed";

        return `
        <tr>
          <td><code style="font-weight: 700; color: var(--primary-deep);">${otp}</code></td>
          <td><strong>${appName}</strong></td>
          <td>
            <span class="badge" style="background: #eff6ff; color: var(--primary-deep); font-size: 0.8rem; border: 1px solid #bfdbfe;">
              ${stageObj.label}
            </span>
          </td>
          <td>
            <strong>📅 ${apt.appointment_date}</strong><br>
            <span style="font-size: 0.8rem; color: var(--text-muted);">⏰ ${apt.appointment_time}</span>
          </td>
          <td style="font-size: 0.85rem;">${apt.location || "-"}</td>
          <td>
            <span class="badge ${isCompleted ? "badge-approved" : isScheduled ? "badge-pending" : "badge-rejected"}">
              ${apt.status}
            </span>
          </td>
          <td style="font-size: 0.8rem; max-width: 200px; color: var(--text-muted);">${apt.notes || "-"}</td>
          <td>
            <div style="display: flex; gap: 0.3rem;">
              ${
                isScheduled
                  ? `
                <button type="button" class="btn btn-primary" onclick="updateAppointmentStatus('${apt.id}', 'Completed')" style="min-height: 28px; padding: 0.2rem 0.5rem; font-size: 0.75rem; background: var(--success);" title="Mark as Completed">
                  ✓ አጠናቅቅ
                </button>
                <button type="button" class="btn btn-secondary" onclick="updateAppointmentStatus('${apt.id}', 'Cancelled')" style="min-height: 28px; padding: 0.2rem 0.5rem; font-size: 0.75rem; color: var(--danger);" title="Cancel Appointment">
                  ✕ ሰርዝ
                </button>
              `
                  : `
                <span style="font-size: 0.75rem; color: var(--text-muted);">-</span>
              `
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Load appointments error:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">መጫን አልተቻለም</td></tr>`;
  }
}

window.updateAppointmentStatus = async function (id, newStatus) {
  try {
    const supabase = window.ELMIS.getClient();
    if (supabase) {
      await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id);
      await logAuditAction(
        "Updated Appointment Status",
        `Set appointment ${id} to ${newStatus}`,
      );
    } else {
      const local = JSON.parse(
        localStorage.getItem("elmis_demo_appointments") || "[]",
      );
      const found = local.find((a) => a.id === id);
      if (found) found.status = newStatus;
      localStorage.setItem("elmis_demo_appointments", JSON.stringify(local));
    }

    showToast(`የቀጠሮው ሁኔታ ${newStatus} ተብሏል!`, "success");
    loadAppointmentsTab();
  } catch (err) {
    console.error("Update appointment status error:", err);
    showToast("ማዘመን አልተቻለም።", "error");
  }
};
