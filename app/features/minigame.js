document.addEventListener("DOMContentLoaded", () => {
  const aimBtn = document.getElementById("aimTrainerBtn");
  const aimModal = document.getElementById("aimTrainerModal");
  const closeAimModal = document.getElementById("closeAimTrainer");
  const aimArena = document.getElementById("aimArena");
  const startBtn = document.getElementById("startAimGameBtn");
  const restartBtn = document.getElementById("restartAimGameBtn");
  const startScreen = document.getElementById("aimStartScreen");
  const resultScreen = document.getElementById("aimResultScreen");

  const timerEl = document.getElementById("aimTimer");
  const targetsCountEl = document.getElementById("aimTargetsCount");
  const accuracyEl = document.getElementById("aimAccuracy");

  const resTimeEl = document.getElementById("resTime");
  const resAccuracyEl = document.getElementById("resAccuracy");
  const resGradeEl = document.getElementById("resGrade");

  let score = 0;
  let totalClicks = 0;
  let startTime = 0;
  let timerInterval = null;
  let isPlaying = false;
  const MAX_TARGETS = 30;
  const TARGET_RADIUS = 18;

  if (aimBtn) {
    aimBtn.addEventListener("click", () => {
      aimModal.style.display = "flex";
      resetGameUI();
    });
  }

  if (closeAimModal) {
    closeAimModal.addEventListener("click", () => {
      aimModal.style.display = "none";
      stopGame();
    });
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  function startGame() {
    score = 0;
    totalClicks = 0;
    isPlaying = true;

    startScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");

    updateStatsUI();
    clearTargets();

    startTime = performance.now();
    timerInterval = setInterval(updateTimer, 50);

    spawnTarget();
  }

  function updateTimer() {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    timerEl.textContent = elapsed;
  }

  aimArena.addEventListener("click", (e) => {
    if (!isPlaying) return;
    if (e.target.closest(".aim-overlay")) return;

    totalClicks++;

    if (e.target.classList.contains("aim-target")) {
      score++;
      e.target.remove();

      if (score >= MAX_TARGETS) {
        endGame();
      } else {
        spawnTarget();
      }
    }

    updateStatsUI();
  });

  function spawnTarget() {
    clearTargets();

    const target = document.createElement("div");
    target.classList.add("aim-target");

    const arenaWidth = aimArena.clientWidth;
    const arenaHeight = aimArena.clientHeight;

    const x =
      Math.random() * (arenaWidth - TARGET_RADIUS * 4) + TARGET_RADIUS * 2;
    const y =
      Math.random() * (arenaHeight - TARGET_RADIUS * 4) + TARGET_RADIUS * 2;

    target.style.left = `${x}px`;
    target.style.top = `${y}px`;

    aimArena.appendChild(target);
  }

  function clearTargets() {
    const existingTargets = aimArena.querySelectorAll(".aim-target");
    existingTargets.forEach((t) => t.remove());
  }

  function updateStatsUI() {
    targetsCountEl.textContent = score;
    const accuracy =
      totalClicks > 0 ? Math.round((score / totalClicks) * 100) : 100;
    accuracyEl.textContent = accuracy;
  }

  function endGame() {
    isPlaying = false;
    clearInterval(timerInterval);
    clearTargets();

    const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);
    const accuracy = Math.round((score / totalClicks) * 100);

    resTimeEl.textContent = elapsedTime;
    resAccuracyEl.textContent = accuracy;
    resGradeEl.textContent = calculateGrade(accuracy, parseFloat(elapsedTime));

    resultScreen.classList.remove("hidden");
  }

  function stopGame() {
    isPlaying = false;
    clearInterval(timerInterval);
    clearTargets();
  }

  function resetGameUI() {
    stopGame();
    startScreen.classList.remove("hidden");
    resultScreen.classList.add("hidden");
    timerEl.textContent = "0.0";
    targetsCountEl.textContent = "0";
    accuracyEl.textContent = "100";
  }

  function calculateGrade(accuracy, time) {
    if (accuracy >= 95 && time < 18) return "S+ (ZywOo Level)";
    if (accuracy >= 90 && time < 22) return "S (Pro Player)";
    if (accuracy >= 80 && time < 28) return "A (FACEIT Level 10)";
    if (accuracy >= 70 && time < 35) return "B (Gold Nova)";
    if (accuracy >= 50) return "C (Silver)";
    return "D (Needs Practice)";
  }
});
