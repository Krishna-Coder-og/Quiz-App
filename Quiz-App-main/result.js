// Comprehensive Results and Detailed Performance Analytics Engine

let quizResults = null;
let currentFilter = 'all'; // 'all' | 'wrong' | 'correct' | 'skipped'

document.addEventListener('DOMContentLoaded', () => {
    loadResultsData();
    renderScoreCard();
    renderStatsGrid();
    renderQuestionReview();
    setupFilterTabs();
    setupActionButtons();
    launchConfetti();
});

function loadResultsData() {
    const raw = localStorage.getItem('quiz_results');
    if (raw) {
        try {
            quizResults = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse quiz_results:', e);
        }
    }

    // Fallback if accessed directly or from previous version
    if (!quizResults) {
        const legacyCorr = parseInt(localStorage.getItem('corr') || '0', 10);
        const legacyWro = parseInt(localStorage.getItem('wro') || '0', 10);
        const total = legacyCorr + legacyWro > 0 ? legacyCorr + legacyWro : 80;
        
        quizResults = {
            totalQuestions: total,
            correctCount: legacyCorr,
            wrongCount: legacyWro,
            skippedCount: Math.max(0, total - (legacyCorr + legacyWro)),
            scorePercentage: total > 0 ? Math.round((legacyCorr / total) * 100) : 0,
            accuracy: (legacyCorr + legacyWro) > 0 ? Math.round((legacyCorr / (legacyCorr + legacyWro)) * 100) : 0,
            timeElapsed: 0,
            quizMode: 'exam',
            sourceFileName: 'mcq_80_questions.csv',
            breakdown: []
        };
    }
}

function renderScoreCard() {
    if (!quizResults) return;

    const percent = quizResults.scorePercentage || 0;
    const scoreVal = quizResults.correctCount || 0;
    const totalVal = quizResults.totalQuestions || 80;

    // Elements
    const elVerdict = document.getElementById('verdict-badge');
    const elPercent = document.getElementById('gauge-percent');
    const elScoreText = document.getElementById('score-headline');
    const elSubText = document.getElementById('score-subheadline');
    const elGaugeCircle = document.getElementById('gauge-progress-circle');

    // Verdict determination
    let verdictText = '📚 Keep Practicing!';
    let messageText = 'Review your incorrect questions below to master these concepts.';
    let verdictColor = 'var(--text-dim)';

    if (percent >= 90) {
        verdictText = '🏆 Master of General Studies!';
        messageText = 'Outstanding performance! You have exceptional mastery over this 80-question syllabus.';
        verdictColor = 'var(--success)';
    } else if (percent >= 75) {
        verdictText = '🌟 Excellent Achievement!';
        messageText = 'Great command across History, Polity, Geography, Science, and Aptitude topics!';
        verdictColor = 'var(--primary-light)';
    } else if (percent >= 50) {
        verdictText = '👍 Good Effort!';
        messageText = 'Solid baseline knowledge. Focus on reviewing your missed questions to boost your score.';
        verdictColor = 'var(--warning)';
    }

    if (elVerdict) {
        elVerdict.textContent = verdictText;
        elVerdict.style.borderColor = verdictColor;
    }

    if (elScoreText) {
        elScoreText.textContent = `${scoreVal} / ${totalVal} Correct`;
    }

    if (elSubText) {
        elSubText.textContent = messageText;
    }

    // Animate percentage text count-up
    if (elPercent) {
        let currentP = 0;
        const duration = 1200;
        const stepTime = 20;
        const step = percent / (duration / stepTime);

        const counter = setInterval(() => {
            currentP += step;
            if (currentP >= percent) {
                currentP = percent;
                clearInterval(counter);
            }
            elPercent.textContent = `${Math.round(currentP)}%`;
        }, stepTime);
    }

    // Animate Circular Gauge stroke-dashoffset (Circumference = 2 * PI * 70 ≈ 440)
    if (elGaugeCircle) {
        const circumference = 440;
        const offset = circumference - (circumference * percent) / 100;
        setTimeout(() => {
            elGaugeCircle.style.strokeDashoffset = offset.toString();
        }, 100);
    }
}

