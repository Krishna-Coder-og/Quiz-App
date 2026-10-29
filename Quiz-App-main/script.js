// Quiz Setup and File Management Engine for UPSSSC PET 2026 Master Mock Test

// Global state
let currentQuestions = [];
let loadedFileName = 'mock_quiz.pdf';

// Initialize with default 95 questions from mock_quiz.pdf
document.addEventListener('DOMContentLoaded', () => {
    if (typeof DEFAULT_QUIZ_DATA !== 'undefined' && Array.isArray(DEFAULT_QUIZ_DATA)) {
        currentQuestions = [...DEFAULT_QUIZ_DATA];
        console.log(`Loaded ${currentQuestions.length} questions from mock_quiz.pdf`);
        updateStatusBadge(loadedFileName, currentQuestions.length);
    } else {
        console.warn('DEFAULT_QUIZ_DATA not found. Waiting for user upload.');
    }

    setupModeSelector();
    setupDropZone();
    setupActionButtons();
});

// Setup visual active states for quiz modes
function setupModeSelector() {
    const modeOptions = document.querySelectorAll('.mode-option');

    modeOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            modeOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const radio = opt.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
}

// RFC 4180 Compliant CSV Parser that preserves UTF-8 Hindi, quotes & special characters
function parseCSV(text) {
    if (!text) return [];
    
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (c === '"' && next === '"') {
                field += '"';
                i++; // Skip escaped quote
            } else if (c === '"') {
                inQuotes = false;
            } else {
                field += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push(field.trim());
                field = '';
            } else if (c === '\r' && next === '\n') {
                row.push(field.trim());
                rows.push(row);
                row = [];
                field = '';
                i++;
            } else if (c === '\n' || c === '\r') {
                row.push(field.trim());
                rows.push(row);
                row = [];
                field = '';
            } else {
                field += c;
            }
        }
    }
    if (field || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
    }

    // Filter out empty rows
    return rows.filter(r => r.some(cell => cell.length > 0));
}

// Convert parsed CSV rows into Quiz Question Objects
function processCSVQuestions(rows) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map(h => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
    
    let idIdx = headers.findIndex(h => h.includes('id') || h.includes('qnum') || h.includes('no'));
    let qIdx = headers.findIndex(h => h.includes('question') || h.includes('prompt') || h.includes('text'));
    let optAIdx = headers.findIndex(h => h === 'a' || h === 'optiona' || h.includes('opta'));
    let optBIdx = headers.findIndex(h => h === 'b' || h === 'optionb' || h.includes('optb'));
    let optCIdx = headers.findIndex(h => h === 'c' || h === 'optionc' || h.includes('optc'));
    let optDIdx = headers.findIndex(h => h === 'd' || h === 'optiond' || h.includes('optd'));
    let ansIdx = headers.findIndex(h => h.includes('correct') || h.includes('answer') || h.includes('ans'));

    // Fallback if headers are standard 0 to 7
    if (qIdx === -1) qIdx = 1;
    if (optAIdx === -1) optAIdx = 2;
    if (optBIdx === -1) optBIdx = 3;
    if (optCIdx === -1) optCIdx = 4;
    if (optDIdx === -1) optDIdx = 5;
    if (ansIdx === -1) ansIdx = 6;

    const questions = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 4) continue;

        const qText = row[qIdx] || '';
        const optA = row[optAIdx] || '';
        const optB = row[optBIdx] || '';
        const optC = row[optCIdx] || '';
        const optD = row[optDIdx] || '';
        const rawAns = (row[ansIdx] || '').trim().toUpperCase();

        if (!qText.trim()) continue;

        const options = [optA, optB, optC, optD];

        let correctIdx = 0;
        let correctLetter = 'A';

        if (rawAns.includes('A') || rawAns === '0') {
            correctIdx = 0; correctLetter = 'A';
        } else if (rawAns.includes('B') || rawAns === '1') {
            correctIdx = 1; correctLetter = 'B';
        } else if (rawAns.includes('C') || rawAns === '2') {
            correctIdx = 2; correctLetter = 'C';
        } else if (rawAns.includes('D') || rawAns === '3') {
            correctIdx = 3; correctLetter = 'D';
        } else {
            const foundIdx = options.findIndex(o => o.trim().toLowerCase() === rawAns.toLowerCase());
            if (foundIdx !== -1) {
                correctIdx = foundIdx;
                correctLetter = ['A', 'B', 'C', 'D'][foundIdx];
            }
        }

        questions.push({
            id: idIdx !== -1 && row[idIdx] ? parseInt(row[idIdx], 10) : i,
            question: qText,
            options: options,
            correctLetter: correctLetter,
            correctIndex: correctIdx,
            correctText: options[correctIdx] || ''
        });
    }

    return questions;
}

