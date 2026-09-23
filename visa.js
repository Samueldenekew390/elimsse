/**
 * E-LMIS AUE - Visa Application Page Logic (Vanilla JavaScript)
 * Handles country switching, Arabic headers, HTML5 Canvas Signature Pad, and Supabase submission.
 */

const COUNTRY_CONFIGS = {
  "Dubai": {
    flag: "🇦🇪",
    formADayEn: "Form a day: ____",
    formADayAr: "مروي لامتش: ____",
    countryEn: "UNITED ARAB EMIRATES",
    titleEn: "Dubai visa application form",
    countryAr: "الإمارات العربية المتحدة",
    titleAr: "نموذج طلب تأشيرة دبي",
    generalDetailsEn: "General Details",
    generalDetailsAr: "جميع التفاصيل",
    visaTypeLabelAr: "نوع التأشيرة",
    signatureLabelAr: "التوقيع / توقيعك",
    introEn: "First of all, while offering our greetings, the Dubai government announced that a large number of human resources are needed according to the newly issued job opportunity statement. I Mr./Mrs. {NAME} According to the newly released job description, I have come forward as a registrant, so I have signed the form below to agree to go to Dubai for a work visa as an Ethiopian with the help of the government.",
    introAr: "بادئ ذي بدء، مع تقديم تحياتنا، أعلنت حكومة دبي عن الحاجة إلى موارد بشرية بموجب بيان فرص العمل الصادر حديثاً. أنا الموقع أدناه أوافق على السفر إلى دبي بتأشيرة عمل بمساعدة الجهات المعنية كإثيوبي وفقاً للإجراءات النظامية."
  },
  "Kuwait": {
    flag: "🇰🇼",
    formADayEn: "Form a day: __",
    formADayAr: "نموذج طلب: __",
    countryEn: "KUWAIT",
    titleEn: "Kuwait Visa application form",
    countryAr: "الكويت",
    titleAr: "نموذج طلب تأشيرة الكويت",
    generalDetailsEn: "General Details",
    generalDetailsAr: "جميع التفاصيل / البيانات العامة",
    visaTypeLabelAr: "نوع الفيزا / نوع التأشيرة",
    signatureLabelAr: "توقيع / توقيعك",
    introEn: "First of all, while offering our greetings, the Kuwait government announced that a large number of human resources are needed according to the newly issued job opportunity statement. I Mr./Mrs. {NAME} According to the newly released job description, I have come forward as a registrant, so I have signed the form below to agree to go to Kuwait for a work visa as an Ethiopian with the help of the government.",
    introAr: "بادئ ذي بدء، مع تقديم تحياتنا، أعلنت حكومة الكويت عن الحاجة إلى موارد بشرية بموجب بيان فرص العمل الصادر حديثاً. أنا الموقع أدناه أوافق على السفر إلى الكويت بتأشيرة عمل بمساعدة الجهات المعنية كإثيوبي وفقاً للإجراءات النظامية."
  },
  "Qatar": {
    flag: "🇶🇦",
    formADayEn: "Form a day: ____",
    formADayAr: "مروي لامتش: ____",
    countryEn: "QATAR",
    titleEn: "Qatar Visa application form",
    countryAr: "دولة قطر",
    titleAr: "نموذج طلب تأشيرة قطر",
    generalDetailsEn: "General Details",
    generalDetailsAr: "جميع التفاصيل",
    visaTypeLabelAr: "نوع التأشيرة",
    signatureLabelAr: "التوقيع / توقيعك",
    introEn: "First of all, while offering our greetings, the Qatar government announced that a large number of human resources are needed according to the newly issued job opportunity statement. I Mr./Mrs. {NAME} According to the newly released job description, I have come forward as a registrant, so I have signed the form below to agree to go to Qatar for a work visa as an Ethiopian with the help of the government.",
    introAr: "بادئ ذي بدء، مع تقديم تحياتنا، أعلنت حكومة قطر عن الحاجة إلى موارد بشرية بموجب بيان فرص العمل الصادر حديثاً. أنا الموقع أدناه أوافق على السفر إلى دولة قطر بتأشيرة عمل بمساعدة الجهات المعنية كإثيوبي وفقاً للإجراءات النظامية."
  },
  "Saudi Arabia": {
    flag: "🇸🇦",
    formADayEn: "Form a day: ____",
    formADayAr: "مروي لامتش: ____",
    countryEn: "SAUDI ARABIA",
    titleEn: "Saudi Arabia Visa Application form",
    countryAr: "المملكة العربية السعودية",
    titleAr: "نموذج طلب تأشيرة المملكة العربية السعودية",
    generalDetailsEn: "General Details",
    generalDetailsAr: "جميع التفاصيل",
    visaTypeLabelAr: "نوع التأشيرة",
    signatureLabelAr: "التوقيع / توقيعك",
    introEn: "First of all, while offering our greetings, the Saudi Arabia government announced that a large number of human resources are needed according to the newly issued job opportunity statement. I Mr./Mrs. {NAME} According to the newly released job description, I have come forward as a registrant, so I have signed the form below to agree to go to Saudi Arabia for a work visa as an Ethiopian with the help of the government.",
    introAr: "بادئ ذي بدء، مع تقديم تحياتنا، أعلنت حكومة المملكة العربية السعودية عن الحاجة إلى موارد بشرية بموجب بيان فرص العمل الصادر حديثاً. أنا الموقع أدناه أوافق على السفر إلى المملكة العربية السعودية بتأشيرة عمل بمساعدة الجهات المعنية كإثيوبي وفقاً للإجراءات النظامية."
  }
};

