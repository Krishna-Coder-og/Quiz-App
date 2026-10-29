// Comprehensive Quiz Execution Engine for UPSSSC PET 2026 Master Mock Test

// State Variables
let questions = [];
let quizMode = 'full'; // 'full' | 'sprint' | 'practice'
let currentIndex = 0;
let userAnswers = {}; // { [qIndex]: optionIndex (0-3) }
let markedReview = {}; // { [qIndex]: boolean }
let practiceChecked = {}; // { [qIndex]: boolean }

// Timing State: Strict 2 Hours (7200 seconds) - No option to alter
let quizDuration = 7200; // in seconds; 0 = untimed in practice mode
let timeRemaining = 7200;
let timeElapsed = 0;
let timerTimer = null;
let isPaused = false;

// DOM Elements Cache
let elQuestionPill, elTotalQNum, elQuestionText, elOptionsContainer, elSectionPill, elStimulusContainer;
let elProgressBar, elProgressText, elProgressPercent;
let elTimerDisplay, elTimerBox, elTimerIcon;
let elPrevBtn, elNextBtn, elNextBtnText, elClearBtn, elMarkReviewBtn;
let elMatrixGrid, elStatAnswered, elStatReview, elStatSkipped;
let elModal, elModalAns, elModalRev, elModalUnans;
let elPracticeCheckBtn, elPracticeFeedback;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    loadQuizSession();
    buildQuestionMatrix();
    renderCurrentQuestion();
    startTimer();
    setupEventListeners();
    setupKeyboardShortcuts();
});

function initDOMElements() {
    elQuestionPill = document.getElementById('current-q-num');
    elTotalQNum = document.getElementById('total-q-num');
    elQuestionText = document.getElementById('question-text');
    elOptionsContainer = document.getElementById('options-container');
    elSectionPill = document.getElementById('question-section-pill');
    elStimulusContainer = document.getElementById('stimulus-container');
    
    elProgressBar = document.getElementById('progress-bar-fill');
    elProgressText = document.getElementById('progress-question-text');
    elProgressPercent = document.getElementById('progress-percentage-text');
    
    elTimerDisplay = document.getElementById('timer-display');
    elTimerBox = document.getElementById('timer-box');
    elTimerIcon = document.getElementById('timer-icon');
    
    elPrevBtn = document.getElementById('prev-btn');
    elNextBtn = document.getElementById('next-btn');
    elNextBtnText = document.getElementById('next-btn-text');
    elClearBtn = document.getElementById('clear-btn');
    elMarkReviewBtn = document.getElementById('mark-review-btn');
    
    elMatrixGrid = document.getElementById('matrix-grid');
    elStatAnswered = document.getElementById('stat-answered');
    elStatReview = document.getElementById('stat-review');
    elStatSkipped = document.getElementById('stat-skipped');
    
    elModal = document.getElementById('confirm-modal');
    elModalAns = document.getElementById('modal-answered-count');
    elModalRev = document.getElementById('modal-review-count');
    elModalUnans = document.getElementById('modal-unanswered-count');
    
    elPracticeCheckBtn = document.getElementById('practice-check-btn');
    elPracticeFeedback = document.getElementById('practice-feedback');
}

