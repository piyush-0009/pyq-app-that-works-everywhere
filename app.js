// State Management
let allQuestions = [];
let taxonomyTree = {}; // { subject: { chapter: Set(topics) } }

// DOM Elements
const searchIdInput = document.getElementById('searchIdInput');
const subjectSelect = document.getElementById('subjectSelect');
const chapterSelect = document.getElementById('chapterSelect');
const topicSelect = document.getElementById('topicSelect');
const promptVersionSelect = document.getElementById('promptVersionSelect');
const needsReviewCheckbox = document.getElementById('needsReviewCheckbox');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const matchCount = document.getElementById('matchCount');
const questionsContainer = document.getElementById('questionsContainer');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  setupEventListeners();
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    allQuestions = await response.json();
    if (!Array.isArray(allQuestions)) {
      throw new Error('data.json format invalid: expected JSON array.');
    }

    buildTaxonomyTree(allQuestions);
    populateSubjectDropdown();
    applyFilters();
  } catch (err) {
    showError('Failed to load questions: ' + err.message);
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove('hidden');
  questionsContainer.innerHTML = '';
  matchCount.textContent = '0 / 0 questions';
}

function setupEventListeners() {
  searchIdInput.addEventListener('input', applyFilters);
  subjectSelect.addEventListener('change', () => {
    updateChapterDropdown();
    applyFilters();
  });
  chapterSelect.addEventListener('change', () => {
    updateTopicDropdown();
    applyFilters();
  });
  topicSelect.addEventListener('change', applyFilters);
  promptVersionSelect.addEventListener('change', applyFilters);
  needsReviewCheckbox.addEventListener('change', applyFilters);
  clearFiltersBtn.addEventListener('click', clearAllFilters);
}

/**
 * Builds taxonomy tree from dataset questions.
 * Handles null (Uncategorized) and string values ("UNMAPPED").
 */
function buildTaxonomyTree(questions) {
  taxonomyTree = {};

  questions.forEach(q => {
    // Subject string representation: null becomes "Uncategorized"
    const subj = q.subject === null ? 'Uncategorized' : q.subject;
    const chap = q.chapter === null ? 'Uncategorized' : q.chapter;
    const top = q.topic === null ? 'Uncategorized' : q.topic;

    if (!taxonomyTree[subj]) {
      taxonomyTree[subj] = {};
    }
    if (!taxonomyTree[subj][chap]) {
      taxonomyTree[subj][chap] = new Set();
    }
    taxonomyTree[subj][chap].add(top);
  });
}

/**
 * Populates Subject dropdown options.
 * Ensures "Uncategorized" and "UNMAPPED" are present if existing in dataset.
 */
function populateSubjectDropdown() {
  subjectSelect.innerHTML = '<option value="">All Subjects</option>';

  const subjects = Object.keys(taxonomyTree).sort((a, b) => {
    // Keep Uncategorized at the top or bottom, alphabetical for others
    if (a === 'Uncategorized') return -1;
    if (b === 'Uncategorized') return 1;
    if (a === 'UNMAPPED') return -1;
    if (b === 'UNMAPPED') return 1;
    return a.localeCompare(b);
  });

  subjects.forEach(subj => {
    const opt = document.createElement('option');
    opt.value = subj;
    opt.textContent = subj;
    subjectSelect.appendChild(opt);
  });

  updateChapterDropdown();
}

/**
 * Updates dependent Chapter dropdown based on selected Subject.
 */
function updateChapterDropdown() {
  const selectedSubject = subjectSelect.value;
  chapterSelect.innerHTML = '<option value="">All Chapters</option>';

  if (!selectedSubject || !taxonomyTree[selectedSubject]) {
    chapterSelect.disabled = true;
    updateTopicDropdown();
    return;
  }

  chapterSelect.disabled = false;
  const chapters = Object.keys(taxonomyTree[selectedSubject]).sort((a, b) => {
    if (a === 'Uncategorized') return -1;
    if (b === 'Uncategorized') return 1;
    return a.localeCompare(b);
  });

  chapters.forEach(chap => {
    const opt = document.createElement('option');
    opt.value = chap;
    opt.textContent = chap;
    chapterSelect.appendChild(opt);
  });

  updateTopicDropdown();
}

/**
 * Updates dependent Topic dropdown based on selected Subject & Chapter.
 */
function updateTopicDropdown() {
  const selectedSubject = subjectSelect.value;
  const selectedChapter = chapterSelect.value;
  topicSelect.innerHTML = '<option value="">All Topics</option>';

  if (!selectedSubject || !selectedChapter || !taxonomyTree[selectedSubject] || !taxonomyTree[selectedSubject][selectedChapter]) {
    topicSelect.disabled = true;
    return;
  }

  topicSelect.disabled = false;
  const topics = Array.from(taxonomyTree[selectedSubject][selectedChapter]).sort((a, b) => {
    if (a === 'Uncategorized') return -1;
    if (b === 'Uncategorized') return 1;
    return a.localeCompare(b);
  });

  topics.forEach(top => {
    const opt = document.createElement('option');
    opt.value = top;
    opt.textContent = top;
    topicSelect.appendChild(opt);
  });
}

/**
 * Filter questions based on all active controls (AND logic).
 */