let selectedCountry = "Dubai";
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let hasDrawnSignature = false;
let currentApplicant = null;
let signatureHistory = [];
let currentPenColor = "#0f172a";

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initCountryTabs();
  initSignaturePad();
  initAutofill();
  initVisaForm();

  // Check URL params for preselected OTP or country
  const urlParams = new URLSearchParams(window.location.search);
  const countryParam = urlParams.get("country");
  const otpParam = urlParams.get("otp");

  if (countryParam && COUNTRY_CONFIGS[countryParam]) {
    switchCountry(countryParam);
  } else {
    switchCountry("Dubai");
  }

  if (otpParam) {
    document.getElementById("visaOtpInput").value = otpParam.trim().toUpperCase();
    autofillApplicant(otpParam.trim().toUpperCase());
  }
});

// Mobile Hamburger Menu for Visa page
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

// Country Switching
function initCountryTabs() {
  const tabs = document.querySelectorAll(".visa-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const country = tab.getAttribute("data-country");
      switchCountry(country);
    });
  });
}

function switchCountry(country) {
  selectedCountry = country;
  const config = COUNTRY_CONFIGS[country];
  if (!config) return;

  // Update tabs
  document.querySelectorAll(".visa-tab-btn").forEach(t => {
    if (t.getAttribute("data-country") === country) {
      t.classList.add("active", "btn-primary");
      t.classList.remove("btn-secondary");
    } else {
      t.classList.remove("active", "btn-primary");
      t.classList.add("btn-secondary");
    }
  });

  // Update DOM
  document.getElementById("visaSelectedCountry").value = country;
  document.getElementById("visaFlagWatermark").textContent = config.flag;
  document.getElementById("visaHeaderCountryEn").textContent = config.countryEn;
  document.getElementById("visaHeaderTitleEn").textContent = config.titleEn;
  document.getElementById("visaHeaderCountryAr").textContent = config.countryAr;
  document.getElementById("visaHeaderTitleAr").textContent = config.titleAr;

  const elFormEn = document.getElementById("visaFormADayEn");
  const elFormAr = document.getElementById("visaFormADayAr");
  const elGenEn = document.getElementById("visaGeneralDetailsEn");
  const elGenAr = document.getElementById("visaGeneralDetailsAr");
  const elVisaTypeAr = document.getElementById("visaTypeArabic");
  const elSigAr = document.getElementById("visaSignatureArabic");

  if (elFormEn) elFormEn.textContent = config.formADayEn;
  if (elFormAr) elFormAr.textContent = config.formADayAr;
  if (elGenEn) elGenEn.textContent = config.generalDetailsEn;
  if (elGenAr) elGenAr.textContent = config.generalDetailsAr;
  if (elVisaTypeAr) elVisaTypeAr.textContent = config.visaTypeLabelAr;
  if (elSigAr) elSigAr.textContent = config.signatureLabelAr;

  const applicantName = currentApplicant ? currentApplicant.full_name : "__________";
  document.getElementById("visaIntroTextEn").textContent = config.introEn.replace("{NAME}", applicantName);
  document.getElementById("visaIntroTextAr").value = config.introAr;
}