// Load questions from localStorage with fallback to DEFAULT_QUIZ_DATA
function loadQuizSession() {
    const rawQuestions = localStorage.getItem('quiz_questions');
    if (rawQuestions) {
        try {
            questions = JSON.parse(rawQuestions);
        } catch (e) {
            console.error('Failed to parse quiz_questions from storage:', e);
        }
    }

    // Fallback to pre-bundled questions if storage was empty
    if (!questions || questions.length === 0) {
        if (typeof DEFAULT_QUIZ_DATA !== 'undefined' && Array.isArray(DEFAULT_QUIZ_DATA)) {
            questions = DEFAULT_QUIZ_DATA.map((q, i) => ({
                ...q,
                displayNumber: i + 1
            }));
            console.log('Loaded fallback DEFAULT_QUIZ_DATA');
        } else {
            alert('No questions found! Returning to setup page.');
            window.location.href = 'index.html';
            return;
        }
    }

    quizMode = localStorage.getItem('quiz_mode') || 'full';
    
    // STRICT TIME ENFORCEMENT: 2 Hours (7200s) for all timed exams. Practice is untimed (0).
    quizDuration = (quizMode === 'practice') ? 0 : 7200;

    const savedElapsed = localStorage.getItem('quiz_elapsed_time');
    if (savedElapsed) {
        timeElapsed = parseInt(savedElapsed, 10) || 0;
    }
    
    timeRemaining = quizDuration > 0 ? Math.max(0, quizDuration - timeElapsed) : 0;

    // Load any saved in-progress answers
    const savedAns = localStorage.getItem('quiz_answers');
    if (savedAns) {
        try { userAnswers = JSON.parse(savedAns); } catch(e){}
    }

    const savedRev = localStorage.getItem('quiz_marked');
    if (savedRev) {
        try { markedReview = JSON.parse(savedRev); } catch(e){}
    }

    const savedIdx = localStorage.getItem('quiz_current_index');
    if (savedIdx) {
        currentIndex = Math.min(parseInt(savedIdx, 10), questions.length - 1);
    }

    // Update Mode Badge in topbar
    const modeBadge = document.getElementById('quiz-mode-badge');
    if (modeBadge) {
        if (quizMode === 'practice') {
            modeBadge.textContent = 'Practice Mode';
            modeBadge.style.borderColor = 'var(--success)';
            modeBadge.style.color = 'var(--success)';
        } else if (quizMode === 'sprint') {
            modeBadge.textContent = 'Sprint 25';
        } else {
            modeBadge.textContent = `2-Hr Exam (${questions.length} Qs)`;
        }
    }

    if (quizMode === 'practice' && elPracticeCheckBtn) {
        elPracticeCheckBtn.style.display = 'inline-flex';
    }
}

// Build the Question Navigator Matrix
function buildQuestionMatrix() {
    if (!elMatrixGrid) return;
    elMatrixGrid.innerHTML = '';

    questions.forEach((q, idx) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'matrix-cell';
        cell.id = `matrix-cell-${idx}`;
        cell.textContent = idx + 1;
        cell.title = `Jump to Question ${idx + 1} (${q.section || 'General'})`;
        cell.setAttribute('aria-label', `Question ${idx + 1}`);

        cell.addEventListener('click', () => {
            jumpToQuestion(idx);
        });

        elMatrixGrid.appendChild(cell);
    });

    updateMatrixBadges();
}

// Jump to a specific question
function jumpToQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;
    currentIndex = idx;
    localStorage.setItem('quiz_current_index', currentIndex.toString());
    renderCurrentQuestion();
}