function applyFilters() {
  const query = searchIdInput.value.trim().toLowerCase();
  const selectedSubject = subjectSelect.value;
  const selectedChapter = chapterSelect.value;
  const selectedTopic = topicSelect.value;
  const selectedPromptVersion = promptVersionSelect.value;
  const onlyNeedsReview = needsReviewCheckbox.checked;

  const filtered = allQuestions.filter(q => {
    // Search QID filter
    if (query && !q.id.toLowerCase().includes(query)) {
      return false;
    }

    // Subject filter
    if (selectedSubject) {
      const qSubj = q.subject === null ? 'Uncategorized' : q.subject;
      if (qSubj !== selectedSubject) return false;
    }

    // Chapter filter
    if (selectedChapter) {
      const qChap = q.chapter === null ? 'Uncategorized' : q.chapter;
      if (qChap !== selectedChapter) return false;
    }

    // Topic filter
    if (selectedTopic) {
      const qTop = q.topic === null ? 'Uncategorized' : q.topic;
      if (qTop !== selectedTopic) return false;
    }

    // Prompt Version filter
    if (selectedPromptVersion) {
      if (selectedPromptVersion === 'None') {
        if (q.promptVersion !== null && q.promptVersion !== undefined) return false;
      } else {
        if (q.promptVersion !== selectedPromptVersion) return false;
      }
    }

    // Needs Review filter
    if (onlyNeedsReview && q.needsReview !== true) {
      return false;
    }

    return true;
  });

  renderQuestions(filtered);
}

/**
 * Clears all filters back to default.
 */
function clearAllFilters() {
  searchIdInput.value = '';
  subjectSelect.value = '';
  promptVersionSelect.value = '';
  needsReviewCheckbox.checked = false;
  updateChapterDropdown();
  applyFilters();
}

/**
 * Render filtered questions into results container.
 */
function renderQuestions(questions) {
  matchCount.textContent = `${questions.length} / ${allQuestions.length} questions`;

  if (questions.length === 0) {
    emptyState.classList.remove('hidden');
    questionsContainer.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  const html = questions.map(q => renderQuestionCard(q)).join('');
  questionsContainer.innerHTML = html;
}

/**
 * Generate HTML string for single question card.
 */
function renderQuestionCard(q) {
  // Taxonomy breadcrumb display values
  const subjDisplay = q.subject === null ? 'Uncategorized' : q.subject;
  const chapDisplay = q.chapter === null ? 'Uncategorized' : q.chapter;
  const topDisplay = q.topic === null ? 'Uncategorized' : q.topic;

  // Review badge
  const reviewBadge = q.needsReview === true
    ? `<span class="review-badge">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        Needs Review
       </span>`
    : '';

  // Correct Option formatted string
  const correctOptionText = q.correctOption !== null && q.correctOption !== undefined
    ? `Option ${q.correctOption}`
    : '<span class="detail-label">N/A</span>';

  // Answer Confidence
  let confidenceHtml = '';
  if (q.answerConfidence !== null && q.answerConfidence !== undefined) {
    const pct = Math.round(q.answerConfidence * 100);
    confidenceHtml = `
      <div class="detail-item">
        <span class="detail-label">Confidence:</span>
        <div class="confidence-bar-wrapper">
          <span class="detail-value">${pct}%</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Topic Confidence
  let topicConfidenceHtml = '';
  if (q.topicConfidence !== null && q.topicConfidence !== undefined) {
    const pct = Math.round(q.topicConfidence * 100);
    topicConfidenceHtml = `
      <div class="detail-item">
        <span class="detail-label">Topic Confidence:</span>
        <span class="detail-value">${pct}%</span>
      </div>
    `;
  }

  // Images HTML - render all images in order with loading="lazy"
  const images = Array.isArray(q.images) ? q.images : [];
  const imagesHtml = images.map((imgFilename, idx) => `
    <div class="image-item">
      <img src="images/${imgFilename}" alt="Question Image ${idx + 1} for ${q.id}" loading="lazy" />
      ${images.length > 1 ? `<span class="image-caption">Image ${idx + 1} of ${images.length}</span>` : ''}
    </div>
  `).join('');

  return `
    <article class="question-card" id="q-${q.id}">
      <div class="card-header">
        <div class="qid-container">
          <span class="question-id">${q.id}</span>
          <div class="meta-pills">
            ${q.exam ? `<span class="pill">${q.exam}</span>` : ''}
            ${q.year ? `<span class="pill">${q.year}</span>` : ''}
            ${q.month ? `<span class="pill">${q.month}/${q.year}</span>` : ''}
            ${q.session ? `<span class="pill">${q.session}</span>` : ''}
            ${q.part ? `<span class="pill">Part ${q.part}</span>` : ''}
            ${q.promptVersion ? `<span class="pill">${q.promptVersion}</span>` : ''}
          </div>
        </div>
        ${reviewBadge}
      </div>

      <div class="taxonomy-breadcrumbs">
        <span class="${q.subject === null ? 'crumb-uncategorized' : 'crumb-subject'}">${subjDisplay}</span>
        <span class="crumb-sep">&rsaquo;</span>
        <span>${chapDisplay}</span>
        <span class="crumb-sep">&rsaquo;</span>
        <span>${topDisplay}</span>
      </div>

      <div class="card-details">
        <div class="detail-item">
          <span class="detail-label">Correct Option:</span>
          <span class="detail-value">${correctOptionText}</span>
        </div>
        ${confidenceHtml}
        ${topicConfidenceHtml}
        ${q.taxonomyCode ? `<div class="detail-item"><span class="detail-label">Taxonomy:</span> <span class="detail-value">${q.taxonomyCode}</span></div>` : ''}
        ${q.note ? `<div class="detail-item"><span class="detail-label">Note:</span> <span class="detail-value">${q.note}</span></div>` : ''}
      </div>

      <div class="card-images">
        ${imagesHtml}
      </div>
    </article>
  `;
}