// HTML5 Canvas Signature Pad with Cross-Device Touch & Pen Controls
function initSignaturePad() {
  signatureCanvas = document.getElementById("signatureCanvas");
  if (!signatureCanvas) return;

  signatureCtx = signatureCanvas.getContext("2d");

  function saveSignatureState() {
    if (signatureHistory.length >= 20) signatureHistory.shift();
    signatureHistory.push(signatureCanvas.toDataURL());
  }

  // Handle high-dpi / retina displays and screen rotation
  function resizeCanvas() {
    const prevData = hasDrawnSignature ? signatureCanvas.toDataURL() : null;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = signatureCanvas.getBoundingClientRect();
    if (rect.width === 0) return;

    signatureCanvas.width = rect.width * ratio;
    signatureCanvas.height = 160 * ratio;
    signatureCtx.scale(ratio, ratio);
    signatureCtx.strokeStyle = currentPenColor || "#0f172a";
    signatureCtx.lineWidth = 2.5;
    signatureCtx.lineCap = "round";
    signatureCtx.lineJoin = "round";

    if (prevData) {
      const img = new Image();
      img.onload = () => {
        signatureCtx.drawImage(img, 0, 0, rect.width, 160);
      };
      img.src = prevData;
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function startStroke(pos) {
    isDrawing = true;
    hasDrawnSignature = true;
    signatureCtx.strokeStyle = currentPenColor;
    signatureCtx.beginPath();
    signatureCtx.moveTo(pos.x, pos.y);
  }

  function drawStroke(pos) {
    if (!isDrawing) return;
    signatureCtx.lineTo(pos.x, pos.y);
    signatureCtx.stroke();
  }

  function endStroke() {
    if (isDrawing) {
      isDrawing = false;
      saveSignatureState();
    }
  }

  // Mouse Events (PC)
  signatureCanvas.addEventListener("mousedown", (e) => {
    startStroke(getCanvasPos(e));
  });

  signatureCanvas.addEventListener("mousemove", (e) => {
    drawStroke(getCanvasPos(e));
  });

  window.addEventListener("mouseup", endStroke);

  // Touch Events for Mobile / Tablet
  signatureCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches && e.touches[0]) {
      startStroke(getCanvasPos(e.touches[0]));
    }
  }, { passive: false });

  signatureCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches && e.touches[0]) {
      drawStroke(getCanvasPos(e.touches[0]));
    }
  }, { passive: false });

  signatureCanvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    endStroke();
  }, { passive: false });

  // Clear Button
  const clearBtn = document.getElementById("btnClearSignature");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      hasDrawnSignature = false;
      signatureHistory = [];
    });
  }

  // Undo Button
  const undoBtn = document.getElementById("btnUndoSignature");
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (signatureHistory.length === 0) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        hasDrawnSignature = false;
        return;
      }
      signatureHistory.pop(); // Remove current
      if (signatureHistory.length === 0) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        hasDrawnSignature = false;
      } else {
        const prevImgData = signatureHistory[signatureHistory.length - 1];
        const rect = signatureCanvas.getBoundingClientRect();
        const img = new Image();
        img.onload = () => {
          signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
          signatureCtx.drawImage(img, 0, 0, rect.width, 160);
        };
        img.src = prevImgData;
      }
    });
  }

  // Ink Color Buttons
  const blackBtn = document.getElementById("penColorBlack");
  const blueBtn = document.getElementById("penColorBlue");

  if (blackBtn && blueBtn) {
    blackBtn.addEventListener("click", () => {
      currentPenColor = "#0f172a";
      blackBtn.classList.add("active");
      blueBtn.classList.remove("active");
    });

    blueBtn.addEventListener("click", () => {
      currentPenColor = "#1d4ed8";
      blueBtn.classList.add("active");
      blackBtn.classList.remove("active");
    });
  }

  function getCanvasPos(evt) {
    const rect = signatureCanvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }
}