// Render the active question on screen
function renderCurrentQuestion() {
    if (!questions || questions.length === 0) return;
    const q = questions[currentIndex];

    // Update Question Card top badges
    if (elQuestionPill) elQuestionPill.textContent = (currentIndex + 1);
    if (elTotalQNum) elTotalQNum.textContent = questions.length;
    if (elQuestionText) elQuestionText.textContent = q.question;

    // Update Section Badge
    if (elSectionPill) {
        elSectionPill.textContent = q.section || 'General Knowledge';
    }

    // Render Data Interpretation / Reading Comprehension Stimulus (Tables & Passages)
    if (elStimulusContainer) {
        if (q.context && q.context.html) {
            elStimulusContainer.innerHTML = q.context.html;
            elStimulusContainer.style.display = 'block';
        } else {
            elStimulusContainer.innerHTML = '';
            elStimulusContainer.style.display = 'none';
        }
    }

    // Render Options
    if (elOptionsContainer) {
        elOptionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        const currentAns = userAnswers[currentIndex];
        const isRevealed = quizMode === 'practice' && practiceChecked[currentIndex];

        q.options.forEach((optText, optIdx) => {
            const optItem = document.createElement('div');
            optItem.className = 'option-item';
            optItem.id = `option-item-${optIdx}`;

            if (currentAns === optIdx) {
                optItem.classList.add('selected');
            }

            // In Practice Mode with revealed answers
            if (isRevealed) {
                if (optIdx === q.correctIndex) {
                    optItem.classList.add('is-correct');
                } else if (currentAns === optIdx && currentAns !== q.correctIndex) {
                    optItem.classList.add('is-wrong');
                }
            }

            optItem.innerHTML = `
                <div class="option-key">${letters[optIdx]}</div>
                <div class="option-label-text">${escapeHTML(optText)}</div>
            `;

            optItem.addEventListener('click', () => {
                selectOption(optIdx);
            });

            elOptionsContainer.appendChild(optItem);
        });
    }

    // Practice mode feedback banner
    if (elPracticeFeedback) {
        if (quizMode === 'practice' && practiceChecked[currentIndex]) {
            const userChoice = userAnswers[currentIndex];
            const isCorrect = userChoice === q.correctIndex;
            elPracticeFeedback.style.display = 'flex';
            if (isCorrect) {
                elPracticeFeedback.className = 'practice-feedback-banner success';
                elPracticeFeedback.innerHTML = `✓ Correct! Option ${q.correctLetter} is the right answer.`;
            } else {
                elPracticeFeedback.className = 'practice-feedback-banner danger';
                elPracticeFeedback.innerHTML = `✕ Incorrect. The correct answer is Option ${q.correctLetter} (${escapeHTML(q.correctText)}).`;
            }
        } else {
            elPracticeFeedback.style.display = 'none';
        }
    }

    // Update Mark for Review button state
    if (elMarkReviewBtn) {
        const isMarked = !!markedReview[currentIndex];
        elMarkReviewBtn.classList.toggle('marked', isMarked);
        const starIcon = document.getElementById('review-star-icon');
        const reviewText = document.getElementById('review-text');
        if (starIcon) starIcon.textContent = isMarked ? '★' : '☆';
        if (reviewText) reviewText.textContent = isMarked ? 'Marked for Review' : 'Mark for Review';
    }

    // Update Navigation Buttons
    if (elPrevBtn) {
        elPrevBtn.disabled = currentIndex === 0;
    }

    if (elNextBtnText) {
        elNextBtnText.textContent = (currentIndex === questions.length - 1) ? 'Review / Submit' : 'Next Question';
    }

    updateProgressBar();
    updateMatrixBadges();

    // Scroll smoothly to question top on mobile/tablet
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Select an option (0-3)
function selectOption(optIdx) {
    userAnswers[currentIndex] = optIdx;
    localStorage.setItem('quiz_answers', JSON.stringify(userAnswers));

    // Remove selection from siblings & add to selected
    const allOptions = document.querySelectorAll('.option-item');
    allOptions.forEach((opt, idx) => {
        opt.classList.toggle('selected', idx === optIdx);
    });

    // If practice mode, reset instant feedback state until they check
    if (quizMode === 'practice') {
        practiceChecked[currentIndex] = false;
        if (elPracticeFeedback) elPracticeFeedback.style.display = 'none';
    }

    updateMatrixBadges();
    updateProgressBar();
}

// Clear selected option
function clearSelection() {
    if (userAnswers.hasOwnProperty(currentIndex)) {
        delete userAnswers[currentIndex];
        localStorage.setItem('quiz_answers', JSON.stringify(userAnswers));
    }
    if (practiceChecked.hasOwnProperty(currentIndex)) {
        delete practiceChecked[currentIndex];
    }
    renderCurrentQuestion();
}

// Update Top Progress Bar and percentage indicators
function updateProgressBar() {
    const total = questions.length;
    if (total === 0) return;

    const currentNum = currentIndex + 1;
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = Math.round((currentNum / total) * 100);

    if (elProgressText) {
        elProgressText.textContent = `Question ${currentNum} of ${total}`;
    }

    if (elProgressPercent) {
        elProgressPercent.textContent = `${answeredCount} of ${total} Answered (${Math.round((answeredCount/total)*100)}%)`;
    }

    if (elProgressBar) {
        elProgressBar.style.width = `${progressPercent}%`;
    }
}

// Toggle Mark for Review
function toggleMarkReview() {
    if (markedReview[currentIndex]) {
        delete markedReview[currentIndex];
    } else {
        markedReview[currentIndex] = true;
    }
    localStorage.setItem('quiz_marked', JSON.stringify(markedReview));
    renderCurrentQuestion();
}

// Update the Matrix Grid styles and counters
function updateMatrixBadges() {
    let answeredCount = 0;
    let reviewCount = 0;

    questions.forEach((_, idx) => {
        const cell = document.getElementById(`matrix-cell-${idx}`);
        if (!cell) return;

        cell.className = 'matrix-cell';

        const isAnswered = userAnswers.hasOwnProperty(idx);
        const isMarked = !!markedReview[idx];
        const isCurrent = idx === currentIndex;

        if (isAnswered) {
            cell.classList.add('answered');
            answeredCount++;
        }
        if (isMarked) {
            cell.classList.add('marked-review');
            reviewCount++;
        }
        if (isCurrent) {
            cell.classList.add('current');
        }
    });

    const skippedCount = questions.length - answeredCount;

    if (elStatAnswered) elStatAnswered.textContent = `${answeredCount} Ans`;
    if (elStatReview) elStatReview.textContent = `${reviewCount} Rev`;
    if (elStatSkipped) elStatSkipped.textContent = `${skippedCount} Left`;
}

// Timer Logic - Enforces 2-Hour Strict Countdown (02:00:00 -> 00:00:00)
function startTimer() {
    if (timerTimer) clearInterval(timerTimer);

    updateTimerDisplay();

    timerTimer = setInterval(() => {
        if (isPaused) return;

        timeElapsed++;
        localStorage.setItem('quiz_elapsed_time', timeElapsed.toString());

        if (quizDuration > 0) {
            // Strict 2-Hour Countdown mode
            timeRemaining = Math.max(0, quizDuration - timeElapsed);
            if (timeRemaining <= 0) {
                timeRemaining = 0;
                updateTimerDisplay();
                clearInterval(timerTimer);
                autoSubmitExam();
                return;
            }
        } else {
            // Untimed count-up mode for practice
            timeRemaining = timeElapsed;
        }

        updateTimerDisplay();
    }, 1000);
}

// Format timer as HH:MM:SS with warning states
function updateTimerDisplay() {
    if (!elTimerDisplay) return;

    const secondsToFormat = quizDuration > 0 ? timeRemaining : timeElapsed;
    const hours = Math.floor(secondsToFormat / 3600);
    const mins = Math.floor((secondsToFormat % 3600) / 60);
    const secs = secondsToFormat % 60;

    let formatted;
    if (quizDuration > 0 || hours > 0) {
        formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    elTimerDisplay.textContent = formatted;

    // Visual warning when under 10 minutes in timed exam
    if (quizDuration > 0 && timeRemaining <= 600) {
        elTimerBox.classList.add('warning');
        if (elTimerIcon) elTimerIcon.textContent = '⚠️';
    } else {
        elTimerBox.classList.remove('warning');
        if (elTimerIcon) elTimerIcon.textContent = '⏳';
    }
}

// Auto submit when time runs out
function autoSubmitExam() {
    alert("⏰ 2-Hour Time Limit Expired! Your exam session has ended. Calculating your final score and analytics now...");
    finalizeAndSubmit();
}

// Setup Event Listeners for Buttons
function setupEventListeners() {
    if (elPrevBtn) {
        elPrevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                localStorage.setItem('quiz_current_index', currentIndex.toString());
                renderCurrentQuestion();
            }
        });
    }

    if (elNextBtn) {
        elNextBtn.addEventListener('click', () => {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                localStorage.setItem('quiz_current_index', currentIndex.toString());
                renderCurrentQuestion();
            } else {
                openSubmitModal();
            }
        });
    }

    if (elClearBtn) {
        elClearBtn.addEventListener('click', clearSelection);
    }

    if (elMarkReviewBtn) {
        elMarkReviewBtn.addEventListener('click', toggleMarkReview);
    }

    const finishBtn = document.getElementById('finish-quiz-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', openSubmitModal);
    }

    const modalCancel = document.getElementById('modal-cancel-btn');
    if (modalCancel) {
        modalCancel.addEventListener('click', closeSubmitModal);
    }

    const modalConfirm = document.getElementById('modal-confirm-btn');
    if (modalConfirm) {
        modalConfirm.addEventListener('click', finalizeAndSubmit);
    }

    // Toggle Matrix Sidebar on mobile
    const toggleMatrixBtn = document.getElementById('toggle-matrix-btn');
    const sidebar = document.getElementById('matrix-sidebar');
    if (toggleMatrixBtn && sidebar) {
        toggleMatrixBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const isOpen = sidebar.classList.contains('open');
            const navText = document.getElementById('nav-btn-text');
            if (navText) navText.textContent = isOpen ? 'Close' : 'Grid';
        });
    }

    // Practice mode Instant Check Answer button
    if (elPracticeCheckBtn) {
        elPracticeCheckBtn.addEventListener('click', () => {
            practiceChecked[currentIndex] = true;
            renderCurrentQuestion();
        });
    }
}

