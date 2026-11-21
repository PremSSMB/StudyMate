/* =========================================================
   STUDYMATE — NO-AI EDITION
   All file reading and study-kit generation happens locally
   in the student's browser. No API keys, server, or AI calls.
========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "studymate-no-ai-v1";
  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 15 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 30 * 1024 * 1024;
  const MAX_TEXT_CHARS = 160000;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const today = new Date();
  const todayKey = localDate(today);

  let selectedDate = todayKey;
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedFiles = [];
  let currentCardIndex = 0;
  let cardFlipped = false;
  let currentQuiz = [];
  let quizIndex = 0;
  let quizAnswer = null;
  let quizScore = 0;
  let quizAnswered = [];
  let toastTimer = null;

  const defaultData = {
    assignments: [],
    todos: [],
    materials: [],
    flashcards: [],
    quizzes: [],
    notes: [],
    attempts: []
  };

  let data = loadData();

  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function prettyDate(key, options = { month: "short", day: "numeric" }) {
    return dateFromKey(key).toLocaleDateString("en-US", options);
  }

  function id() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return structuredClone(defaultData);
      const parsed = JSON.parse(stored);
      return {
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        todos: Array.isArray(parsed.todos) ? parsed.todos : [],
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
        flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
        quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : []
      };
    } catch (error) {
      console.warn("StudyMate could not read saved browser data.", error);
      return structuredClone(defaultData);
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn("StudyMate could not save data.", error);
      showToast("Browser storage is full. Try removing an old study kit.");
      return false;
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setView(view) {
    const allowed = ["planner", "upload", "flashcards", "quizzes", "notes", "coach"];
    if (!allowed.includes(view)) return;

    $$(".view-page").forEach((page) => {
      const active = page.id === `view-${view}`;
      page.hidden = !active;
      page.classList.toggle("active", active);
    });

    $$("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const titles = {
      planner: ["Your month, your plan", "Keep track of what's due and make time for you."],
      upload: ["Turn your materials into a study kit", "Upload class files and create practice materials directly in your browser."],
      flashcards: ["Remember more, one card at a time", "Review flashcards created from the material you uploaded."],
      quizzes: ["Practice what you're learning", "Test your understanding with questions made from your study material."],
      notes: ["Your notes, organized", "Review the summaries created from your uploaded materials."],
      coach: ["A study plan that learns with you", "Get suggestions from your quiz results and flashcard reviews."]
    };

    $("#page-title").innerHTML = `${titles[view][0]} <span class="title-star">✦</span>`;
    $("#page-subtitle").textContent = titles[view][1];
    $("#sidebar").classList.remove("menu-open");
  }

  // ---------------- Calendar ----------------

  function renderCalendar() {
    $("#month-title").textContent = visibleMonth.toLocaleDateString("en-US", {
      month: "long", year: "numeric"
    });

    const grid = $("#calendar-grid");
    grid.replaceChildren();

    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - mondayOffset);

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = localDate(date);
      const inMonth = date.getMonth() === visibleMonth.getMonth();
      const dayAssignments = data.assignments.filter((item) => item.date === key);

      const button = element("button", "calendar-day");
      button.type = "button";
      button.dataset.date = key;
      button.setAttribute("aria-label", date.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      }));
      button.setAttribute("aria-pressed", String(key === selectedDate));
      if (!inMonth) button.classList.add("outside");
      if (key === todayKey) button.classList.add("is-today");
      if (key === selectedDate) button.classList.add("selected");

      button.appendChild(element("span", "", String(date.getDate())));
      const dots = element("span", "day-dots");
      dayAssignments.slice(0, 3).forEach((assignment) => {
        const dot = element("i", assignment.completed ? "done" : "");
        dots.appendChild(dot);
      });
      button.appendChild(dots);
      grid.appendChild(button);
    }
  }

  function renderAssignments() {
    const chosen = dateFromKey(selectedDate);
    $("#selected-date-title").textContent = selectedDate === todayKey
      ? "Today"
      : chosen.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const list = $("#assignment-list");
    list.replaceChildren();
    const items = data.assignments
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => Number(a.completed) - Number(b.completed));

    if (!items.length) {
      const empty = element("div", "empty-state");
      empty.append(element("strong", "", "A clear day 🌷"));
      empty.append(element("span", "", "Add an assignment below when you have one."));
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = element("div", `assignment-row${item.completed ? " completed" : ""}`);
      const checkbox = element("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(item.completed);
      checkbox.setAttribute("aria-label", `Mark ${item.title} as turned in`);
      checkbox.addEventListener("change", () => {
        item.completed = checkbox.checked;
        saveData();
        renderAll();
      });

      const info = element("div", "assignment-info");
      info.append(element("strong", "", item.title));
      info.append(element("span", "", item.subject || "General"));

      const remove = element("button", "subtle-icon", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Delete ${item.title}`);
      remove.addEventListener("click", () => {
        data.assignments = data.assignments.filter((entry) => entry.id !== item.id);
        saveData();
        renderAll();
      });

      row.append(checkbox, info, remove);
      list.appendChild(row);
    });
  }

  $("#prev-month").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  $("#next-month").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  $("#go-today").addEventListener("click", () => {
    selectedDate = todayKey;
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
    renderAssignments();
  });

  $("#calendar-grid").addEventListener("click", (event) => {
    const day = event.target.closest("[data-date]");
    if (!day) return;
    selectedDate = day.dataset.date;
    const selected = dateFromKey(selectedDate);
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    renderCalendar();
    renderAssignments();
  });

  $("#assignment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#assignment-title").value.trim();
    if (!title) return;
    data.assignments.push({
      id: id(), title,
      subject: $("#assignment-subject").value,
      date: selectedDate,
      completed: false
    });
    event.currentTarget.reset();
    saveData();
    renderAll();
    showToast("Assignment added to your calendar.");
  });

  // ---------------- To-do list ----------------

  function renderTodos() {
    const list = $("#todo-list");
    list.replaceChildren();
    const remaining = data.todos.filter((item) => !item.completed).length;
    $("#todo-count").textContent = `${remaining} left`;

    if (!data.todos.length) {
      const empty = element("div", "empty-state");
      empty.append(element("strong", "", "Your list is clear."));
      empty.append(element("span", "", "Add one small task to get started."));
      list.appendChild(empty);
      return;
    }

    [...data.todos].sort((a, b) => Number(a.completed) - Number(b.completed)).forEach((item) => {
      const row = element("div", `todo-row${item.completed ? " completed" : ""}`);
      const checkbox = element("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(item.completed);
      checkbox.setAttribute("aria-label", `Complete ${item.title}`);
      checkbox.addEventListener("change", () => {
        item.completed = checkbox.checked;
        saveData();
        renderTodos();
        renderStats();
      });
      row.appendChild(checkbox);
      row.appendChild(element("span", "todo-title", item.title));
      if (item.date) row.appendChild(element("small", "", prettyDate(item.date)));
      const remove = element("button", "subtle-icon", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Delete ${item.title}`);
      remove.addEventListener("click", () => {
        data.todos = data.todos.filter((entry) => entry.id !== item.id);
        saveData();
        renderTodos();
        renderStats();
      });
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  $("#todo-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#todo-title").value.trim();
    if (!title) return;
    data.todos.push({ id: id(), title, date: $("#todo-date").value, completed: false });
    event.currentTarget.reset();
    saveData();
    renderTodos();
    renderStats();
    showToast("Task added to your list.");
  });

  function renderStats() {
    $("#stat-open").textContent = data.assignments.filter((item) => !item.completed).length;
    $("#stat-done").textContent = data.assignments.filter((item) => item.completed).length;
    $("#stat-todos").textContent = data.todos.filter((item) => !item.completed).length;
  }

  // ---------------- File upload and local text extraction ----------------

  const dropZone = $("#drop-zone");
  const fileInput = $("#file-input");
  const MAX_ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "csv", "vtt", "srt"]);

  function extensionOf(name) {
    return (name.split(".").pop() || "").toLowerCase();
  }

  function addFiles(fileList) {
    const incoming = [...fileList];
    const errors = [];
    let combined = [...selectedFiles];

    incoming.forEach((file) => {
      const ext = extensionOf(file.name);
      if (!MAX_ALLOWED_EXTENSIONS.has(ext)) {
        errors.push(`${file.name}: unsupported format.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: larger than 15 MB.`);
        return;
      }
      if (!combined.some((other) => other.name === file.name && other.size === file.size)) {
        combined.push(file);
      }
    });

    if (combined.length > MAX_FILES) errors.push("Choose up to 5 files per study kit.");
    combined = combined.slice(0, MAX_FILES);

    const totalSize = combined.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) errors.push("All selected files must be 30 MB or smaller combined.");
    else selectedFiles = combined;

    $("#upload-error").hidden = errors.length === 0;
    $("#upload-error").textContent = errors.join(" ");
    $("#upload-status").hidden = true;
    renderFileQueue();
  }

  function renderFileQueue() {
    const queue = $("#file-queue");
    queue.replaceChildren();
    queue.hidden = selectedFiles.length === 0;
    if (!selectedFiles.length) {
      $("#generate-kit").disabled = true;
      return;
    }

    const heading = element("div", "file-queue-heading");
    heading.append(element("strong", "", "Ready to process"));
    heading.append(element("span", "", `${selectedFiles.length} / ${MAX_FILES} files`));
    queue.appendChild(heading);

    selectedFiles.forEach((file, index) => {
      const row = element("div", "file-row");
      row.appendChild(element("span", "file-icon", "▤"));
      const details = element("div", "file-details");
      details.append(element("strong", "", file.name));
      details.append(element("small", "", `${(file.size / 1024).toFixed(0)} KB`));
      const remove = element("button", "subtle-icon", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.addEventListener("click", () => {
        selectedFiles = selectedFiles.filter((_, i) => i !== index);
        renderFileQueue();
      });
      row.append(details, remove);
      queue.appendChild(row);
    });

    $("#generate-kit").disabled = false;
  }

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = "";
  });

  async function extractText(file) {
    const ext = extensionOf(file.name);
    if (["txt", "md", "csv"].includes(ext)) return file.text();

    if (["vtt", "srt"].includes(ext)) {
      const raw = await file.text();
      return raw
        .replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, "")
        .replace(/^\s*\d+\s*$/gm, "")
        .replace(/^\s*\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->.*$/gm, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\[[^\]]+\]/g, "")
        .replace(/\n{2,}/g, "\n")
        .trim();
    }

    if (ext === "docx") {
      if (!window.mammoth) throw new Error("The DOCX reader did not load. Check your internet connection and refresh the page.");
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value || "";
    }

    if (ext === "pdf") {
      if (!window.pdfjsLib) throw new Error("The PDF reader did not load. Check your internet connection and refresh the page.");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item) => item.str || "").join(" ");
        pages.push(text);
      }
      return pages.join("\n\n");
    }

    throw new Error(`${file.name}: this format is not supported.`);
  }

  // ---------------- Deterministic study-kit generation ----------------
  // This is an extractive, rule-based method. It does not use AI.

  const STOP_WORDS = new Set((
    "about above after again against all also am an and any are as at be because been before being below between " +
    "both but by can could did do does doing down during each few for from further had has have having he her here hers " +
    "herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only " +
    "or other our ours ourselves out over own same she should so some such than that the their theirs them themselves " +
    "then there these they this those through to too under until up very was we were what when where which while who whom " +
    "why will with would you your yours yourself yourselves use used using based section chapter page figure table example " +
    "however therefore includes including may might must one two three four five first second third new important material " +
    "student students lesson notes study source topic"
  ).split(/\s+/));

  function cleanText(text) {
    return String(text || "")
      .replace(/\u0000/g, " ")
      .replace(/[\t\f\v]+/g, " ")
      .replace(/\r/g, "\n")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n[ ]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_TEXT_CHARS);
  }

  function splitSentences(text) {
    return text
      .replace(/([.!?])\s+(?=[A-Z0-9])/g, "$1|SPLIT|")
      .split("|SPLIT|")
      .map((sentence) => sentence.replace(/\s+/g, " ").trim())
      .filter((sentence) => sentence.length >= 45 && sentence.length <= 500);
  }

  function wordsFrom(text) {
    return (text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [])
      .map((word) => word.replace(/^[-']+|[-']+$/g, ""))
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
  }

  function getKeywordStats(text) {
    const counts = new Map();
    wordsFrom(text).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
      .slice(0, 35)
      .map(([word]) => word);
  }

  function sentenceScore(sentence, keywords) {
    const lower = sentence.toLowerCase();
    const matches = keywords.filter((word) => new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(lower)).length;
    const definitionBonus = /\b(is defined as|refers to|means|is called|are called|is the process of|is a type of)\b/i.test(sentence) ? 2 : 0;
    const lengthPenalty = sentence.length > 270 ? 1 : 0;
    return matches + definitionBonus - lengthPenalty;
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function uniqueSentences(sentences) {
    const seen = new Set();
    return sentences.filter((sentence) => {
      const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function makeFlashcards(sentences, keywords, count) {
    const sorted = [...sentences].sort((a, b) => sentenceScore(b, keywords) - sentenceScore(a, keywords));
    const cards = [];
    const usedTerms = new Set();

    for (const sentence of sorted) {
      if (cards.length >= count) break;
      const lower = sentence.toLowerCase();
      const term = keywords.find((word) => !usedTerms.has(word) && new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(lower));
      if (!term) continue;
      usedTerms.add(term);
      cards.push({
        front: `What does your material say about “${term}”?`,
        back: sentence,
        topic: term.charAt(0).toUpperCase() + term.slice(1),
        difficulty: sentence.length > 220 ? "hard" : "medium",
        reviewStatus: "new",
        reviewCount: 0
      });
    }

    for (const sentence of sorted) {
      if (cards.length >= count) break;
      if (cards.some((card) => card.back === sentence)) continue;
      cards.push({
        front: "What is one important idea from the material?",
        back: sentence,
        topic: "Key idea",
        difficulty: "medium",
        reviewStatus: "new",
        reviewCount: 0
      });
    }

    return cards;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeQuizzes(sentences, keywords, count) {
    const ranked = [...sentences].sort((a, b) => sentenceScore(b, keywords) - sentenceScore(a, keywords));
    const questions = [];
    const used = new Set();

    for (const sentence of ranked) {
      if (questions.length >= count) break;
      const lower = sentence.toLowerCase();
      const term = keywords.find((word) => new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(lower));
      if (!term) continue;
      const uniqueKey = `${term}|${sentence}`;
      if (used.has(uniqueKey)) continue;
      used.add(uniqueKey);

      const blanked = sentence.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, "i"), "________");
      const distractors = keywords.filter((word) => word !== term && !lower.includes(word)).slice(0, 8);
      const chosenDistractors = shuffle(distractors).slice(0, 3);
      const options = shuffle([term, ...chosenDistractors]);
      const correctIndex = options.indexOf(term);

      if (options.length !== 4) continue;

      questions.push({
        question: `Choose the term that best completes this sentence: “${blanked}”`,
        options,
        correctIndex,
        explanation: `Your source states: “${sentence}”`,
        topic: term.charAt(0).toUpperCase() + term.slice(1)
      });
    }

    // If the source does not contain enough repeated terms, use statement recognition.
    for (const sentence of ranked) {
      if (questions.length >= count) break;
      if (questions.some((q) => q.explanation === `Your source states: “${sentence}”`)) continue;
      const alternatives = shuffle(ranked.filter((s) => s !== sentence)).slice(0, 3);
      if (alternatives.length !== 3) continue;
      const options = shuffle([sentence, ...alternatives]);
      questions.push({
        question: "Which statement is included in your uploaded material?",
        options,
        correctIndex: options.indexOf(sentence),
        explanation: `This statement appears in your source: “${sentence}”`,
        topic: "Source review"
      });
    }

    return questions;
  }

  function makeStudyNote(text, title, subject, keywords, sentences) {
    const ranked = [...sentences].sort((a, b) => sentenceScore(b, keywords) - sentenceScore(a, keywords));
    const summary = ranked.slice(0, 5);
    const important = ranked.slice(5, 15);
    const topicLine = keywords.slice(0, 12).map((word) => `• ${word.charAt(0).toUpperCase() + word.slice(1)}`).join("\n");
    const content = [
      "OVERVIEW",
      summary.length ? summary.join("\n\n") : text.slice(0, 1800),
      "KEY TERMS FOUND",
      topicLine || "No repeated key terms were found. Review the source headings and definitions.",
      "MORE DETAILS FROM YOUR SOURCE",
      important.join("\n\n") || "No additional distinct sentences were extracted.",
      "STUDY TIP",
      "Check each point against your original file. This summary was created using text extraction and simple keyword patterns, so it may miss context, diagrams, or important ideas expressed in unusual ways."
    ].join("\n\n");

    return {
      title: `Study notes: ${title}`,
      subject: subject || "General",
      content,
      materialId: "",
      createdAt: new Date().toISOString()
    };
  }

  function fileTitle(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Study material";
  }

  async function generateStudyKit() {
    if (!selectedFiles.length) return;

    const button = $("#generate-kit");
    const errorBox = $("#upload-error");
    const statusBox = $("#upload-status");
    button.disabled = true;
    button.textContent = "Reading your files...";
    errorBox.hidden = true;
    statusBox.hidden = true;

    try {
      const extracted = [];
      for (const file of selectedFiles) {
        const text = cleanText(await extractText(file));
        if (text.length < 80) {
          throw new Error(`${file.name}: not enough readable text was found. If this is a scanned PDF, it may need OCR, which this no-AI version does not include.`);
        }
        extracted.push({ name: file.name, text });
      }

      const combinedText = cleanText(extracted.map((item) => `SOURCE: ${item.name}\n${item.text}`).join("\n\n"));
      const sentences = uniqueSentences(splitSentences(combinedText));
      if (sentences.length < 3) {
        throw new Error("StudyMate could not find enough complete sentences. Try a text-based PDF, DOCX, TXT, or Markdown file.");
      }

      const keywords = getKeywordStats(combinedText);
      const requestedCards = Number($("#card-count").value);
      const requestedQuestions = Number($("#question-count").value);
      const subject = $("#material-subject").value.trim() || "General";
      const title = extracted.length === 1 ? fileTitle(extracted[0].name) : `${fileTitle(extracted[0].name)} and ${extracted.length - 1} more`;
      const materialId = id();

      const cards = makeFlashcards(sentences, keywords, requestedCards).map((card) => ({ ...card, id: id(), materialId }));
      const quizzes = makeQuizzes(sentences, keywords, requestedQuestions).map((question) => ({ ...question, id: id(), materialId, subject }));
      const note = makeStudyNote(combinedText, title, subject, keywords, sentences);
      note.id = id();
      note.materialId = materialId;

      const summary = sentences.slice().sort((a, b) => sentenceScore(b, keywords) - sentenceScore(a, keywords)).slice(0, 3).join(" ");
      const material = {
        id: materialId,
        title,
        subject,
        summary: summary.slice(0, 700),
        keyTopics: keywords.slice(0, 10),
        sourceFiles: extracted.map((item) => item.name),
        flashcardCount: cards.length,
        quizCount: quizzes.length,
        createdAt: new Date().toISOString()
      };

      if (!cards.length || !quizzes.length) {
        throw new Error("There was not enough varied text to create both flashcards and quiz questions. Try a longer or more detailed document.");
      }

      data.materials.unshift(material);
      data.flashcards.unshift(...cards);
      data.quizzes.unshift(...quizzes);
      data.notes.unshift(note);
      saveData();

      selectedFiles = [];
      $("#file-input").value = "";
      renderFileQueue();
      renderAll();

      statusBox.textContent = `Your study kit is ready: ${cards.length} flashcards, ${quizzes.length} quiz questions, and 1 organized note. This was generated locally from the text we could extract.`;
      statusBox.hidden = false;
      showToast("Your study kit has been created.");
      setView("flashcards");

    } catch (error) {
      errorBox.textContent = error instanceof Error ? error.message : "Could not process these files.";
      errorBox.hidden = false;
    } finally {
      button.disabled = selectedFiles.length === 0;
      button.textContent = "✦ Create my study kit";
    }
  }

  $("#generate-kit").addEventListener("click", generateStudyKit);

  // ---------------- Materials library ----------------

  function renderMaterials() {
    const list = $("#materials-list");
    list.replaceChildren();
    $("#material-count").textContent = `${data.materials.length} saved`;
    if (!data.materials.length) {
      list.appendChild(element("p", "quiet-copy", "Your uploaded study sources will appear here."));
      return;
    }
    data.materials.forEach((material) => {
      const card = element("article", "surface material-card");
      card.appendChild(element("span", "material-icon", "▤"));
      const copy = element("div", "material-copy");
      copy.append(element("strong", "", material.title));
      copy.append(element("span", "", `${material.subject} · ${material.flashcardCount} cards · ${material.quizCount} questions`));
      copy.append(element("small", "", material.sourceFiles.join(", ")));
      const remove = element("button", "subtle-icon", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Delete ${material.title} and its generated items`);
      remove.addEventListener("click", () => removeMaterial(material.id));
      card.append(copy, remove);
      list.appendChild(card);
    });
  }

  function removeMaterial(materialId) {
    const material = data.materials.find((item) => item.id === materialId);
    if (!material) return;
    if (!window.confirm(`Delete “${material.title}” and all generated notes, flashcards, and quiz questions?`)) return;
    data.materials = data.materials.filter((item) => item.id !== materialId);
    data.flashcards = data.flashcards.filter((item) => item.materialId !== materialId);
    data.quizzes = data.quizzes.filter((item) => item.materialId !== materialId);
    data.notes = data.notes.filter((item) => item.materialId !== materialId);
    saveData();
    renderAll();
    showToast("Study kit and generated materials deleted.");
  }

  // ---------------- Flashcards ----------------

  function renderFlashcards() {
    const hasCards = data.flashcards.length > 0;
    $("#flashcard-content").hidden = !hasCards;
    $("#flashcard-empty").hidden = hasCards;
    if (!hasCards) return;

    if (currentCardIndex >= data.flashcards.length) currentCardIndex = 0;
    const card = data.flashcards[currentCardIndex];
    $("#card-progress").textContent = `${currentCardIndex + 1} / ${data.flashcards.length}`;
    $("#card-side-label").textContent = cardFlipped ? "ANSWER" : "QUESTION";
    $("#card-text").textContent = cardFlipped ? card.back : card.front;
    $("#flip-hint").textContent = cardFlipped ? "Click to see the question again" : "Click the card to reveal the answer";
    $("#card-topic").textContent = card.topic || "Study material";
    $("#study-flashcard").classList.toggle("flipped", cardFlipped);
    $("#card-rating").hidden = !cardFlipped;
    $("#deck-heading").textContent = `${data.flashcards.length} cards in your deck`;

    const list = $("#generated-card-list");
    list.replaceChildren();
    data.flashcards.forEach((item, index) => {
      const row = element("button", `generated-list-row${index === currentCardIndex ? " current" : ""}`);
      row.type = "button";
      row.append(element("span", "row-number", String(index + 1).padStart(2, "0")));
      row.append(element("span", "", item.front));
      row.addEventListener("click", () => {
        currentCardIndex = index;
        cardFlipped = false;
        renderFlashcards();
      });
      list.appendChild(row);
    });
  }

  $("#study-flashcard").addEventListener("click", () => {
    if (!data.flashcards.length) return;
    cardFlipped = !cardFlipped;
    renderFlashcards();
  });

  $("#card-prev").addEventListener("click", () => {
    if (!data.flashcards.length) return;
    currentCardIndex = (currentCardIndex - 1 + data.flashcards.length) % data.flashcards.length;
    cardFlipped = false;
    renderFlashcards();
  });

  $("#card-next").addEventListener("click", () => {
    if (!data.flashcards.length) return;
    currentCardIndex = (currentCardIndex + 1) % data.flashcards.length;
    cardFlipped = false;
    renderFlashcards();
  });

  function rateCard(status) {
    const card = data.flashcards[currentCardIndex];
    if (!card) return;
    card.reviewStatus = status;
    card.reviewCount = (card.reviewCount || 0) + 1;
    saveData();
    currentCardIndex = (currentCardIndex + 1) % data.flashcards.length;
    cardFlipped = false;
    renderFlashcards();
    showToast(status === "known" ? "Marked as got it." : "Added to your review list.");
  }
  $("#rate-known").addEventListener("click", () => rateCard("known"));
  $("#rate-review").addEventListener("click", () => rateCard("review"));

  // ---------------- Quiz practice ----------------

  function renderQuizStats() {
    $("#quiz-total").textContent = `${data.quizzes.length} questions`;
    $("#attempt-count").textContent = data.attempts.length;
    const average = data.attempts.length
      ? Math.round(data.attempts.reduce((sum, attempt) => sum + attempt.correct / Math.max(1, attempt.total), 0) / data.attempts.length * 100)
      : null;
    $("#average-score").textContent = average === null ? "—" : `${average}%`;

    const missed = [...new Set(data.attempts.flatMap((attempt) => attempt.missedTopics || []))].slice(0, 8);
    const missedBox = $("#missed-topics");
    missedBox.replaceChildren();
    if (!missed.length) missedBox.append(element("p", "quiet-copy", "Complete a quiz to see topics you may want to revisit."));
    else missed.forEach((topic) => missedBox.append(element("span", "topic-chip", topic)));
  }

  function renderQuizzes() {
    const hasQuestions = data.quizzes.length > 0;
    $("#quiz-content").hidden = !hasQuestions;
    $("#quiz-empty").hidden = hasQuestions;
    renderQuizStats();
    if (!hasQuestions) return;
    renderQuizRunner();
  }

  function startQuiz() {
    currentQuiz = shuffle(data.quizzes).slice(0, Math.min(10, data.quizzes.length));
    quizIndex = 0;
    quizAnswer = null;
    quizScore = 0;
    quizAnswered = [];
    renderQuizRunner();
  }

  $("#start-quiz").addEventListener("click", startQuiz);

  function renderQuizRunner() {
    const runner = $("#quiz-runner");
    runner.replaceChildren();
    $("#quiz-heading").textContent = currentQuiz.length ? "You're in practice mode" : "Ready when you are";

    if (!currentQuiz.length) {
      const box = element("div", "quiz-start");
      box.append(element("span", "", "✏️"));
      box.append(element("h3", "", "Test what you remember"));
      box.append(element("p", "", "Questions are taken from your generated study library. Your results help the Study Coach suggest topics to revisit."));
      const button = element("button", "primary-button", "Start practice test →");
      button.type = "button";
      button.addEventListener("click", startQuiz);
      box.append(button);
      runner.append(box);
      return;
    }

    if (quizIndex >= currentQuiz.length) {
      const result = element("div", "quiz-result");
      result.append(element("span", "", "🎉"));
      result.append(element("h3", "", `You scored ${quizScore} out of ${currentQuiz.length}`));
      const percent = Math.round(quizScore / currentQuiz.length * 100);
      result.append(element("p", "", `${percent}% correct. Your result has been saved for your Study Coach check-in.`));
      const again = element("button", "primary-button", "Try another round ↻");
      again.type = "button";
      again.addEventListener("click", startQuiz);
      const coach = element("button", "text-button", "Review with Study Coach →");
      coach.type = "button";
      coach.addEventListener("click", () => setView("coach"));
      result.append(again, coach);
      runner.append(result);
      renderQuizStats();
      renderCoach();
      return;
    }

    const question = currentQuiz[quizIndex];
    const wrapper = element("div", "active-quiz");
    const progress = element("div", "quiz-progress");
    progress.append(element("span", "", `QUESTION ${quizIndex + 1} OF ${currentQuiz.length}`));
    const track = element("div", "quiz-progress-track");
    const fill = element("i");
    fill.style.width = `${((quizIndex + 1) / currentQuiz.length) * 100}%`;
    track.append(fill);
    progress.append(track);
    wrapper.append(progress);
    wrapper.append(element("p", "quiz-topic", question.topic || "Study review"));
    wrapper.append(element("h3", "quiz-question", question.question));

    const options = element("div", "quiz-options");
    question.options.forEach((option, index) => {
      const button = element("button", "quiz-option");
      button.type = "button";
      const letter = element("span", "", String.fromCharCode(65 + index));
      button.append(letter, document.createTextNode(option));
      if (quizAnswer !== null) {
        button.disabled = true;
        if (index === question.correctIndex) button.classList.add("correct");
        if (index === quizAnswer && index !== question.correctIndex) button.classList.add("incorrect");
      }
      button.addEventListener("click", () => answerQuestion(index));
      options.append(button);
    });
    wrapper.append(options);

    if (quizAnswer !== null) {
      const right = quizAnswer === question.correctIndex;
      const feedback = element("div", `quiz-feedback ${right ? "right" : "wrong"}`);
      feedback.append(element("strong", "", right ? "That's right!" : "Not quite — here's why."));
      feedback.append(element("p", "", question.explanation));
      wrapper.append(feedback);
      const next = element("button", "primary-button", quizIndex === currentQuiz.length - 1 ? "See my results →" : "Next question →");
      next.type = "button";
      next.addEventListener("click", advanceQuiz);
      const bottom = element("div", "quiz-bottom");
      bottom.append(element("span", "", `${quizScore} correct so far`), next);
      wrapper.append(bottom);
    }

    runner.append(wrapper);
  }

  function answerQuestion(index) {
    if (quizAnswer !== null) return;
    const question = currentQuiz[quizIndex];
    quizAnswer = index;
    quizAnswered.push({ question, chosenIndex: index, correct: index === question.correctIndex });
    if (index === question.correctIndex) quizScore += 1;
    renderQuizRunner();
  }

  function advanceQuiz() {
    quizIndex += 1;
    quizAnswer = null;
    if (quizIndex >= currentQuiz.length) {
      const missedQuestions = quizAnswered.filter((item) => !item.correct);
      data.attempts.unshift({
        id: id(),
        date: new Date().toISOString(),
        correct: quizScore,
        total: currentQuiz.length,
        missedTopics: [...new Set(missedQuestions.map((item) => item.question.topic || "Review"))],
        missedQuestions: missedQuestions.map((item) => ({
          topic: item.question.topic || "Review",
          question: item.question.question,
          explanation: item.question.explanation
        }))
      });
      data.attempts = data.attempts.slice(0, 40);
      saveData();
    }
    renderQuizRunner();
  }

  // ---------------- Notes ----------------

  function renderNotes() {
    const list = $("#notes-list");
    list.replaceChildren();
    $("#notes-empty").hidden = data.notes.length > 0;
    if (!data.notes.length) return;

    data.notes.forEach((note) => {
      const card = element("article", "surface note-card");
      const top = element("div", "note-card-top");
      top.append(element("span", "note-icon", "▤"));
      top.append(element("span", "note-subject", note.subject || "Study notes"));
      card.append(top);
      card.append(element("h3", "", note.title));
      card.append(element("p", "", note.content));
      const footer = element("div", "note-card-footer");
      footer.append(element("span", "", "Created from your uploaded file"));
      const remove = element("button", "subtle-icon", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Delete note");
      remove.addEventListener("click", () => {
        data.notes = data.notes.filter((item) => item.id !== note.id);
        saveData();
        renderNotes();
        showToast("Note deleted.");
      });
      footer.append(remove);
      card.append(footer);
      list.append(card);
    });
  }

  // ---------------- Rule-based Study Coach ----------------

  function renderCoach() {
    $("#coach-materials").textContent = data.materials.length;
    $("#coach-attempts").textContent = data.attempts.length;
    const average = data.attempts.length
      ? Math.round(data.attempts.reduce((sum, attempt) => sum + attempt.correct / Math.max(1, attempt.total), 0) / data.attempts.length * 100)
      : null;
    $("#coach-average").textContent = average === null ? "—" : `${average}%`;

    const feedback = $("#coach-feedback");
    feedback.replaceChildren();
    const suggestions = [];

    const reviewCards = data.flashcards.filter((card) => card.reviewStatus === "review");
    const openAssignments = data.assignments.filter((item) => !item.completed);
    const overdue = openAssignments.filter((item) => item.date < todayKey);
    const upcoming = openAssignments.filter((item) => item.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date));
    const misses = data.attempts.flatMap((attempt) => attempt.missedTopics || []);
    const missCounts = new Map();
    misses.forEach((topic) => missCounts.set(topic, (missCounts.get(topic) || 0) + 1));
    const repeated = [...missCounts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);

    if (!data.materials.length && !data.attempts.length && !data.flashcards.length) {
      suggestions.push({ title: "Start with one study source", body: "Upload a text-based PDF, DOCX, TXT, or Markdown file. StudyMate can use the words it extracts to prepare a starter study kit." });
    }
    if (repeated.length) {
      suggestions.push({ title: `Revisit ${repeated[0][0]}`, body: `This topic appeared in ${repeated[0][1]} practice rounds with missed answers. Read the related note, then retry a few questions.` });
    }
    if (reviewCards.length) {
      const topics = [...new Set(reviewCards.map((card) => card.topic).filter(Boolean))].slice(0, 4);
      suggestions.push({ title: "Review the cards you flagged", body: `${reviewCards.length} flashcard${reviewCards.length === 1 ? "" : "s"} marked “Need another look”${topics.length ? `: ${topics.join(", ")}` : ""}. Try those before moving to new material.` });
    }
    if (overdue.length) {
      suggestions.push({ title: "Choose one overdue assignment", body: `You have ${overdue.length} unfinished assignment${overdue.length === 1 ? "" : "s"} with a past date. Pick one, break it into a small first step, and update its date if needed.` });
    }
    if (upcoming.length) {
      suggestions.push({ title: "Prepare for your next deadline", body: `${upcoming[0].title} is scheduled for ${prettyDate(upcoming[0].date)}. A short review session now may make the due date feel easier.` });
    }
    if (data.attempts.length && average !== null) {
      suggestions.push({ title: average >= 80 ? "Keep using active recall" : "Use the explanations after each quiz", body: `Your average across saved practice rounds is ${average}%. This is a practice signal, not a grade. Review missed explanations and try again later.` });
    }
    if (suggestions.length < 2) {
      suggestions.push({ title: "Try a small focus session", body: "Choose one topic and spend 20–25 minutes reviewing. Take a short break, then explain the idea in your own words." });
    }

    const heading = element("h3", "", "A few ideas for your next study session");
    feedback.append(heading);
    suggestions.slice(0, 5).forEach((suggestion, index) => {
      const item = element("div", "coach-tip");
      item.append(element("span", "", `${index + 1}.`));
      const copy = element("div");
      copy.append(element("strong", "", suggestion.title));
      copy.append(element("p", "", suggestion.body));
      item.append(copy);
      feedback.append(item);
    });
  }

  $("#refresh-coach").addEventListener("click", () => {
    renderCoach();
    showToast("Your study check-in has been refreshed.");
  });

  // ---------------- Navigation and rendering ----------------

  function renderStats() {
    $("#stat-open").textContent = data.assignments.filter((item) => !item.completed).length;
    $("#stat-done").textContent = data.assignments.filter((item) => item.completed).length;
    $("#stat-todos").textContent = data.todos.filter((item) => !item.completed).length;
  }

  function renderAll() {
    renderCalendar();
    renderAssignments();
    renderTodos();
    renderStats();
    renderMaterials();
    renderFlashcards();
    renderQuizzes();
    renderNotes();
    renderCoach();
  }

  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $$("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setView(link.dataset.viewLink);
    });
  });

  $$('[data-goto]').forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.goto));
  });

  $("#mobile-menu").addEventListener("click", () => {
    $("#sidebar").classList.toggle("menu-open");
  });

  $("#top-date-label").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  }).toUpperCase();

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  renderAll();
})();