function renderStatsGrid() {
    if (!quizResults) return;

    const elCorrect = document.getElementById('stat-correct-val');
    const elWrong = document.getElementById('stat-wrong-val');
    const elSkipped = document.getElementById('stat-skipped-val');
    const elAccuracy = document.getElementById('stat-accuracy-val');
    const elTime = document.getElementById('stat-time-val');

    if (elCorrect) elCorrect.textContent = quizResults.correctCount;
    if (elWrong) elWrong.textContent = quizResults.wrongCount;
    if (elSkipped) elSkipped.textContent = quizResults.skippedCount;
    if (elAccuracy) elAccuracy.textContent = `${quizResults.accuracy}%`;

    if (elTime) {
        const secs = quizResults.timeElapsed || 0;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        elTime.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    // Update filter badge counts
    const btnAll = document.getElementById('tab-all');
    const btnWrong = document.getElementById('tab-wrong');
    const btnCorrect = document.getElementById('tab-correct');
    const btnSkipped = document.getElementById('tab-skipped');

    if (btnAll) btnAll.textContent = `All (${quizResults.totalQuestions})`;
    if (btnWrong) btnWrong.textContent = `Incorrect (${quizResults.wrongCount})`;
    if (btnCorrect) btnCorrect.textContent = `Correct (${quizResults.correctCount})`;
    if (btnSkipped) btnSkipped.textContent = `Skipped (${quizResults.skippedCount})`;

    // Hide or show 'Practice Missed' button
    const btnPracticeMissed = document.getElementById('btn-practice-missed');
    if (btnPracticeMissed) {
        const missedCount = quizResults.wrongCount + quizResults.skippedCount;
        if (missedCount > 0) {
            btnPracticeMissed.style.display = 'inline-flex';
            btnPracticeMissed.innerHTML = `<span>🎯 Practice Missed (${missedCount})</span>`;
        } else {
            btnPracticeMissed.style.display = 'none';
        }
    }
}

function renderQuestionReview() {
    const listContainer = document.getElementById('review-cards-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const breakdown = quizResults.breakdown || [];
    if (breakdown.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                Detailed breakdown is available when taking a full quiz in this browser session.
            </div>
        `;
        return;
    }

    const filtered = breakdown.filter(item => {
        if (currentFilter === 'correct') return item.isCorrect;
        if (currentFilter === 'wrong') return !item.isCorrect && !item.isSkipped;
        if (currentFilter === 'skipped') return item.isSkipped;
        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-dim);">
                No questions found under this filter.
            </div>
        `;
        return;
    }

    const letters = ['A', 'B', 'C', 'D'];

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'review-item-card';

        let statusClass = 'skipped';
        let statusText = 'Skipped ⊘';

        if (item.isCorrect) {
            statusClass = 'correct';
            statusText = 'Correct ✓';
            card.classList.add('is-correct');
        } else if (!item.isSkipped) {
            statusClass = 'wrong';
            statusText = 'Incorrect ✕';
            card.classList.add('is-wrong');
        } else {
            card.classList.add('is-skipped');
        }

        const optionsHtml = item.options.map((optText, optIdx) => {
            const letter = letters[optIdx];
            let boxClass = 'review-opt-box';

            if (optIdx === item.correctIndex) {
                boxClass += ' correct-ans';
            } else if (item.userChoiceIndex === optIdx && !item.isCorrect) {
                boxClass += ' user-wrong';
            }

            return `
                <div class="${boxClass}">
                    <strong>${letter}.</strong>
                    <span>${escapeHTML(optText)}</span>
                    ${optIdx === item.correctIndex ? '<span style="margin-left:auto; font-size:1.1rem;">✓</span>' : ''}
                    ${item.userChoiceIndex === optIdx && !item.isCorrect ? '<span style="margin-left:auto; font-size:1.1rem;">✕</span>' : ''}
                </div>
            `;
        }).join('');

        const contextHtml = item.context && item.context.html ? `<div class="stimulus-container">${item.context.html}</div>` : '';
        const sectionHtml = item.section ? `<span class="section-badge">${escapeHTML(item.section)}</span>` : '';

        card.innerHTML = `
            <div class="review-item-top">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="review-q-num">Question ${item.displayNumber} of ${breakdown.length}</span>
                    ${sectionHtml}
                </div>
                <span class="review-status-pill ${statusClass}">${statusText}</span>
            </div>
            ${contextHtml}
            <div class="review-q-text">${escapeHTML(item.question)}</div>
            <div class="review-options-grid">
                ${optionsHtml}
            </div>
        `;

        listContainer.appendChild(card);
    });
}

function setupFilterTabs() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderQuestionReview();
        });
    });
}

function setupActionButtons() {
    const btnRetake = document.getElementById('btn-retake');
    const btnPracticeMissed = document.getElementById('btn-practice-missed');
    const btnPrint = document.getElementById('btn-print');
    const btnHome = document.getElementById('btn-home');

    if (btnRetake) {
        btnRetake.addEventListener('click', () => {
            // Reset answer cache and restart quiz
            localStorage.removeItem('quiz_answers');
            localStorage.removeItem('quiz_marked');
            localStorage.removeItem('quiz_current_index');
            window.location.href = 'Questions.html';
        });
    }

    if (btnPracticeMissed) {
        btnPracticeMissed.addEventListener('click', () => {
            if (!quizResults || !quizResults.breakdown) return;

            const missedQuestions = quizResults.breakdown
                .filter(item => !item.isCorrect)
                .map((item, idx) => ({
                    id: item.id,
                    displayNumber: idx + 1,
                    question: item.question,
                    options: item.options,
                    correctLetter: item.correctLetter,
                    correctIndex: item.correctIndex,
                    correctText: item.correctText
                }));

            if (missedQuestions.length === 0) {
                alert('Congratulations! You got every question right. No missed questions to practice.');
                return;
            }

            localStorage.setItem('quiz_questions', JSON.stringify(missedQuestions));
            localStorage.setItem('quiz_mode', 'practice'); // Practice mode with instant feedback
            localStorage.setItem('quiz_duration', '0'); // Untimed
            localStorage.removeItem('quiz_answers');
            localStorage.removeItem('quiz_marked');
            localStorage.removeItem('quiz_current_index');

            window.location.href = 'Questions.html';
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnHome) {
        btnHome.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Lightweight Celebration Confetti
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.4 - 50,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 4 - 2,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 6 - 3
        });
    }

    let animationFrame;
    let startTime = Date.now();

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (Date.now() - startTime < 4000) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    render();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
