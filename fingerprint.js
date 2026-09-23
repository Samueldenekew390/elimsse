/* Sample-only scanner flow. It simulates a reader and does not access biometric hardware. */

document.addEventListener("DOMContentLoaded", () => {
  const scanner = document.getElementById("fingerprintScanner");
  const fingerCards = Array.from(
    document.querySelectorAll("[data-fingerprint]"),
  );
  const scanButton = document.getElementById("btnScanFingerprint");
  const completeButton = document.getElementById(
    "btnCompleteFingerprintSample",
  );
  const progressText = document.getElementById("fingerprintProgressText");
  const statusBadge = document.getElementById("fingerprintCaptureStatus");
  const activeFingerText = document.getElementById("fingerprintActiveFinger");
  const scanMessage = document.getElementById("fingerprintScanMessage");

  if (!scanner || !fingerCards.length) return;

  let activeIndex = 0;
  let scanning = false;

  const updateProgress = () => {
    const capturedCount = fingerCards.filter((card) =>
      card.classList.contains("fingerprint-captured"),
    ).length;
    progressText.textContent = `${capturedCount} of 5 fingers scanned`;
    completeButton.disabled = capturedCount !== fingerCards.length;
    if (capturedCount === fingerCards.length) {
      statusBadge.textContent = "All scans ready / ሁሉም ምልክቶች ዝግጁ ናቸው";
      statusBadge.className = "badge badge-approved";
      scanButton.disabled = true;
      scanMessage.textContent = "Scan complete";
    }
  };

  const selectFinger = (index) => {
    if (fingerCards[index].classList.contains("fingerprint-captured")) return;
    activeIndex = index;
    fingerCards.forEach((card) =>
      card.classList.remove("fingerprint-card-active"),
    );
    fingerCards[index].classList.add("fingerprint-card-active");
    activeFingerText.textContent =
      fingerCards[index].querySelector("strong").textContent;
    scanMessage.textContent = "Place your finger";
  };

  scanButton.addEventListener("click", () => {
    if (
      scanning ||
      fingerCards[activeIndex].classList.contains("fingerprint-captured")
    )
      return;
    scanning = true;
    scanButton.disabled = true;
    statusBadge.textContent = "Scanning / በመስካን ላይ...";
    statusBadge.className = "badge badge-pending";
    scanMessage.textContent = "Reading fingerprint...";
    scanner.classList.add("fingerprint-scanning");

    setTimeout(() => {
      const card = fingerCards[activeIndex];
      card.classList.add("fingerprint-captured");
      card.querySelector("[data-fingerprint-state]").textContent =
        "Captured successfully";
      scanner.classList.remove("fingerprint-scanning");
      scanning = false;
      const nextIndex = fingerCards.findIndex(
        (item) => !item.classList.contains("fingerprint-captured"),
      );
      if (nextIndex >= 0) {
        selectFinger(nextIndex);
        scanButton.disabled = false;
        statusBadge.textContent = "Scanner ready / ስካነሩ ዝግጁ ነው";
      }
      updateProgress();
    }, 1200);
  });

  fingerCards.forEach((card, index) =>
    card.addEventListener("click", () => selectFinger(index)),
  );
  completeButton.addEventListener("click", () => {
    statusBadge.textContent = "Sample completed / የሙከራ ሂደቱ ተጠናቋል";
    statusBadge.className = "badge badge-approved";
    completeButton.textContent = "Sample submitted / ተልኳል";
    completeButton.disabled = true;
    if (window.ELMIS?.showJobOfferAppointment) {
      window.ELMIS.showJobOfferAppointment();
    }
  });

  updateProgress();
});
