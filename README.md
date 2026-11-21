# StudyMate — GitHub Pages Edition (No AI)

A browser-only study planner and study helper. This version uses **no AI API, no API key, no backend server, and no Render**. It is designed to run as a static site on GitHub Pages.

## What it does

- Monthly calendar with assignments attached to individual dates
- Assignment completion tracking and a to-do list
- Upload supported study files in the browser
- Extract readable text from PDF, DOCX, TXT, Markdown, CSV, and subtitle files
- Create starter flashcards, multiple-choice quizzes, and organized notes using deterministic text and keyword rules
- Practice quizzes with feedback and saved results
- Flashcard confidence ratings
- A rule-based Study Coach that reviews quiz mistakes, flashcard ratings, and upcoming planner tasks
- Save planner items and generated materials in the current browser using localStorage

## Important: no AI is used

The study-kit generator is **rule-based, not AI**. It identifies repeated terms and important sentences from extracted text. The generated cards, questions, and summaries may be incomplete or awkward. Always check them against the original material. The Study Coach uses saved scores and review ratings to make simple suggestions; it does not understand the source material like an AI tutor.

## Supported uploads

- PDF: text-based PDFs only; scanned image-only PDFs are not OCR'd
- DOCX
- TXT
- Markdown (`.md`)
- CSV
- Video caption/transcript files: WebVTT (`.vtt`) and SubRip (`.srt`)

PDF text extraction uses PDF.js and DOCX text extraction uses Mammoth from public CDNs, so those two formats require an internet connection when the site is open. TXT, Markdown, CSV, VTT, and SRT are read directly in the browser.

This version does **not** transcribe raw audio or video, read PowerPoint files, or OCR images. For a video lesson, upload its `.vtt` or `.srt` captions if you have them. For scanned PDFs, run OCR elsewhere and upload the resulting text document.

## Privacy and storage

- The app reads supported files locally in the browser; it does not upload them to a StudyMate server.
- The original files are not saved by StudyMate.
- Assignments, to-dos, generated cards, quizzes, notes, and quiz history are stored in the browser's localStorage on that device.
- The information does not sync across browsers or devices.
- Clearing browser site data can remove saved StudyMate information.
- The GitHub Pages website is public. Never commit private school files or personal study materials to the repository.

## Publish with GitHub Pages — no Render

1. Open the `PremSSMB/StudyMate` repository on GitHub.
2. Replace the root `index.html` with this edition's `index.html`.
3. Create/replace root `style.css` and root `app.js` with the matching files from this project.
4. Create an empty `.nojekyll` file in the repository root (optional but included here).
5. Commit the changes to the `main` branch.
6. Open **Settings → Pages**.
7. Under **Build and deployment**, choose **Deploy from a branch**.
8. Select branch `main` and folder `/(root)`, then click **Save**.
9. Wait for GitHub Pages to publish, then open the site URL shown on the Pages settings screen.

GitHub's branch publishing source can publish static files from the repository root. See the official [GitHub Pages publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Required root structure

```text
StudyMate/
├── index.html
├── style.css
├── app.js
├── README.md
└── .nojekyll
```

The earlier React/Node files (`src/`, `server/`, `package.json`, `vite.config.ts`, `tsconfig.json`, and `render.yaml`) are not used by this static edition. You can leave them in the repository while testing; the root `index.html` loads only `style.css` and `app.js`. After confirming the GitHub Pages site works, you may remove the unused files to keep the repository tidy.