// Drag & Drop / File Input Handling
function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csvFile');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });
}

function handleFileUpload(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a valid CSV file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        try {
            const rows = parseCSV(text);
            const parsed = processCSVQuestions(rows);

            if (parsed.length === 0) {
                alert('No valid multiple choice questions found in this CSV.');
                return;
            }

            currentQuestions = parsed;
            loadedFileName = file.name;
            updateStatusBadge(loadedFileName, currentQuestions.length);
            console.log(`Successfully imported ${currentQuestions.length} questions from ${file.name}`);
        } catch (err) {
            console.error('CSV Parsing error:', err);
            alert('Failed to parse CSV file. Please verify format.');
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function updateStatusBadge(fileName, count) {
    const statusText = document.getElementById('upload-status-text');
    const badgeFileName = document.getElementById('badge-file-name');
    const loadedBadge = document.getElementById('loaded-info-badge');
    const sourceBadge = document.getElementById('source-badge');

    if (statusText) statusText.textContent = `Active Bank: "${fileName}" (${count} Questions)`;
    if (badgeFileName) badgeFileName.textContent = fileName;
    if (sourceBadge) sourceBadge.innerHTML = `<span id="badge-file-name">${fileName}</span> (${count} Ready)`;
    if (loadedBadge) {
        loadedBadge.innerHTML = `✓ ${count} Questions Ready (Strict 2-Hour Mode)`;
        loadedBadge.style.display = 'inline-block';
    }
}

// CTA Action Buttons
function setupActionButtons() {
    const startBtn = document.getElementById('start-btn');
    const previewBtn = document.getElementById('preview-btn');

    if (startBtn) {
        startBtn.addEventListener('click', startQuiz);
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', previewBank);
    }
}

// Fisher-Yates array shuffle
function shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz() {
    if (!currentQuestions || currentQuestions.length === 0) {
        alert('No questions loaded. Please refresh to load questions from mock_quiz.pdf.');
        return;
    }

    const selectedMode = document.querySelector('input[name="quizMode"]:checked')?.value || 'full';
    
    // STRICT TIME LIMIT: Exactly 2 Hours (7200 Seconds / 120 Minutes).
    // Practice mode is untimed (0). All exam modes strictly use 7200 seconds with NO option to alter.
    const strictExamDuration = (selectedMode === 'practice') ? 0 : 7200;
    
    const isShuffle = document.getElementById('shuffle-toggle')?.checked || false;

    let quizList = [...currentQuestions];

    if (isShuffle) {
        quizList = shuffleArray(quizList);
    }

    if (selectedMode === 'sprint') {
        // Take 25 questions
        quizList = quizList.slice(0, 25);
    }

    // Re-index for display
    const finalQuestions = quizList.map((q, idx) => ({
        ...q,
        displayNumber: idx + 1
    }));

    // Save complete session configuration to localStorage
    try {
        localStorage.setItem('quiz_questions', JSON.stringify(finalQuestions));
        localStorage.setItem('quiz_mode', selectedMode);
        localStorage.setItem('quiz_duration', strictExamDuration.toString());
        localStorage.setItem('quiz_source_name', loadedFileName);
        
        // Reset answers & session state
        localStorage.removeItem('quiz_answers');
        localStorage.removeItem('quiz_marked');
        localStorage.removeItem('quiz_current_index');
        localStorage.removeItem('quiz_elapsed_time');
        localStorage.removeItem('quiz_results');

        // Redirect to Questions page
        window.location.href = 'Questions.html';
    } catch (e) {
        console.error('Failed to store quiz data in localStorage:', e);
        alert('Storage error: Unable to start exam. Please check browser permissions.');
    }
}

function previewBank() {
    if (!currentQuestions || currentQuestions.length === 0) return;
    const sample = currentQuestions.slice(0, 5).map(q => `${q.displayNumber || q.id}. [${q.section || 'General'}] ${q.question}`).join('\n\n');
    alert(`UPSSSC PET Question Bank Sample (First 5 of ${currentQuestions.length} Questions):\n\n${sample}\n\n...and ${currentQuestions.length - 5} more questions with DI Tables and Reading Passages ready!`);
}