// Autofill from OTP
function initAutofill() {
  const btn = document.getElementById("btnAutofillVisa");
  const input = document.getElementById("visaOtpInput");

  if (btn && input) {
    btn.addEventListener("click", () => {
      const otp = input.value.trim().toUpperCase();
      if (!otp) {
        showToast("እባክዎ OTP ኮድዎን ያስገቡ", "warning");
        input.focus();
        return;
      }
      autofillApplicant(otp);
    });
  }
}

async function autofillApplicant(otp) {
  try {
    const supabase = window.ELMIS.getClient();
    let app = null;

    if (supabase) {
      const { data, error } = await supabase
        .from("applicants")
        .select("*")
        .eq("otp", otp)
        .single();
      if (!error && data) app = data;
    } else {
      const local = JSON.parse(localStorage.getItem("elmis_demo_applicants") || "[]");
      app = local.find(a => a.otp === otp);
    }

    if (!app) {
      showToast("ይህ OTP አልተገኘም። እባክዎ በትክክል መመዝገብዎን ያረጋግጡ።", "error");
      return;
    }

    currentApplicant = app;

    // Fill fields
    const names = (app.full_name || "").trim().split(" ");
    document.getElementById("visaFirstName").value = names[0] || "";
    document.getElementById("visaLastName").value = names.slice(1).join(" ") || "";
    document.getElementById("visaMobile").value = app.mobile_number || "";
    document.getElementById("visaEmail").value = app.email || "";
    document.getElementById("visaCurrentAddress").value = app.address || "";
    if (app.date_of_birth) {
      document.getElementById("visaDOB").value = app.date_of_birth;
    }

    if (app.country && COUNTRY_CONFIGS[app.country]) {
      switchCountry(app.country);
    } else {
      const config = COUNTRY_CONFIGS[selectedCountry];
      document.getElementById("visaIntroTextEn").textContent = config.introEn.replace("{NAME}", app.full_name);
    }

    showToast("የአመልካች መረጃ በራስ-ሰር ተሞልቷል!", "success");
  } catch (err) {
    console.error("Autofill failed:", err);
  }
}

