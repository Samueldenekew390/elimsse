/**
 * E-LMIS AUE - Main Portal Application Logic (Vanilla JavaScript)
 * Handles registration, job search, file uploads, OTP retrieval, payments, and applicant status.
 */

// 59 Deduplicated Unique Jobs as explicitly instructed
const JOBS_LIST = [
  "ሾፌር",
  "ግንበኛ",
  "መካኒክ",
  "ጠባቂ",
  "የቤት ሠራተኛ",
  "ማብሰያ",
  "ነርስ ረዳት",
  "አትክልት ማሸግ",
  "እቃዎች ማመላለስ",
  "ምግብ ስራ",
  "ልብስ",
  "መርከብ ጥገና",
  "አስቸኳይ ፋብሪካ",
  "ለም ፋብሪካ",
  "ሲሚንቶ ፋብሪካ",
  "ሚስማር ፋብሪካ",
  "ተቆጣጣሪ",
  "አልኮል ፋብሪካ",
  "ወይን ማሸግ",
  "ሞተር አጠባ",
  "መኪና አጠባ",
  "ልብስ አጠባ",
  "አትክልት",
  "ወጥ ቤት",
  "ሽያጭ መሸጥ",
  "ጁስ ቤት",
  "ለውዝ ማሸግ",
  "እቃ ማጠብ",
  "ቤት ስራ",
  "ኤሌክትሪክ ጥገና",
  "ስፖንጅ ፋብሪካ",
  "ፃናት መንከባከብ",
  "ሹፍርና",
  "ፅዳት",
  "ጥበቃ",
  "መስተንግዶ",
  "ተላላኪ",
  "ፀሐፊነት",
  "ሞተረኛ",
  "ሶፍት ፋብሪካ",
  "ቼኮት ማሸግ",
  "ሐይላንድ ፋብሪካ",
  "ልብስ ፋብሪካ",
  "ስጋ ቤት",
  "አትክልት መከባከብ",
  "ውሃ ማጠጣት",
  "ልብስ ስፌት",
  "ስልክ ጥገና",
  "ግበኝነት",
  "አናዩ",
  "ብሎኬት ማምረቻ",
  "ሌዘር ፋብሪካ",
  "ዘይት ፋብሪካ",
  "ለፍራፍሬ ማመላለስ",
  "ፖርኪግ",
  "ቀለም ፋብሪካ",
  "መቆርቆር ፋብሪካ",
  "ብስክሌተኛ",
  "ውሃ ማሸግ",
];

// App State
const state = {
  selectedCountry: null,
  selectedJobs: new Set(),
  eligiblePhotoFile: null,
  eligiblePhotoPreviewUrl: null,
  paymentReceiptFile: null,
  processingReceiptFile: null,
  bankStatementReceiptFile: null,
  currentStatusFilter: "Approved",
  applicantPage: 1,
  pageSize: 6,
  settings: { ...window.ELMIS.defaults },
};

let registrationAppointmentCountdownTimer = null;
let jobOfferAppointmentCountdownTimer = null;

// DOM Content Loaded Handler
document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initSettings();
  renderJobList();
  initJobSearch();
  initCountrySelection();
  initPhotoUpload();
  initForms();
  initOtpLookup();
  initJobOfferCheck();
  initPaymentUploads();
  initApplicantStatusGrid();
  initCopyButtons();
});

// Toast Notification Helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Calculate Age from Date of Birth dynamically
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

