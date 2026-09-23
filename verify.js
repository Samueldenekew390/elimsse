/**
 * E-LMIS AUE - Electronic Visa Verification Logic
 * Securely checks and displays verified visa status without exposing sensitive passport/contact details.
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("verifySearchForm");
  const input = document.getElementById("inputVerifyCode");
  const printBtn = document.getElementById("btnPrintEvisa");

  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get("code");

  if (codeParam) {
    input.value = codeParam.trim().toUpperCase();
    verifyCode(codeParam.trim().toUpperCase());
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (!code) return;
      window.history.pushState({}, "", `verify.html?code=${encodeURIComponent(code)}`);
      verifyCode(code);
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
});

async function verifyCode(code) {
  const loading = document.getElementById("verifyLoading");
  const notFound = document.getElementById("verifyNotFound");
  const card = document.getElementById("verifyCertificateCard");

  loading.style.display = "block";
  notFound.style.display = "none";
  card.style.display = "none";

  try {
    const supabase = window.ELMIS.getClient();
    let result = null;

    if (supabase) {
      // 1. Try secure RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc("verify_electronic_visa", {
        input_code: code
      });

      if (!rpcError && rpcData && rpcData.success) {
        result = rpcData;
      } else {
        // Direct query fallback
        const { data: evData, error: evError } = await supabase
          .from("electronic_visas")
          .select("*, applicants(full_name, photo_path)")
          .eq("verification_code", code)
          .single();

        if (!evError && evData) {
          result = {
            success: true,
            status: evData.status,
            full_name: evData.applicants?.full_name || "Applicant",
            country: evData.country,
            visa_type: evData.visa_type || "Work Visa",
            verification_code: evData.verification_code,
            issue_date: evData.issue_date,
            expiry_date: evData.expiry_date,
            travel_date: evData.travel_date,
            photo_path: evData.applicants?.photo_path || null
          };
        }
      }
    } else {
      // Demo fallback
      const demoVisas = JSON.parse(localStorage.getItem("elmis_demo_evisas") || "[]");
      const found = demoVisas.find(v => v.verification_code === code);
      if (found) {
        result = {
          success: true,
          ...found
        };
      }
    }

    if (!result || !result.success) {
      loading.style.display = "none";
      notFound.style.display = "block";
      return;
    }

    // Populate certificate details
    document.getElementById("evisaCountryHeader").textContent = `${result.country.toUpperCase()} WORK VISA RECORD`;
    document.getElementById("evisaRefCode").textContent = result.verification_code;
    document.getElementById("evisaApplicantName").textContent = result.full_name;
    document.getElementById("evisaCountryName").textContent = result.country;
    document.getElementById("evisaVisaType").textContent = result.visa_type || "Work Visa (የስራ ቪዛ)";
    document.getElementById("evisaIssueDate").textContent = result.issue_date ? new Date(result.issue_date).toLocaleDateString() : "Active";
    document.getElementById("evisaExpiryDate").textContent = result.expiry_date ? new Date(result.expiry_date).toLocaleDateString() : "Valid for 2 Years";
    document.getElementById("evisaTravelDate").textContent = result.travel_date ? new Date(result.travel_date).toLocaleDateString() : "To Be Scheduled";

    const photoEl = document.getElementById("evisaPhoto");
    if (result.photo_path) {
      photoEl.src = result.photo_path;
    }

    // Generate Verification QR Code
    const qrContainer = document.getElementById("evisaQrContainer");
    qrContainer.innerHTML = "";
    if (window.QRCode) {
      new window.QRCode(qrContainer, {
        text: window.location.href, // Only contains the verification URL, no PII!
        width: 110,
        height: 110,
        colorDark: "#0a192f",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
    }

    loading.style.display = "none";
    card.style.display = "block";
  } catch (err) {
    console.error("Verification failed:", err);
    loading.style.display = "none";
    notFound.style.display = "block";
  }
}