// Comprehensive Keyboard Navigation
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is inside an input or textarea
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const key = e.key.toUpperCase();

        // Option selection keys: A, B, C, D (or 1, 2, 3, 4)
        const keyMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
        if (keyMap.hasOwnProperty(key)) {
            selectOption(keyMap[key]);
            return;
        }

        // Arrow navigation
        if (e.key === 'ArrowLeft') {
            if (currentIndex > 0) {
                currentIndex--;
                localStorage.setItem('quiz_current_index', currentIndex.toString());
                renderCurrentQuestion();
            }
        } else if (e.key === 'ArrowRight') {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                localStorage.setItem('quiz_current_index', currentIndex.toString());
                renderCurrentQuestion();
            }
        }

        // Mark for review shortcut: 'M'
        if (key === 'M') {
            toggleMarkReview();
        }

        // Submit exam: Ctrl + Enter
        if (e.ctrlKey && e.key === 'Enter') {
            openSubmitModal();
        }

        // Escape: close modal
        if (e.key === 'Escape' && elModal && elModal.classList.contains('active')) {
            closeSubmitModal();
        }
    });
}

// Open and Close Submit Confirmation Modal
function openSubmitModal() {
    if (!elModal) return;

    const answeredCount = Object.keys(userAnswers).length;
    const reviewCount = Object.keys(markedReview).length;
    const unansweredCount = questions.length - answeredCount;

    if (elModalAns) elModalAns.textContent = answeredCount;
    if (elModalRev) elModalRev.textContent = reviewCount;
    if (elModalUnans) elModalUnans.textContent = unansweredCount;

    elModal.classList.add('active');
}