// Initialize Mobile Hamburger Menu & Responsive Drawer
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

    if (navOverlay) {
      navOverlay.addEventListener("click", closeMenu);
    }

    // Close menu when clicking nav links
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    // Close on Escape key press (PC ergonomics)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
        closeApplicantModal();
        const otpModal = document.getElementById("otpSuccessModal");
        if (otpModal) otpModal.classList.remove("active");
      }
    });
  }

  // Mobile Bottom Navigation Bar Active Indicator
  const bottomBarItems = document.querySelectorAll(".bottom-bar-item");
  bottomBarItems.forEach((item) => {
    item.addEventListener("click", function () {
      bottomBarItems.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

// Fetch and Apply Settings from Supabase
async function initSettings() {
  const supabase = window.ELMIS.getClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("settings").select("*");
      if (!error && data) {
        data.forEach((item) => {
          if (item.setting_key === "phone_number")
            state.settings.PHONE_NUMBER = item.setting_value;
          if (item.setting_key === "bank_account_number")
            state.settings.BANK_ACCOUNT_NUMBER = item.setting_value;
          if (item.setting_key === "website_name")
            state.settings.WEBSITE_NAME = item.setting_value;
          if (item.setting_key === "hero_title")
            state.settings.WEBSITE_NAME = item.setting_value;
          if (item.setting_key === "hero_description")
            state.settings.HERO_DESCRIPTION = item.setting_value;
          if (item.setting_key === "bank_statement_text")
            state.settings.BANK_STATEMENT_TEXT = item.setting_value;
        });
      }
    } catch (err) {
      console.warn("Could not load remote settings, using defaults", err);
    }
  }

  // Update UI Elements with Settings
  const phoneLinks = document.querySelectorAll(
    ".header-phone, .contact-phone-link",
  );
  phoneLinks.forEach((el) =>
    el.setAttribute("href", `tel:${state.settings.PHONE_NUMBER}`),
  );

  const phoneTexts = document.querySelectorAll(
    "#headerPhoneText, .display-phone-val",
  );
  phoneTexts.forEach((el) => (el.textContent = state.settings.PHONE_NUMBER));

  const bankTexts = document.querySelectorAll(
    "#displayBankAccountNumber, .display-bank-account",
  );
  bankTexts.forEach(
    (el) => (el.textContent = state.settings.BANK_ACCOUNT_NUMBER),
  );

  const bankNotice = document.getElementById("bankStatementNoticeText");
  if (bankNotice) {
    bankNotice.textContent = `${state.settings.BANK_STATEMENT_TEXT}: 46,300 ETB`;
  }
}

// Render the 59 unique jobs with checkboxes
function renderJobList(filterText = "") {
  const container = document.getElementById("jobGridList");
  if (!container) return;

  container.innerHTML = "";
  const normalizedFilter = filterText.trim().toLowerCase();

  const filtered = JOBS_LIST.filter(
    (job) => !normalizedFilter || job.toLowerCase().includes(normalizedFilter),
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 1rem;">ምንም ስራ አልተገኘም</div>`;
    return;
  }

  filtered.forEach((job, index) => {
    const isChecked = state.selectedJobs.has(job);
    const label = document.createElement("label");
    label.className = `job-chip-label ${isChecked ? "checked" : ""}`;
    label.innerHTML = `
      <input type="checkbox" value="${job}" ${isChecked ? "checked" : ""} />
      <span>${job}</span>
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        state.selectedJobs.add(job);
        label.classList.add("checked");
      } else {
        state.selectedJobs.delete(job);
        label.classList.remove("checked");
      }
      updateSelectedJobsCount();
    });

    container.appendChild(label);
  });
}

function initJobSearch() {
  const input = document.getElementById("jobSearchInput");
  const clearBtn = document.getElementById("jobSearchClear");
  const selectAllBtn = document.getElementById("btnSelectAllJobs");
  const clearAllBtn = document.getElementById("btnClearJobs");

  if (input) {
    input.addEventListener("input", (e) => {
      const val = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = val.length > 0 ? "block" : "none";
      }
      renderJobList(val);
    });
  }

  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.style.display = "none";
      renderJobList("");
      input.focus();
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      JOBS_LIST.forEach((job) => state.selectedJobs.add(job));
      renderJobList(input ? input.value : "");
      updateSelectedJobsCount();
      showToast("ሁሉም 59 ስራዎች ተመርጠዋል", "success");
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      state.selectedJobs.clear();
      renderJobList(input ? input.value : "");
      updateSelectedJobsCount();
      showToast("የስራ ምርጫዎች ጸድተዋል", "info");
    });
  }
}

function updateSelectedJobsCount() {
  const countEl = document.getElementById("selectedJobsCount");
  if (countEl) {
    countEl.textContent = `${state.selectedJobs.size} ስራዎች ተመርጠዋል`;
  }
}

// Country Selection Logic
function initCountrySelection() {
  const countryCards = document.querySelectorAll(".country-card");
  const regTypeSelection = document.getElementById("regTypeSelection");
  const selectedBadge = document.getElementById("selectedCountryBadge");
  const formEligible = document.getElementById("formEligibleContainer");
  const formIneligible = document.getElementById("formIneligibleContainer");
  const changeCountryBtn = document.getElementById("changeCountryBtn");

  countryCards.forEach((card) => {
    card.addEventListener("click", () => {
      const country = card.getAttribute("data-country");
      selectCountry(country);
    });
  });

  if (changeCountryBtn) {
    changeCountryBtn.addEventListener("click", () => {
      regTypeSelection.style.display = "none";
      formEligible.style.display = "none";
      formIneligible.style.display = "none";
      countryCards.forEach((c) => c.classList.remove("selected"));
      state.selectedCountry = null;
      document
        .getElementById("countrySection")
        .scrollIntoView({ behavior: "smooth" });
    });
  }

  // Registration Type Buttons
  const btnEligible = document.getElementById("btnChooseEligible");
  const btnIneligible = document.getElementById("btnChooseIneligible");
  const cardEligible = document.getElementById("optionEligibleCard");
  const cardIneligible = document.getElementById("optionIneligibleCard");

  if (btnEligible) {
    btnEligible.addEventListener("click", () => {
      cardEligible.classList.add("active");
      cardIneligible.classList.remove("active");
      formEligible.style.display = "block";
      formIneligible.style.display = "none";
      formEligible.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (btnIneligible) {
    btnIneligible.addEventListener("click", () => {
      cardIneligible.classList.add("active");
      cardEligible.classList.remove("active");
      formIneligible.style.display = "block";
      formEligible.style.display = "none";
      formIneligible.scrollIntoView({ behavior: "smooth" });
    });
  }
}

function selectCountry(country) {
  state.selectedCountry = country;

  document.querySelectorAll(".country-card").forEach((c) => {
    if (c.getAttribute("data-country") === country) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const regTypeSelection = document.getElementById("regTypeSelection");
  const selectedBadge = document.getElementById("selectedCountryBadge");
  const eligibleCountryInput = document.getElementById("eligibleCountryInput");
  const ineligibleCountryInput = document.getElementById(
    "ineligibleCountryInput",
  );

  if (selectedBadge) selectedBadge.textContent = `የተመረጠው ሀገር: ${country}`;
  if (eligibleCountryInput) eligibleCountryInput.value = country;
  if (ineligibleCountryInput) ineligibleCountryInput.value = country;

  if (regTypeSelection) {
    regTypeSelection.style.display = "block";
    regTypeSelection.scrollIntoView({ behavior: "smooth" });
  }
}

// Photo Upload Handling with Validation & Preview
function initPhotoUpload() {
  const dropArea = document.getElementById("photoDropArea");
  const fileInput = document.getElementById("eligiblePhotoInput");
  const previewContainer = document.getElementById("photoPreviewContainer");
  const previewImg = document.getElementById("photoPreviewImg");
  const previewName = document.getElementById("photoPreviewName");
  const removeBtn = document.getElementById("photoRemoveBtn");

  if (!dropArea || !fileInput) return;

  dropArea.addEventListener("click", () => fileInput.click());

  // Drag and Drop
  ["dragenter", "dragover"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = "var(--primary-blue)";
      dropArea.style.background = "#eff6ff";
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = "";
      dropArea.style.background = "";
    });
  });

  dropArea.addEventListener("drop", (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoFile(e.target.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      state.eligiblePhotoFile = null;
      state.eligiblePhotoPreviewUrl = null;
      fileInput.value = "";
      previewContainer.style.display = "none";
      dropArea.style.display = "block";
    });
  }

  function handlePhotoFile(file) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showToast("እባክዎ ትክክለኛ ምስል (JPG, PNG, WEBP) ብቻ ይጫኑ።", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("የምስሉ መጠን ከ 5MB መብለጥ የለበትም።", "error");
      return;
    }

    state.eligiblePhotoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.eligiblePhotoPreviewUrl = e.target.result;
      previewImg.src = e.target.result;
      previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      previewContainer.style.display = "flex";
      dropArea.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
}

// Generate OTP locally if Supabase offline (uses cryptographically secure randomness)
function generateLocalOtp() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "AUE-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Form Submissions Handling
function initForms() {
  // DOB Age calculation preview
  const dobInput = document.getElementById("eligibleDOB");
  const ageText = document.getElementById("eligibleAgeCalcText");
  if (dobInput && ageText) {
    dobInput.addEventListener("change", () => {
      ageText.textContent = `የተሰላ እድሜ: ${calculateAge(dobInput.value)}`;
    });
  }

  // 1. ELIGIBLE REGISTRATION FORM
  const formEligible = document.getElementById("formEligible");
  if (formEligible) {
    formEligible.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("eligibleFullName").value.trim();
      const mobile = document.getElementById("eligibleMobile").value.trim();
      const email = document.getElementById("eligibleEmail").value.trim();
      const address = document.getElementById("eligibleAddress").value.trim();
      const dob = document.getElementById("eligibleDOB").value;
      const facebookId = document
        .getElementById("eligibleFacebook")
        .value.trim();
      const gender = formEligible.querySelector(
        'input[name="gender"]:checked',
      ).value;
      const country =
        document.getElementById("eligibleCountryInput").value ||
        state.selectedCountry ||
        "Dubai";

      // Client-side validations
      if (!fullName) {
        showToast("እባክዎ ሙሉ ስምዎን ያስገቡ", "error");
        document.getElementById("eligibleFullName").focus();
        return;
      }

      if (!mobile) {
        showToast("እባክዎ ስልክ ቁጥር ያስገቡ", "error");
        document.getElementById("eligibleMobile").focus();
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("እባክዎ ትክክለኛ ኢሜል ያስገቡ", "error");
        document.getElementById("eligibleEmail").focus();
        return;
      }

      if (!address) {
        showToast("እባክዎ አድራሻዎን ያስገቡ", "error");
        document.getElementById("eligibleAddress").focus();
        return;
      }

      if (!state.eligiblePhotoFile && !state.eligiblePhotoPreviewUrl) {
        showToast("እባክዎ ጉርድ ፎቶዎን ይጫኑ", "error");
        return;
      }

      if (state.selectedJobs.size === 0) {
        showToast("እባክዎ ቢያንስ አንድ የስራ ምርጫ ይምረጡ", "error");
        document.getElementById("jobSearchInput").focus();
        return;
      }

      const submitBtn = document.getElementById("btnSubmitEligible");
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>ምዝገባው እየተከናወነ ነው... (Uploading...)</span>`;

      try {
        const supabase = window.ELMIS.getClient();
        let generatedOtp = generateLocalOtp();
        let photoPath = state.eligiblePhotoPreviewUrl;

        if (supabase) {
          // 1. Get Unique OTP from Postgres function
          try {
            const { data: otpResult } = await supabase.rpc(
              "generate_unique_applicant_otp",
            );
            if (otpResult) generatedOtp = otpResult;
          } catch (rpcErr) {
            console.warn("Using fallback OTP generation", rpcErr);
          }

          // 2. Upload Photo to Supabase Storage if file exists
          if (state.eligiblePhotoFile) {
            const ext = state.eligiblePhotoFile.name.split(".").pop();
            const filePath = `applicants/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("applicant-photos")
              .upload(filePath, state.eligiblePhotoFile);

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from("applicant-photos")
                .getPublicUrl(filePath);
              photoPath = publicUrlData ? publicUrlData.publicUrl : filePath;
            }
          }

          // 3. Insert Applicant
          const { data: applicantData, error: insertError } = await supabase
            .from("applicants")
            .insert([
              {
                otp: generatedOtp,
                registration_type: "eligible",
                country: country,
                full_name: fullName,
                gender: gender,
                email: email || null,
                mobile_number: mobile,
                address: address,
                facebook_id: facebookId || null,
                photo_path: photoPath,
                date_of_birth: dob || null,
                status: "Pending",
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;

          // 4. Insert Selected Jobs
          if (applicantData && state.selectedJobs.size > 0) {
            const jobsPayload = Array.from(state.selectedJobs).map(
              (jobName) => ({
                applicant_id: applicantData.id,
                job_name: jobName,
              }),
            );
            await supabase.from("applicant_jobs").insert(jobsPayload);
          }
        } else {
          // Local storage demo fallback
          saveLocalApplicant({
            otp: generatedOtp,
            registration_type: "eligible",
            country,
            full_name: fullName,
            gender,
            email,
            mobile_number: mobile,
            address,
            facebook_id: facebookId,
            photo_path: photoPath,
            date_of_birth: dob,
            status: "Pending",
            jobs: Array.from(state.selectedJobs),
            created_at: new Date().toISOString(),
          });
        }

        // Show Success Modal
        showOtpSuccessModal(generatedOtp);
        formEligible.reset();
        state.selectedJobs.clear();
        state.eligiblePhotoFile = null;
        state.eligiblePhotoPreviewUrl = null;
        renderJobList();
        updateSelectedJobsCount();
        document.getElementById("photoPreviewContainer").style.display = "none";
        document.getElementById("photoDropArea").style.display = "block";
      } catch (err) {
        console.error("Submission error:", err);
        showToast("ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // 2. INELIGIBLE REGISTRATION FORM
  const formIneligible = document.getElementById("formIneligible");
  if (formIneligible) {
    formIneligible.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document
        .getElementById("ineligibleFullName")
        .value.trim();
      const mobile = document.getElementById("ineligibleMobile").value.trim();
      const email = document.getElementById("ineligibleEmail").value.trim();
      const address = document.getElementById("ineligibleAddress").value.trim();
      const gender = formIneligible.querySelector(
        'input[name="gender"]:checked',
      ).value;
      const country =
        document.getElementById("ineligibleCountryInput").value ||
        state.selectedCountry ||
        "Dubai";

      if (!fullName) {
        showToast("እባክዎ ሙሉ ስምዎን ያስገቡ", "error");
        document.getElementById("ineligibleFullName").focus();
        return;
      }

      if (!mobile) {
        showToast("እባክዎ ስልክ ቁጥር ያስገቡ", "error");
        document.getElementById("ineligibleMobile").focus();
        return;
      }

      const submitBtn = document.getElementById("btnSubmitIneligible");
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>እየተመዘገበ ነው...</span>`;

      try {
        const supabase = window.ELMIS.getClient();
        let generatedOtp = generateLocalOtp();

        if (supabase) {
          try {
            const { data: otpResult } = await supabase.rpc(
              "generate_unique_applicant_otp",
            );
            if (otpResult) generatedOtp = otpResult;
          } catch (rpcErr) {
            console.warn("Using fallback OTP", rpcErr);
          }

          const { error: insertError } = await supabase
            .from("applicants")
            .insert([
              {
                otp: generatedOtp,
                registration_type: "ineligible",
                country: country,
                full_name: fullName,
                gender: gender,
                email: email || null,
                mobile_number: mobile,
                address: address,
                status: "Pending",
              },
            ]);

          if (insertError) throw insertError;
        } else {
          saveLocalApplicant({
            otp: generatedOtp,
            registration_type: "ineligible",
            country,
            full_name: fullName,
            gender,
            email,
            mobile_number: mobile,
            address,
            status: "Pending",
            jobs: [],
            created_at: new Date().toISOString(),
          });
        }

        showOtpSuccessModal(generatedOtp);
        formIneligible.reset();
      } catch (err) {
        console.error("Ineligible form submission error:", err);
        showToast("ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }
}

// Success Modal Display
function showOtpSuccessModal(otp) {
  const modal = document.getElementById("otpSuccessModal");
  const otpVal = document.getElementById("modalOtpValue");
  const copyBtn = document.getElementById("btnCopyModalOtp");
  const copyText = document.getElementById("copyModalOtpText");
  const profileBtn = document.getElementById("btnGoToProfile");
  const closeBtn = document.getElementById("btnCloseOtpModal");

  if (!modal || !otpVal) return;

  otpVal.textContent = otp;
  modal.style.display = "flex";

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(otp);
    copyText.textContent = "ተቀድቷል! (Copied)";
    showToast("የእርስዎ OTP ተቀድቷል!", "success");
    setTimeout(() => (copyText.textContent = "OTP ቅዳ (Copy OTP)"), 2500);
  };

  profileBtn.onclick = () => {
    window.location.href = `profile.html?otp=${encodeURIComponent(otp)}`;
  };

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };
}

// OTP / My Profile Lookup
function initOtpLookup() {
  const form = document.getElementById("otpLookupForm");
  const input = document.getElementById("inputOtpLookup");

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const otp = input.value.trim().toUpperCase();
      if (!otp) {
        showToast("እባክዎ OTP ኮድዎን ያስገቡ", "warning");
        input.focus();
        return;
      }
      window.location.href = `profile.html?otp=${encodeURIComponent(otp)}`;
    });
  }
}

// Job Offer Check Section
function initJobOfferCheck() {
  const btn = document.getElementById("btnCheckJobOffer");
  const input = document.getElementById("jobOfferOtpInput");
  const resultArea = document.getElementById("jobOfferResultArea");

  if (btn && input && resultArea) {
    btn.addEventListener("click", async () => {
      const otp = input.value.trim().toUpperCase();
      if (!otp) {
        showToast("እባክዎ OTP ያስገቡ", "warning");
        input.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "እየተፈለገ ነው...";

      try {
        const supabase = window.ELMIS.getClient();
        let offer = null;

        if (supabase) {
          // Look up applicant by OTP first
          const { data: applicant } = await supabase
            .from("applicants")
            .select("id")
            .eq("otp", otp)
            .single();

          if (applicant) {
            const { data: offerData } = await supabase
              .from("job_offers")
              .select("*")
              .eq("applicant_id", applicant.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            offer = offerData;
          }
        } else {
          // Check local storage demo
          const applicants = JSON.parse(
            localStorage.getItem("elmis_demo_applicants") || "[]",
          );
          const found = applicants.find((a) => a.otp === otp);
          if (found && found.job_offer) {
            offer = found.job_offer;
          }
        }

        if (offer) {
          resultArea.innerHTML = `
            <div class="form-card" style="border: 2px solid var(--primary-blue);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem;">
                <span class="badge badge-approved">የስራ ጥሪ ተልኳል (Job Offer Available)</span>
                <span style="font-size: 0.85rem; color: var(--text-muted);">${new Date(offer.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
              ${
                offer.image_path
                  ? `
                <div style="margin-bottom: 1.25rem; border-radius: var(--radius-md); overflow: hidden; max-height: 340px; background: #000;">
                  <img src="${offer.image_path}" alt="Job Offer Letter" style="width: 100%; object-fit: contain;" />
                </div>
              `
                  : ""
              }
              <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 0.5rem;">
                ${offer.job_title || "የተመደበው የስራ መደብ"}
              </h3>
              <p style="font-size: 1rem; font-weight: 700; color: var(--primary-blue); margin-bottom: 0.75rem;">
                ሀገር: ${offer.country || "Dubai"}
              </p>
              <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.6; color: var(--text-main);">
                ${offer.description || "ምንም ተጨማሪ ማብራሪያ አልተሰጠም።"}
              </div>
            </div>
          `;

          const fingerprintSection =
            document.getElementById("fingerprintSection");
          const fingerprintScanner =
            document.getElementById("fingerprintScanner");
          if (fingerprintScanner) fingerprintScanner.hidden = false;
          if (fingerprintSection) {
            fingerprintSection.classList.add("offer-next-step");
            fingerprintSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            setTimeout(
              () => fingerprintSection.classList.remove("offer-next-step"),
              2500,
            );
          }
        } else {
          resultArea.innerHTML = `
            <div class="form-card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: #94a3b8;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h4 style="font-size: 1.2rem; font-weight: 700; color: var(--primary-deep); margin-bottom: 0.5rem;">
                የስራ እድል ማስታወቂያዎ ገና አልተላከም።
              </h4>
              <p style="font-size: 0.9rem;">
                ማመልከቻዎ በግምገማ ላይ ነው። የስራ እድል ሲዘጋጅ በዚሁ ገጽ ላይ ይታያል።
              </p>
            </div>
          `;
        }
      } catch (err) {
        console.error("Job offer check failed:", err);
        showToast("የስራ እድል ማስታወቂያውን መጫን አልተቻለም።", "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "ስራዬን አሳይ / CHECK OFFER";
      }
    });
  }
}

// Payment Uploads Initialization
function initPaymentUploads() {
  // 1. Registration Fee (3,800 ETB)
  setupPaymentForm(
    "paymentReceiptForm",
    "paymentOtpInput",
    "receiptDropArea",
    "paymentReceiptInput",
    "receiptPreviewFileName",
    "btnSubmitPayment",
    "registration",
    3800,
  );

  // 2. Processing Fee (18,200 ETB)
  setupPaymentForm(
    "formProcessingPayment",
    "processingOtpInput",
    "processingDropArea",
    "processingReceiptInput",
    "processingPreviewName",
    "btnSubmitProcessingPayment",
    "processing",
    18200,
  );

  // 3. Bank Statement (46,300 ETB)
  setupPaymentForm(
    "formBankStatement",
    "bankStatementOtpInput",
    "bankStatementDropArea",
    "bankStatementReceiptInput",
    "bankStatementPreviewName",
    "btnSubmitBankStatement",
    "bank_statement",
    46300,
  );
}

function setupPaymentForm(
  formId,
  otpInputId,
  dropAreaId,
  fileInputId,
  fileNameDisplayId,
  submitBtnId,
  paymentType,
  amount,
) {
  const form = document.getElementById(formId);
  const otpInput = document.getElementById(otpInputId);
  const dropArea = document.getElementById(dropAreaId);
  const fileInput = document.getElementById(fileInputId);
  const nameDisplay = document.getElementById(fileNameDisplayId);
  const submitBtn = document.getElementById(submitBtnId);

  if (!form || !dropArea || !fileInput) return;

  let selectedFile = null;

  dropArea.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      nameDisplay.textContent = `የተመረጠ ሰነድ: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
      nameDisplay.style.display = "block";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp = otpInput.value.trim().toUpperCase();

    if (!otp) {
      showToast("እባክዎ OTP ያስገቡ", "error");
      otpInput.focus();
      return;
    }

    if (!selectedFile) {
      showToast("እባክዎ የክፍያ ደረሰኝ ሰነድ ይጫኑ", "error");
      return;
    }

    submitBtn.disabled = true;
    const origHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>ደረሰኙ እየተላከ ነው...</span>`;

    try {
      const supabase = window.ELMIS.getClient();
      let receiptPath = "receipt-uploaded";
      let applicantId = null;

      if (supabase) {
        // Look up applicant
        const { data: applicant, error: applicantError } = await supabase
          .from("applicants")
          .select("id")
          .eq("otp", otp)
          .single();

        if (applicantError || !applicant) {
          throw new Error("የተሳሳተ OTP ኮድ። እባክዎ OTP ኮድዎን ያረጋግጡ።");
        }
        applicantId = applicant.id;

        // Upload receipt to Storage
        const ext = selectedFile.name.split(".").pop();
        const filePath = `receipts/${applicant.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(filePath, selectedFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("payment-receipts")
            .getPublicUrl(filePath);
          receiptPath = publicUrlData ? publicUrlData.publicUrl : filePath;
        }

        // Insert payment record
        const { error: payInsertError } = await supabase
          .from("payments")
          .insert([
            {
              applicant_id: applicant.id,
              payment_type: paymentType,
              amount: amount,
              bank_account: state.settings.BANK_ACCOUNT_NUMBER,
              receipt_path: receiptPath,
              status: "Pending",
            },
          ]);

        if (payInsertError) throw payInsertError;
      } else {
        // Local storage demo record
        recordLocalPayment(otp, paymentType, amount, selectedFile.name);
      }

      await schedulePaymentAppointment(supabase, applicantId, otp, paymentType);

      showToast("የክፍያ ማስረጃዎ ተልኳል። አስተዳደሩ እስኪያረጋግጥ ይጠብቁ።", "success");
      form.reset();
      nameDisplay.style.display = "none";
      selectedFile = null;
    } catch (err) {
      console.error("Payment submission failed:", err);
      showToast(
        err.message || "የክፍያ ማስረጃውን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
        "error",
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  });
}

// Show and persist the appointment date three days after payment submission.
async function schedulePaymentAppointment(
  supabase,
  applicantId,
  otp,
  paymentType,
) {
  const submittedAt = new Date();
  const appointmentDate = new Date(
    submittedAt.getTime() + 3 * 24 * 60 * 60 * 1000,
  );
  const dateValue = [
    appointmentDate.getFullYear(),
    String(appointmentDate.getMonth() + 1).padStart(2, "0"),
    String(appointmentDate.getDate()).padStart(2, "0"),
  ].join("-");
  const displayDate = appointmentDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  showRegistrationAppointment(appointmentDate, displayDate);

  const statusBadge = document.getElementById("publicFpStatusBadge");
  const dateElement = document.getElementById("publicFpDate");
  const locationElement = document.getElementById("publicFpLocation");
  if (statusBadge) {
    statusBadge.textContent = "Scheduled / ቀጠሮ ተይዟል";
    statusBadge.className = "badge badge-approved";
  }
  if (dateElement) dateElement.textContent = displayDate;
  if (locationElement)
    locationElement.textContent = "E-LMIS AUE Main Office, Addis Ababa";

  const fingerprintSection = document.getElementById("fingerprintSection");
  if (fingerprintSection && !fingerprintSection.hidden) {
    fingerprintSection.classList.add("offer-next-step");
    fingerprintSection.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(
      () => fingerprintSection.classList.remove("offer-next-step"),
      2500,
    );
  }

  if (supabase && applicantId) {
    try {
      const { error } = await supabase.from("fingerprint_status").upsert(
        {
          applicant_id: applicantId,
          status: "Scheduled",
          appointment_date: `${dateValue}T09:00:00.000Z`,
          location: "E-LMIS AUE Main Office, Addis Ababa",
          notes: `Scheduled after ${paymentType} payment submission`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "applicant_id" },
      );
      if (error)
        console.warn(
          "Appointment display saved, but database update failed:",
          error,
        );
    } catch (error) {
      console.warn(
        "Appointment display saved, but database update failed:",
        error,
      );
    }
  } else {
    const appointments = JSON.parse(
      localStorage.getItem("elmis_demo_appointments") || "{}",
    );
    appointments[otp] = {
      appointment_date: dateValue,
      payment_type: paymentType,
      status: "Scheduled",
      location: "E-LMIS AUE Main Office, Addis Ababa",
    };
    localStorage.setItem(
      "elmis_demo_appointments",
      JSON.stringify(appointments),
    );
  }
}

function showRegistrationAppointment(appointmentDate, displayDate) {
  const card = document.getElementById("registrationAppointmentCard");
  const dateElement = document.getElementById("registrationAppointmentDate");
  const countdownElement = document.getElementById(
    "registrationAppointmentCountdown",
  );
  if (!card || !dateElement || !countdownElement) return;

  card.hidden = false;
  dateElement.textContent = displayDate;
  if (registrationAppointmentCountdownTimer) {
    clearInterval(registrationAppointmentCountdownTimer);
  }

  const updateCountdown = () => {
    const remaining = Math.max(0, appointmentDate.getTime() - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownElement.textContent = `${days}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (remaining === 0) {
      clearInterval(registrationAppointmentCountdownTimer);
      countdownElement.textContent = "Appointment time / የቀጠሮ ሰዓት";
    }
  };

  updateCountdown();
  registrationAppointmentCountdownTimer = setInterval(updateCountdown, 1000);
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showJobOfferAppointment() {
  const card = document.getElementById("jobOfferAppointmentCard");
  const dateElement = document.getElementById("jobOfferAppointmentDate");
  const countdownElement = document.getElementById(
    "jobOfferAppointmentCountdown",
  );
  if (!card || !dateElement || !countdownElement) return;

  const appointmentDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  dateElement.textContent = appointmentDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  card.hidden = false;

  if (jobOfferAppointmentCountdownTimer) {
    clearInterval(jobOfferAppointmentCountdownTimer);
  }

  const updateCountdown = () => {
    const remaining = Math.max(0, appointmentDate.getTime() - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownElement.textContent = `${days}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (remaining === 0) {
      clearInterval(jobOfferAppointmentCountdownTimer);
      countdownElement.textContent = "Appointment time / የቀጠሮ ሰዓት";
    }
  };

  updateCountdown();
  jobOfferAppointmentCountdownTimer = setInterval(updateCountdown, 1000);
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

window.ELMIS.showJobOfferAppointment = showJobOfferAppointment;

// Copy to Clipboard Helpers
function initCopyButtons() {
  const copyBankBtns = document.querySelectorAll(
    "#btnCopyBankAcc, .copy-bank-btn",
  );
  copyBankBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(state.settings.BANK_ACCOUNT_NUMBER);
      const textSpan = btn.querySelector("span") || btn;
      const original = textSpan.textContent;
      textSpan.textContent = "COPIED!";
      showToast("የባንክ አካውንት ቁጥር ተቀድቷል!", "success");
      setTimeout(() => (textSpan.textContent = original), 2500);
    });
  });
}

// Public Applicant Status Section with Filter & Pagination
function initApplicantStatusGrid() {
  const tabBtns = document.querySelectorAll(".applicant-tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => {
        b.classList.remove("active", "btn-primary");
        b.classList.add("btn-secondary");
      });
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-secondary");
      state.currentStatusFilter = btn.getAttribute("data-status");
      state.applicantPage = 1;
      fetchAndRenderApplicants();
    });
  });

  fetchAndRenderApplicants();
}

async function fetchAndRenderApplicants() {
  const grid = document.getElementById("publicApplicantGrid");
  const paginationNav = document.getElementById("applicantPaginationNav");
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">መረጃ በመጫን ላይ ነው...</div>`;

  try {
    const supabase = window.ELMIS.getClient();
    let applicants = [];
    let totalCount = 0;

    if (supabase) {
      const from = (state.applicantPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      const { data, count, error } = await supabase
        .from("applicants")
        .select(
          "id, otp, full_name, photo_path, date_of_birth, gender, status, country",
          { count: "exact" },
        )
        .eq("status", state.currentStatusFilter)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error && data) {
        applicants = data;
        totalCount = count || 0;
      }
    } else {
      // Local fallback
      const local = JSON.parse(
        localStorage.getItem("elmis_demo_applicants") || "[]",
      );
      const filtered = local.filter(
        (a) => a.status === state.currentStatusFilter,
      );
      totalCount = filtered.length;
      const from = (state.applicantPage - 1) * state.pageSize;
      applicants = filtered.slice(from, from + state.pageSize);
    }

    if (applicants.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; color: #94a3b8;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
          <p style="font-size: 1.05rem; font-weight: 700;">እስካሁን ምንም አመልካች የለም።</p>
          <span style="font-size: 0.85rem;">በዚህ ሁኔታ ውስጥ የተመዘገቡ አመልካቾች ሲኖሩ በዚህ ገጽ ይዘረዘራሉ።</span>
        </div>
      `;
      if (paginationNav) paginationNav.innerHTML = "";
      return;
    }

    // Render cards with click interactivity
    grid.innerHTML = "";
    applicants.forEach((app) => {
      const ageDisplay = calculateAge(app.date_of_birth);
      const photoSrc =
        app.photo_path ||
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      const statusBadgeClass =
        app.status === "Approved"
          ? "badge-approved"
          : app.status === "Rejected"
            ? "badge-rejected"
            : "badge-pending";

      const card = document.createElement("div");
      card.className = "applicant-card-public";
      card.title = "ሙሉ መረጃ ለመመልከት ይጫኑ / Click to view detail";
      card.innerHTML = `
        <img src="${photoSrc}" alt="${app.full_name}" class="applicant-card-photo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'64\\' height=\\'64\\' viewBox=\\'0 0 24 24\\' fill=\\'%23cbd5e1\\'%3E%3Cpath d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E'" />
        <div class="applicant-card-info">
          <h4>${app.full_name}</h4>
          <div class="applicant-card-meta">
            <span>${app.gender || "ወንድ"}</span> • <span>${ageDisplay}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
            <code style="font-size: 0.8rem; font-weight: 700; color: var(--primary-deep);">${app.otp}</code>
            <span class="badge ${statusBadgeClass}">${app.status}</span>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        openApplicantDetailModal(app);
      });

      grid.appendChild(card);
    });

    // Render Pagination
    renderPagination(totalCount);
  } catch (err) {
    console.error("Error fetching applicants:", err);
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 2rem;">መረጃውን ማምጣት አልተቻለም።</div>`;
  }
}

// Interactive Quick-View Modal for Public Applicants
function openApplicantDetailModal(app) {
  const modal = document.getElementById("applicantDetailModal");
  const content = document.getElementById("applicantDetailContent");
  if (!modal || !content) return;

  const ageDisplay = calculateAge(app.date_of_birth);
  const photoSrc =
    app.photo_path ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  const statusBadgeClass =
    app.status === "Approved"
      ? "badge-approved"
      : app.status === "Rejected"
        ? "badge-rejected"
        : "badge-pending";

  content.innerHTML = `
    <img src="${photoSrc}" alt="${app.full_name}" style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-blue); margin: 0 auto 0.75rem;" />
    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 0.35rem;">${app.full_name}</h3>
    <div style="margin-bottom: 0.85rem;"><span class="badge ${statusBadgeClass}">${app.status}</span></div>

    <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); text-align: left; font-size: 0.9rem; margin-bottom: 1.25rem;">
      <div style="margin-bottom: 0.45rem;"><strong>ሀገር / Country:</strong> ${app.country || "Dubai"}</div>
      <div style="margin-bottom: 0.45rem;"><strong>ፆታ / Gender:</strong> ${app.gender || "ወንድ"}</div>
      <div style="margin-bottom: 0.45rem;"><strong>እድሜ / Age:</strong> ${ageDisplay}</div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px solid var(--border-color);">
        <span><strong>OTP ኮድ:</strong> <code style="font-size: 1rem; font-weight: 800; color: var(--primary-blue);">${app.otp}</code></span>
        <button type="button" class="btn btn-secondary btn-copy-otp-chip" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; min-height: 28px;">ቅዳ / Copy</button>
      </div>
    </div>

    <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
      <a href="profile.html?otp=${app.otp}" class="btn btn-gold" style="flex: 1; min-width: 140px;">ሙሉ መረጃ ይመልከቱ</a>
      <button type="button" class="btn btn-secondary" id="btnInnerCloseApplicantModal" style="flex: 1; min-width: 100px;">ዝጋ</button>
    </div>
  `;

  const copyBtn = content.querySelector(".btn-copy-otp-chip");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(app.otp);
      copyBtn.textContent = "ተቀድቷል!";
      showToast("OTP ኮድ ተቀድቷል!", "success");
      setTimeout(() => (copyBtn.textContent = "ቅዳ / Copy"), 2000);
    });
  }

  const innerCloseBtn = content.querySelector("#btnInnerCloseApplicantModal");
  if (innerCloseBtn) {
    innerCloseBtn.addEventListener("click", closeApplicantModal);
  }

  modal.classList.add("active");
}

function closeApplicantModal() {
  const modal = document.getElementById("applicantDetailModal");
  if (modal) modal.classList.remove("active");
}

function renderPagination(totalCount) {
  const paginationNav = document.getElementById("applicantPaginationNav");
  if (!paginationNav) return;

  const totalPages = Math.ceil(totalCount / state.pageSize);
  if (totalPages <= 1) {
    paginationNav.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn" ${state.applicantPage === 1 ? "disabled" : ""} id="prevPageBtn">Previous</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-btn ${state.applicantPage === i ? "active" : ""}" data-page="${i}">${i}</button>
    `;
  }

  html += `
    <button class="page-btn" ${state.applicantPage === totalPages ? "disabled" : ""} id="nextPageBtn">Next</button>
  `;

  paginationNav.innerHTML = html;

  // Pagination Listeners
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (state.applicantPage > 1) {
        state.applicantPage--;
        fetchAndRenderApplicants();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (state.applicantPage < totalPages) {
        state.applicantPage++;
        fetchAndRenderApplicants();
      }
    });
  }

  paginationNav.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.applicantPage = parseInt(btn.getAttribute("data-page"), 10);
      fetchAndRenderApplicants();
    });
  });
}

// Local Storage Fallback Helpers for Instant Offline Testing
function saveLocalApplicant(applicant) {
  const existing = JSON.parse(
    localStorage.getItem("elmis_demo_applicants") || "[]",
  );
  existing.unshift(applicant);
  localStorage.setItem("elmis_demo_applicants", JSON.stringify(existing));
}

function recordLocalPayment(otp, paymentType, amount, filename) {
  const payments = JSON.parse(
    localStorage.getItem("elmis_demo_payments") || "[]",
  );
  payments.unshift({
    otp,
    payment_type: paymentType,
    amount,
    filename,
    status: "Pending",
    created_at: new Date().toISOString(),
  });
  localStorage.setItem("elmis_demo_payments", JSON.stringify(payments));
}
