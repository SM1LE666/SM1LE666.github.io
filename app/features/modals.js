(function () {
  let reactionTest = {
    timeout: null,
    startTime: 0,
    isActive: false,
    delay: 0,
    scheduledTime: 0,
  };

  function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach((modal) => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    });
    document.body.style.overflow = '';
  }

  function openSupportModal() {
    closeAllModals();
    const modal = document.getElementById('supportModal');
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function openContactModal() {
    closeAllModals();
    const modal = document.getElementById('contactModal');
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function openReactionTestModal() {
    closeAllModals();
    const modal = document.getElementById('reactionTestModal');
    if (!modal) return;

    modal.style.display = 'none';
    setTimeout(() => {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      initReactionTest();
      if (typeof window.updateReactionTestTexts === 'function') {
        window.updateReactionTestTexts();
      }
    }, 10);
  }

  function initReactionTest() {
    resetReactionTest();

    const startBtn = document.getElementById('startReactionTest');
    const retryBtn = document.getElementById('retryReactionTest');
    const restartBtn = document.getElementById('restartReactionTest');
    if (startBtn) startBtn.onclick = startReactionTest;
    if (retryBtn) retryBtn.onclick = startReactionTest;
    if (restartBtn) restartBtn.onclick = resetReactionTest;

    const waitingScreen = document.getElementById('reactionWaiting');
    if (waitingScreen) {
      waitingScreen.onclick = () => {
        if (reactionTest.isActive && waitingScreen.style.display === 'block') {
          handleEarlyClick();
        }
      };
    }

    const readyScreen = document.getElementById('reactionReady');
    if (readyScreen) {
      readyScreen.onclick = () => {
        if (reactionTest.isActive && readyScreen.style.display === 'block') {
          handleReactionClick();
        }
      };
    }
  }

  function startReactionTest() {
    document.getElementById('reactionInstructions').style.display = 'none';
    document.getElementById('reactionResults').style.display = 'none';
    document.getElementById('reactionTooEarly').style.display = 'none';
    document.getElementById('reactionReady').style.display = 'none';
    document.getElementById('reactionWaiting').style.display = 'block';

    reactionTest.isActive = true;
    reactionTest.delay = Math.floor(Math.random() * 3000) + 2000;
    reactionTest.scheduledTime = performance.now();

    reactionTest.timeout = setTimeout(() => {
      if (!reactionTest.isActive) return;
      requestAnimationFrame(() => {
        document.getElementById('reactionWaiting').style.display = 'none';
        document.getElementById('reactionReady').style.display = 'block';
        reactionTest.startTime = performance.now();
      });
    }, reactionTest.delay);
  }

  function handleReactionClick() {
    if (!reactionTest.isActive || reactionTest.startTime === 0) return;

    const reactionTime = Math.round(performance.now() - reactionTest.startTime);
    reactionTest.isActive = false;
    clearTimeout(reactionTest.timeout);

    document.getElementById('reactionReady').style.display = 'none';
    document.getElementById('reactionResults').style.display = 'block';
    document.getElementById('reactionTimeValue').textContent = reactionTime;

    const getText = window.getText || ((key) => key);
    const ratingElement = document.getElementById('reactionRating');
    if (reactionTime < 150) {
      ratingElement.textContent = getText('reactionRatingExcellent');
    } else if (reactionTime < 200) {
      ratingElement.textContent = getText('reactionRatingGood');
    } else if (reactionTime < 250) {
      ratingElement.textContent = getText('reactionRatingNormal');
    } else if (reactionTime < 350) {
      ratingElement.textContent = getText('reactionRatingAverage');
    } else {
      ratingElement.textContent = getText('reactionRatingSlow');
    }
  }

  function handleEarlyClick() {
    reactionTest.isActive = false;
    clearTimeout(reactionTest.timeout);
    document.getElementById('reactionWaiting').style.display = 'none';
    document.getElementById('reactionTooEarly').style.display = 'block';
  }

  function resetReactionTest() {
    clearTimeout(reactionTest.timeout);
    reactionTest.isActive = false;
    reactionTest.startTime = 0;
    reactionTest.delay = 0;
    reactionTest.scheduledTime = 0;

    document.getElementById('reactionWaiting').style.display = 'none';
    document.getElementById('reactionReady').style.display = 'none';
    document.getElementById('reactionResults').style.display = 'none';
    document.getElementById('reactionTooEarly').style.display = 'none';
    document.getElementById('reactionInstructions').style.display = 'block';
  }

  function sendMessage(event) {
    event.preventDefault();

    const getText = window.getText || ((key) => key);
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subjectSelect = document.getElementById('contactSubject');
    const subjectValue = subjectSelect ? subjectSelect.value : '';
    const subjectText = subjectSelect
      ? subjectSelect.options[subjectSelect.selectedIndex]?.textContent || ''
      : '';
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !subjectValue || !message) {
      alert(getText('fillAllFields'));
      return;
    }

    const finalSubject = subjectText || subjectValue;
    const emailBody = encodeURIComponent(
      `${getText('yourName')}: ${name}\n${getText('email')}: ${email}\n\n${getText('message')}:\n${message}`,
    );

    const mailtoLink = `mailto:faceit.analyze@gmail.com?subject=${encodeURIComponent(finalSubject)}&body=${emailBody}`;

    try {
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      alert(
        'Your email app should open now. If nothing happens, configure a default mail app for mailto: links in Windows (Default apps -> Email) or use the address faceit.analyze@gmail.com.',
      );
    } catch (e) {
      console.error('Failed to open mail client:', e);
      alert('Could not open your email app. Please email us at faceit.analyze@gmail.com.');
    }
  }

  window.AppModals = {
    closeAllModals,
    openSupportModal,
    openContactModal,
    openReactionTestModal,
    initReactionTest,
    startReactionTest,
    handleReactionClick,
    handleEarlyClick,
    resetReactionTest,
    sendMessage,
  };
})();