// Visa Form Submission
function initVisaForm() {
  const form = document.getElementById("mainVisaForm");
  const submitBtn = document.getElementById("btnSubmitVisa");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("visaOtpInput").value.trim().toUpperCase();
    const firstName = document.getElementById("visaFirstName").value.trim();
    const lastName = document.getElementById("visaLastName").value.trim();
    const dob = document.getElementById("visaDOB").value;
    const passportNumber = document.getElementById("visaPassportNumber").value.trim().toUpperCase();
    const passportExpiry = document.getElementById("visaPassportExpiry").value;
    const nationality = document.getElementById("visaNationality").value.trim();
    const visaType = document.getElementById("visaType").value.trim();
    const city = document.getElementById("visaCity").value.trim();
    const currentAddress = document.getElementById("visaCurrentAddress").value.trim();
    const mobileNumber = document.getElementById("visaMobile").value.trim();
    const countryCode = document.getElementById("visaCountryCode").value.trim();
    const whatsapp = document.getElementById("visaWhatsapp").value.trim();
    const travelDate = document.getElementById("visaTravelDate").value;
    const email = document.getElementById("visaEmail").value.trim();
    const bail = document.getElementById("visaBail").value.trim();

    // Validations
    if (!otp) {
      showToast("እባክዎ OTP ኮድዎን ያስገቡ", "error");
      document.getElementById("visaOtpInput").focus();
      return;
    }

    if (!firstName || !lastName) {
      showToast("እባክዎ የመጀመሪያ እና የአባት ስምዎን ያስገቡ", "error");
      return;
    }

    if (!dob) {
      showToast("እባክዎ የትውልድ ቀንዎን ያስገቡ", "error");
      return;
    }

    if (!passportNumber) {
      showToast("እባክዎ የፓስፖርት ቁጥርዎን ያስገቡ", "error");
      document.getElementById("visaPassportNumber").focus();
      return;
    }

    if (!passportExpiry) {
      showToast("እባክዎ የፓስፖርት ማብቂያ ቀንዎን ያስገቡ", "error");
      return;
    }

    if (!hasDrawnSignature) {
      showToast("እባክዎ በፊርማ ሳጥኑ ውስጥ ፊርማዎን ያኑሩ (Signature required)", "error");
      document.getElementById("signatureCanvas").scrollIntoView({ behavior: "smooth" });
      return;
    }

    submitBtn.disabled = true;
    const origHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>ማመልከቻው እየተላከ ነው...</span>`;

    try {
      const signatureDataUrl = signatureCanvas.toDataURL("image/png");
      const supabase = window.ELMIS.getClient();

      if (supabase) {
        // Look up applicant
        const { data: applicant, error: applicantErr } = await supabase
          .from("applicants")
          .select("id")
          .eq("otp", otp)
          .single();

        if (applicantErr || !applicant) {
          throw new Error("የተሳሳተ OTP ኮድ። እባክዎ አስቀድመው መመዝገብዎን ያረጋግጡ።");
        }

        // Save visa application
        const { error: visaInsertError } = await supabase
          .from("visa_applications")
          .insert([{
            applicant_id: applicant.id,
            country: selectedCountry,
            nationality: nationality || "Ethiopian",
            visa_type: visaType || "Work Visa",
            city: city,
            current_address: currentAddress,
            country_code: countryCode || "+251",
            mobile_number: mobileNumber,
            whatsapp_number: whatsapp,
            travel_date: travelDate || null,
            email: email,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dob,
            passport_number: passportNumber,
            passport_expiry_date: passportExpiry,
            bail: bail,
            signature_data: signatureDataUrl,
            status: "Submitted"
          }]);

        if (visaInsertError) throw visaInsertError;
      } else {
        // Demo local storage
        const visas = JSON.parse(localStorage.getItem("elmis_demo_visas") || "[]");
        visas.unshift({
          otp,
          country: selectedCountry,
          first_name: firstName,
          last_name: lastName,
          passport_number: passportNumber,
          date_of_birth: dob,
          signature_data: signatureDataUrl,
          status: "Submitted",
          created_at: new Date().toISOString()
        });
        localStorage.setItem("elmis_demo_visas", JSON.stringify(visas));
      }

      showToast("የቪዛ ማመልከቻዎ ተልኳል።", "success");
      setTimeout(() => {
        window.location.href = `profile.html?otp=${encodeURIComponent(otp)}`;
      }, 1500);
    } catch (err) {
      console.error("Visa submission failed:", err);
      showToast(err.message || "የቪዛ ማመልከቻውን መላክ አልተቻለም።", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  });
}