function closeSubmitModal() {
    if (elModal) elModal.classList.remove('active');
}

// Finalize Scoring and Navigate to Results Page
function finalizeAndSubmit() {
    if (timerTimer) clearInterval(timerTimer);

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const questionBreakdown = questions.map((q, idx) => {
        const hasAnswered = userAnswers.hasOwnProperty(idx);
        const userChoiceIdx = hasAnswered ? userAnswers[idx] : null;
        const userChoiceLetter = userChoiceIdx !== null ? String.fromCharCode(65 + userChoiceIdx) : null;
        const userChoiceText = userChoiceIdx !== null ? q.options[userChoiceIdx] : null;

        const isCorrect = userChoiceIdx === q.correctIndex;
        const isSkipped = !hasAnswered;

        if (isSkipped) {
            skippedCount++;
        } else if (isCorrect) {
            correctCount++;
        } else {
            wrongCount++;
        }

        return {
            id: q.id,
            displayNumber: idx + 1,
            section: q.section || 'General Studies',
            context: q.context || null,
            question: q.question,
            options: q.options,
            correctLetter: q.correctLetter,
            correctIndex: q.correctIndex,
            correctText: q.correctText,
            userChoiceIndex: userChoiceIdx,
            userChoiceLetter: userChoiceLetter,
            userChoiceText: userChoiceText,
            isCorrect: isCorrect,
            isSkipped: isSkipped,
            wasMarkedReview: !!markedReview[idx]
        };
    });

    const totalQuestions = questions.length;
    const accuracy = (correctCount + wrongCount) > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    const quizResults = {
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        wrongCount: wrongCount,
        skippedCount: skippedCount,
        scorePercentage: scorePercentage,
        accuracy: accuracy,
        timeElapsed: timeElapsed,
        quizMode: quizMode,
        timestamp: new Date().toISOString(),
        sourceFileName: localStorage.getItem('quiz_source_name') || 'mock_quiz.pdf',
        breakdown: questionBreakdown
    };

    try {
        localStorage.setItem('quiz_results', JSON.stringify(quizResults));
        // Backwards compatibility with original app keys
        localStorage.setItem('corr', correctCount.toString());
        localStorage.setItem('wro', wrongCount.toString());
    } catch (e) {
        console.error('Failed to store quiz_results:', e);
    }

    // Redirect to Result page
    window.location.href = 'result.html';
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
