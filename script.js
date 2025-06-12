document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js loaded");

    // Views & Main Containers
    const setupView = document.getElementById('setup-view');
    const examView = document.getElementById('exam-view');
    const examResultsContainer = document.getElementById('exam-results-container');

    // Setup View Elements
    const questionFileInput = document.getElementById('question-file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInfoDisplay = document.getElementById('file-info-display');
    const parsedContentDisplay = document.getElementById('parsed-content-display');
    const extractedInfoDisplay = document.getElementById('extracted-info-display');
    const clearAllPapersBtn = document.getElementById('clear-all-papers-btn');
    const savedPapersList = document.getElementById('saved-papers-list');
    const startExamSetupBtn = document.getElementById('start-exam-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');


    // Exam View Elements
    const timeLeftDisplay = document.getElementById('time-left');
    const currentQuestionNumDisplay = document.getElementById('current-question-num');
    const totalQuestionsDisplay = document.getElementById('total-questions');
    const answeredCountDisplay = document.getElementById('answered-count');
    const markedReviewCountDisplay = document.getElementById('marked-review-count');
    const questionTextDisplay = document.getElementById('question-text');
    const answerOptionsContainer = document.getElementById('answer-options');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const markReviewBtn = document.getElementById('mark-review-btn');
    const clearResponseBtn = document.getElementById('clear-response-btn');
    const submitExamBtn = document.getElementById('submit-exam-btn');
    const suggestAnswerBtn = document.getElementById('suggest-answer-btn');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsList = document.getElementById('suggestions-list');
    const closeSuggestionsBtn = document.getElementById('close-suggestions-btn');

    window.parsedFileContent = '';
    window.currentFileToParse = null;
    window.extractedQuestions = [];

    let currentQuestionIndex = 0;
    let currentLoadedQuestions = [];
    let userAnswers = [];

    const DB_NAME = 'GATEExamSimulatorDB';
    const STORE_NAME = 'questionPapers';
    let db;

    // --- Theme Toggle ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggleBtn) themeToggleBtn.textContent = 'Switch to Light Mode';
        } else {
            document.body.classList.remove('dark-mode');
            if (themeToggleBtn) themeToggleBtn.textContent = 'Switch to Dark Mode';
        }
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('gate-exam-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('gate-exam-theme', newTheme);
        applyTheme(newTheme);
    }

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('gate-exam-theme') || 'light'; // Default to light
    applyTheme(savedTheme);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // --- Stop Words & Keyword Extraction (from previous step) ---
    const STOP_WORDS = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'what', 'which', 'who', 'whom',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'may', 'might',
        'must', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'in', 'on', 'at', 'by', 'from', 'to', 'with',
        'about', 'above', 'below', 'of', 'if', 'it', 'as', 'not', 'q', 'this', 'that', 'these', 'those', 'then',
        'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
        'calculate', 'determine', 'find', 'explain', 'describe', 'following', 'given', 'figure', 'shows', 'value',
        'option', 'options', 'correct', 'answer', 'answers', 'question', 'questions'
    ]);
    function getKeywords(text) {
        if (!text) return [];
        const words = text.toLowerCase().replace(/[\.,\?;:\(\)!\-"'\d+]/g, '').split(/\s+/);
        return words.filter(word => word.length > 2 && !STOP_WORDS.has(word) && isNaN(word));
    }

    // --- IndexedDB Functions (condensed from previous step) ---
    async function openDB() { /* ... */
        return new Promise((resolve, reject) => {
            if (db) { resolve(db); return; }
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const tempDb = event.target.result;
                if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                    tempDb.createObjectStore(STORE_NAME, { keyPath: 'paperName' });
                }
            };
            request.onsuccess = (event) => { db = event.target.result; console.log("DB Opened"); resolve(db); };
            request.onerror = (event) => { console.error("DB Error", event.target.error); reject(event.target.error); };
        });
    }
    async function saveQuestionPaper(paperData) { /* ... */
        if (!paperData.paperName || !paperData.questions || typeof paperData.parsedText === 'undefined') {
            return Promise.reject('Invalid paperData');
        }
        const currentDb = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = currentDb.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(paperData);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
    async function getQuestionPaper(paperName) { /* ... */
        const currentDb = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = currentDb.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(paperName);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    async function getAllQuestionPaperNames() { /* ... */
        const currentDb = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = currentDb.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
     }
    async function clearAllQuestionPapers() { /* ... */
        const currentDb = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = currentDb.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => {
                if (savedPapersList) savedPapersList.innerHTML = 'No saved question papers found.';
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // --- Exam Logic Functions (condensed from previous steps) ---
    async function loadAndDisplaySavedPapers() { /* ... */
        if (!savedPapersList) return;
        savedPapersList.innerHTML = 'Loading...';
        try {
            const paperNames = await getAllQuestionPaperNames();
            if (paperNames && paperNames.length > 0) {
                savedPapersList.innerHTML = '';
                paperNames.forEach(name => {
                    const listItem = document.createElement('li');
                    const paperNameSpan = document.createElement('span');
                    paperNameSpan.textContent = name;
                    listItem.appendChild(paperNameSpan);
                    const loadButton = document.createElement('button');
                    loadButton.textContent = 'Load & Start';
                    loadButton.style.marginLeft = '10px';
                    loadButton.onclick = async () => {
                        try {
                            const paperData = await getQuestionPaper(name);
                            if (paperData && paperData.questions) {
                                currentLoadedQuestions = paperData.questions.map(q => ({...q}));
                                userAnswers = currentLoadedQuestions.map(q => ({
                                    questionId: q.id,
                                    answer: [],
                                    isMarked: q.isMarkedForReview || false
                                }));
                                startExam();
                            } else { alert('Error loading question paper data.'); }
                        } catch (loadError) { alert("Failed to load paper: " + name); }
                    };
                    listItem.appendChild(loadButton);
                    savedPapersList.appendChild(listItem);
                });
            } else { savedPapersList.innerHTML = 'No saved question papers found.'; }
        } catch (error) { savedPapersList.innerHTML = 'Error loading saved papers.'; }
    }
    function displayQuestion(index) { /* ... */
        if (index < 0 || index >= currentLoadedQuestions.length) return;
        currentQuestionIndex = index;
        const question = currentLoadedQuestions[index];

        questionTextDisplay.innerHTML = `Q${index + 1} (Type: ${question.type || 'MCQ'}, ID: ${question.id}): ${question.text}`;
        answerOptionsContainer.innerHTML = '';
        if(suggestionsContainer) suggestionsContainer.style.display = 'none';

        const questionType = question.type || 'MCQ';

        if (questionType === 'NAT') {
            const natInput = document.createElement('input');
            natInput.type = 'text';
            natInput.id = `q${question.id}_nat_answer`;
            natInput.placeholder = "Enter your answer";
            const currentAnswerObj = userAnswers.find(ua => ua.questionId === question.id);
            if (currentAnswerObj && currentAnswerObj.answer.length > 0) {
                natInput.value = currentAnswerObj.answer[0];
            }
            natInput.onchange = () => handleAnswerSelection(question.id, natInput.value.trim(), true, 'NAT');
            answerOptionsContainer.appendChild(natInput);
        } else {
            question.options.forEach(option => {
                const optionInput = document.createElement('input');
                optionInput.type = questionType === 'MSQ' ? 'checkbox' : 'radio';
                optionInput.name = `question_${question.id}`;
                optionInput.value = option.id;
                optionInput.id = `q${question.id}_opt${option.id}`;

                const currentAnswerObj = userAnswers.find(ua => ua.questionId === question.id);
                if (currentAnswerObj && currentAnswerObj.answer.includes(option.id)) {
                    optionInput.checked = true;
                }
                optionInput.onchange = () => handleAnswerSelection(question.id, option.id, optionInput.checked, optionInput.type);

                const optionLabel = document.createElement('label');
                optionLabel.htmlFor = optionInput.id;
                optionLabel.textContent = `${option.id}) ${option.text}`;

                const optionDiv = document.createElement('div');
                optionDiv.appendChild(optionInput);
                optionDiv.appendChild(optionLabel);
                answerOptionsContainer.appendChild(optionDiv);
            });
        }

        currentQuestionNumDisplay.textContent = index + 1;
        totalQuestionsDisplay.textContent = currentLoadedQuestions.length;
        updateStatusCounts();
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === currentLoadedQuestions.length - 1;
        const currentQuestionState = userAnswers.find(ua => ua.questionId === question.id);
        markReviewBtn.textContent = currentQuestionState && currentQuestionState.isMarked ? "Unmark Review" : "Mark for Review";
        markReviewBtn.classList.toggle('marked', currentQuestionState && currentQuestionState.isMarked);
    }
    function handleAnswerSelection(questionId, selectedValue, isSelected, inputTypeOrQuestionType) { /* ... */
        let answerObj = userAnswers.find(ua => ua.questionId === questionId);
        if (!answerObj) {
            userAnswers.push({ questionId: questionId, answer: [], isMarked: false });
            answerObj = userAnswers.find(ua => ua.questionId === questionId);
        }

        if (inputTypeOrQuestionType === 'radio' || inputTypeOrQuestionType === 'NAT') {
            answerObj.answer = selectedValue ? [selectedValue] : [];
        } else {
            if (isSelected) {
                if (!answerObj.answer.includes(selectedValue)) answerObj.answer.push(selectedValue);
            } else {
                answerObj.answer = answerObj.answer.filter(id => id !== selectedValue);
            }
        }
        updateStatusCounts();
    }
    function updateStatusCounts() { /* ... */
        const answered = userAnswers.filter(ua => ua.answer && ua.answer.length > 0 && ua.answer[0] !== '').length;
        answeredCountDisplay.textContent = answered;
        const marked = userAnswers.filter(ua => ua.isMarked).length;
        markedReviewCountDisplay.textContent = marked;
    }
    function startExam() { /* ... */
        if (!currentLoadedQuestions || currentLoadedQuestions.length === 0) {
            if (window.extractedQuestions && window.extractedQuestions.length > 0) {
                currentLoadedQuestions = window.extractedQuestions.map(q => ({...q}));
                 userAnswers = currentLoadedQuestions.map(q => ({
                    questionId: q.id, answer: [], isMarked: q.isMarkedForReview || false
                }));
            } else { alert('No questions loaded. Upload or select a paper.'); return; }
        }
        currentQuestionIndex = 0;
        if(setupView) setupView.style.display = 'none';
        if(examView) examView.style.display = 'block';
        if(examResultsContainer) examResultsContainer.style.display = 'none';
        if(suggestionsContainer) suggestionsContainer.style.display = 'none';
        displayQuestion(currentQuestionIndex);
    }
    function calculateScore() { /* ... */
        let score = 0; let totalPossibleScore = 0;
        let correctCount = 0; let incorrectCount = 0; let unattemptedCount = 0;

        currentLoadedQuestions.forEach(question => {
            const userAnswerObj = userAnswers.find(ua => ua.questionId === question.id);
            const questionType = question.type || 'MCQ';
            let marksPerQuestion = (questionType === 'NAT' || questionType === 'MSQ') ? 2 : 1;
            totalPossibleScore += marksPerQuestion;

            if (!userAnswerObj || userAnswerObj.answer.length === 0 || userAnswerObj.answer[0] === '') {
                unattemptedCount++; return;
            }

            const correctAns = question.correctAnswer.map(ca => String(ca).toUpperCase().trim());
            const userAns = userAnswerObj.answer.map(ua => String(ua).toUpperCase().trim());
            let isCorrect = false;

            if (questionType === 'MCQ' || questionType === 'NAT') {
                if (userAns.length === 1 && correctAns.length === 1 && userAns[0] === correctAns[0]) {
                    isCorrect = true;
                }
            } else if (questionType === 'MSQ') {
                if (correctAns.length === userAns.length && correctAns.every(ca => userAns.includes(ca)) && userAns.every(ua => correctAns.includes(ua))) {
                    isCorrect = true;
                }
            }

            if (isCorrect) { score += marksPerQuestion; correctCount++; }
            else { incorrectCount++; }
        });
        return { score, totalPossibleScore, correctCount, incorrectCount, unattemptedCount, totalQuestions: currentLoadedQuestions.length };
    }
    async function findSimilarQuestions(currentQuestionText) { /* ... */
        const currentKeywords = getKeywords(currentQuestionText);
        if (currentKeywords.length === 0) return [];
        let allSavedPapersData = [];
        try {
            const paperNames = await getAllQuestionPaperNames();
            for (const name of paperNames) {
                const paperData = await getQuestionPaper(name);
                if (paperData && paperData.questions) {
                    allSavedPapersData.push(paperData);
                }
            }
        } catch (error) { console.error("Error fetching papers for suggestions:", error); return []; }

        const suggestions = [];
        const currentQuestionId = currentLoadedQuestions[currentQuestionIndex]?.id;

        allSavedPapersData.forEach(paper => {
            paper.questions.forEach(savedQuestion => {
                if (paper.paperName === window.currentFileToParse?.name && savedQuestion.id === currentQuestionId) {
                    return;
                }
                const savedQuestionContent = savedQuestion.text + " " + (savedQuestion.options ? savedQuestion.options.map(o => o.text).join(" ") : "");
                const savedQuestionKeywords = getKeywords(savedQuestionContent);
                const commonKeywords = currentKeywords.filter(k => savedQuestionKeywords.includes(k));

                if (commonKeywords.length > 0) {
                    suggestions.push({
                        paperName: paper.paperName, questionText: savedQuestion.text,
                        options: savedQuestion.options, correctAnswer: savedQuestion.correctAnswer,
                        score: commonKeywords.length, commonKeywords: commonKeywords
                    });
                }
            });
        });
        suggestions.sort((a, b) => b.score - a.score);
        return suggestions.slice(0, 3);
    }
    async function parseFile(file, fileExtension) { /* ... */
        if (!parsedContentDisplay) return Promise.reject("parsed-content-display missing");
        parsedContentDisplay.value = 'Parsing...';
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject('FileReader error');
            reader.onload = async (e) => {
                try {
                    let textContent = '';
                    if (fileExtension === 'pdf') {
                        const typedarray = new Uint8Array(e.target.result);
                        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const text = await page.getTextContent();
                            textContent += text.items.map(item => item.str).join(' ') + '\n';
                        }
                    } else if (fileExtension === 'docx') {
                        const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                        textContent = result.value;
                    } else if (fileExtension === 'txt') {
                        textContent = e.target.result;
                    } else { return reject('Unsupported type for parsing'); }
                    parsedContentDisplay.value = textContent.substring(0, 1000) + (textContent.length > 1000 ? '...' : '');
                    resolve(textContent);
                } catch (error) { reject(`Error parsing ${fileExtension}: ${error.message}`); }
            };

            if (fileExtension === 'pdf' || fileExtension === 'docx') reader.readAsArrayBuffer(file);
            else if (fileExtension === 'txt') reader.readAsText(file);
            else reject('File type not supported for reading');
        });
    }
    function extractQuestions(textContent) { /* ... */
        window.extractedQuestions = [];
        let questionIdCounter = 1;
        const potentialQuestionBlocks = textContent.split(/\n(?=\s*(?:Q\s*)?\d+[\.\)]\s*)/);

        potentialQuestionBlocks.forEach((block, index) => {
            let currentBlock = block.trim();
            if (!currentBlock) return;
            const questionStartRegex = /^\s*(?:Q\s*)?(\d+)[\.\)]\s*/;
            if (index === 0 && !currentBlock.match(questionStartRegex) && !textContent.match(questionStartRegex) && potentialQuestionBlocks.length > 1) return;

            const lines = currentBlock.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length === 0) return;

            let questionText = ''; const options = []; let optionParsingStarted = false;
            let firstLineOfQuestion = lines[0];
            const optionRegex = /^(?:[A-Da-d][\.\)]|\([A-Da-d]\)|[ivxIVX]+[\.\)]|[1-4][\.\)])\s+(.+)/;
            const qNumMatch = firstLineOfQuestion.match(questionStartRegex);

            if(qNumMatch) questionText = firstLineOfQuestion.substring(qNumMatch[0].length).trim();
            else questionText = firstLineOfQuestion;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i]; const optionMatch = line.match(optionRegex);
                if (optionMatch) {
                    optionParsingStarted = true;
                    let optionId = optionMatch[0].match(/^(?:[A-Da-d][\.\)]|\([A-Da-d]\)|[ivxIVX]+[\.\)]|[1-4][\.\)])/)[0].replace(/[\.\)\(]/g, '').trim();
                    options.push({ id: optionId, text: optionMatch[1].trim() });
                } else if (!optionParsingStarted) questionText += ' ' + line;
                else if (options.length > 0) options[options.length -1].text += ' ' + line;
            }

            if (questionText && options.length > 0) {
                window.extractedQuestions.push({
                    id: questionIdCounter++, originalQNum: qNumMatch ? parseInt(qNumMatch[1]) : null,
                    type: 'MCQ', text: questionText.trim(), options: options,
                    correctAnswer: [], userAnswer: null, isMarkedForReview: false
                });
            }
        });

        const answerKeySectionRegex = /\n(?:Answer Key|Answers)\s*:\s*([\s\S]*)/im;
        const answerKeyMatch = textContent.match(answerKeySectionRegex);
        if (answerKeyMatch && answerKeyMatch[1]) {
            const answerKeyText = answerKeyMatch[1].trim();
            const answerLines = answerKeyText.split('\n');
            const answerRegex = /^(?:Q|Question)?\s*(\d+)\s*[\.:\-]\s*([A-Da-d0-9\.,\s]+)/;

            answerLines.forEach(line => {
                const match = line.trim().match(answerRegex);
                if (match) {
                    const qNum = parseInt(match[1]);
                    const answerStr = match[2].trim();
                    let questionToUpdate = window.extractedQuestions.find(q => q.originalQNum === qNum);
                    if (!questionToUpdate && qNum > 0 && qNum <= window.extractedQuestions.length) {
                        questionToUpdate = window.extractedQuestions[qNum - 1];
                    }

                    if (questionToUpdate) {
                        const answers = answerStr.split(/[,\s]+/).map(a => a.trim().toUpperCase()).filter(a => a);
                        questionToUpdate.correctAnswer = answers;
                        if (answers.length === 1 && !/^[A-D]$/.test(answers[0]) && !isNaN(parseFloat(answers[0]))) {
                            questionToUpdate.type = 'NAT';
                            questionToUpdate.correctAnswer = [answers[0]];
                        } else if (answers.length > 0 && answers.every(a => /^[A-D]$/.test(a))) {
                             questionToUpdate.type = answers.length > 1 ? 'MSQ' : 'MCQ';
                        } else if (answers.length > 0 && answers.every(a => /^[1-4]$/.test(a))) {
                             questionToUpdate.type = answers.length > 1 ? 'MSQ' : 'MCQ';
                        }
                    }
                }
            });
        }

        if (extractedInfoDisplay) {
            extractedInfoDisplay.textContent = `Extracted ${window.extractedQuestions.length} questions.`;
        }
        return window.extractedQuestions;
    }


    // --- Event Listeners (Setup and Exam views) ---
    if (uploadBtn) uploadBtn.addEventListener('click', () => { if (questionFileInput) questionFileInput.click(); });
    if (questionFileInput) questionFileInput.addEventListener('change', async (event) => { /* ... */
        window.extractedQuestions = []; currentLoadedQuestions = []; userAnswers = [];
        if (extractedInfoDisplay) extractedInfoDisplay.textContent = '';
        if (parsedContentDisplay) parsedContentDisplay.value = '';
        if (fileInfoDisplay) fileInfoDisplay.textContent = '';

        const file = event.target.files[0];
        if (file) {
            fileInfoDisplay.textContent = `Selected: ${file.name}`;
            window.currentFileToParse = file;
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (['pdf', 'docx', 'txt'].includes(fileExtension)) {
                fileInfoDisplay.textContent += '\nParsing...';
                try {
                    const content = await parseFile(file, fileExtension);
                    window.parsedFileContent = content;
                    fileInfoDisplay.textContent += '\nParsed. Extracting questions & answers...';
                    extractQuestions(content);
                    if (window.extractedQuestions.length > 0) {
                        const paperDataToSave = {
                            paperName: file.name, questions: window.extractedQuestions,
                            parsedText: content, uploadDate: new Date().toISOString()
                        };
                        await saveQuestionPaper(paperDataToSave);
                        extractedInfoDisplay.textContent += '\nPaper saved. Ready to start or load.';
                        loadAndDisplaySavedPapers();
                    } else { extractedInfoDisplay.textContent += '\nNo questions extracted.'; }
                } catch (err) { extractedInfoDisplay.textContent += `\nError: ${err.message || 'Could not process.'}`; }
            } else { fileInfoDisplay.textContent += '\nUnsupported type.'; }
        }
    });
    if (clearAllPapersBtn) clearAllPapersBtn.addEventListener('click', async () => { /* ... */
        if (confirm('Delete ALL saved papers?')) { await clearAllQuestionPapers(); alert('All saved papers cleared.'); }
    });
    if (startExamSetupBtn) startExamSetupBtn.addEventListener('click', () => { /* ... */
        if (window.extractedQuestions && window.extractedQuestions.length > 0) {
             currentLoadedQuestions = window.extractedQuestions.map(q => ({...q}));
             userAnswers = currentLoadedQuestions.map(q => ({ questionId: q.id, answer: [], isMarked: false }));
             startExam();
        } else { alert("Upload/process a paper or select a saved one."); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentQuestionIndex < currentLoadedQuestions.length - 1) displayQuestion(currentQuestionIndex + 1); });
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentQuestionIndex > 0) displayQuestion(currentQuestionIndex - 1); });
    if (clearResponseBtn) clearResponseBtn.addEventListener('click', () => { /* ... */
        const currentQ = currentLoadedQuestions[currentQuestionIndex];
        if (currentQ) {
            const answerObj = userAnswers.find(ua => ua.questionId === currentQ.id);
            if (answerObj) answerObj.answer = [];
            displayQuestion(currentQuestionIndex);
        }
    });
    if (markReviewBtn) markReviewBtn.addEventListener('click', () => { /* ... */
        const currentQ = currentLoadedQuestions[currentQuestionIndex];
        if (currentQ) {
            let answerObj = userAnswers.find(ua => ua.questionId === currentQ.id);
            if (!answerObj) {
                 userAnswers.push({ questionId: currentQ.id, answer: [], isMarked: true });
            } else { answerObj.isMarked = !answerObj.isMarked; }
            displayQuestion(currentQuestionIndex);
            updateStatusCounts();
        }
    });
    if (submitExamBtn) submitExamBtn.addEventListener('click', () => { /* ... */
        if (confirm("Submit the exam?")) {
            const results = calculateScore();
            let resultMessage = `Exam Submitted!\n\nTotal Questions: ${results.totalQuestions}\n`;
            resultMessage += `Correct: ${results.correctCount}\nIncorrect: ${results.incorrectCount}\n`;
            resultMessage += `Unattempted: ${results.unattemptedCount}\n`;
            resultMessage += `Score: ${results.score} / ${results.totalPossibleScore}\n\n`;
            alert(resultMessage);
            currentLoadedQuestions = []; userAnswers = []; currentQuestionIndex = 0;
            if(examView) examView.style.display = 'none';
            if(setupView) setupView.style.display = 'block';
            loadAndDisplaySavedPapers();
        }
    });
    if (suggestAnswerBtn) suggestAnswerBtn.addEventListener('click', async () => { /* ... */
        const currentQuestion = currentLoadedQuestions[currentQuestionIndex];
        if (!currentQuestion || !suggestionsList || !suggestionsContainer) return;
        suggestionsList.innerHTML = '<i>Searching for suggestions...</i>';
        suggestionsContainer.style.display = 'block';
        const similarQuestions = await findSimilarQuestions(currentQuestion.text);
        suggestionsList.innerHTML = '';
        if (similarQuestions.length > 0) {
            similarQuestions.forEach(sugg => {
                const listItem = document.createElement('li');
                let suggestionHTML = `<b>From: ${sugg.paperName}</b><br/><b>Q:</b> ${sugg.questionText.substring(0,150)}...<br/>`;
                if (sugg.correctAnswer && sugg.correctAnswer.length > 0) {
                    suggestionHTML += `<b>Ans:</b> ${sugg.correctAnswer.join(', ')} (Matched on: ${sugg.commonKeywords.join(', ')})`;
                } else {
                    suggestionHTML += `(Ans not found. Matched on: ${sugg.commonKeywords.join(', ')})`;
                }
                listItem.innerHTML = suggestionHTML;
                suggestionsList.appendChild(listItem);
            });
        } else {
            suggestionsList.innerHTML = '<li>No relevant suggestions found.</li>';
        }
    });
    if (closeSuggestionsBtn) closeSuggestionsBtn.addEventListener('click', () => { /* ... */
        if(suggestionsContainer) suggestionsContainer.style.display = 'none';
    });

    // --- Keyboard Navigation ---
    document.addEventListener('keydown', (event) => {
        const examViewActive = examView && examView.style.display === 'block';
        const targetTagName = event.target.tagName.toLowerCase();
        const isInputFocused = ['input', 'textarea', 'select'].includes(targetTagName) && event.target.type !== 'radio' && event.target.type !== 'checkbox';


        if (!examViewActive || isInputFocused) {
            // If an input field (like NAT answer box) is focused, allow typing.
            // But if it's a radio/checkbox, our shortcuts should still work.
            if (isInputFocused && (event.target.type === 'text' || event.target.type === 'textarea' || event.target.type === 'select')) {
                 return;
            }
        }


        let handled = false;
        switch (event.key.toLowerCase()) { // Use toLowerCase for key comparison
            case 'arrowright':
            case 'pagedown':
                if (nextBtn && !nextBtn.disabled) { nextBtn.click(); handled = true; }
                break;
            case 'arrowleft':
            case 'pageup':
                if (prevBtn && !prevBtn.disabled) { prevBtn.click(); handled = true; }
                break;
            case 'm':
                if (markReviewBtn) { markReviewBtn.click(); handled = true; }
                break;
            case 'c':
                if (suggestionsContainer && suggestionsContainer.style.display === 'block') {
                    if (closeSuggestionsBtn) { closeSuggestionsBtn.click(); handled = true; }
                } else if (clearResponseBtn) {
                    clearResponseBtn.click(); handled = true;
                }
                break;
            case 's':
                if (suggestAnswerBtn) { suggestAnswerBtn.click(); handled = true; }
                break;
            case '1': case 'a': selectOptionByNumberOrChar(0); handled = true; break;
            case '2': case 'b': selectOptionByNumberOrChar(1); handled = true; break;
            case '3': case 'd': selectOptionByNumberOrChar(2); handled = true; break; // 'c' is for clear
            case '4': /* case 'e': */ selectOptionByNumberOrChar(3); handled = true; break; // No 'e' for now
        }

        if (handled) {
            event.preventDefault();
        }
    });

    function selectOptionByNumberOrChar(optionIndex) {
        if (!currentLoadedQuestions || currentLoadedQuestions.length === 0) return;
        const question = currentLoadedQuestions[currentQuestionIndex];
        if (!question || question.type === 'NAT' || !question.options || optionIndex >= question.options.length) return;

        const option = question.options[optionIndex];
        const optionInput = document.getElementById(`q${question.id}_opt${option.id}`);

        if (optionInput) {
            if (optionInput.type === 'radio') {
                optionInput.checked = true;
            } else if (optionInput.type === 'checkbox') {
                optionInput.checked = !optionInput.checked; // Toggle checkbox
            }
            // Manually trigger change to update answer state
            handleAnswerSelection(question.id, option.id, optionInput.checked, optionInput.type);
        }
    }

    // --- Initialization ---
    openDB().then(() => { loadAndDisplaySavedPapers(); })
    .catch(error => { if(fileInfoDisplay) fileInfoDisplay.textContent = "Error: DB connection failed."; });
});
