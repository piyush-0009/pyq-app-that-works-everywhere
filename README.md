# Exam Question Bank Browser

A static, client-side web application for browsing and filtering exam questions with associated images, hosted directly on GitHub Pages.

---

## 📱 How It Works Across Devices & Browsers

### 🚀 Zero Server / No Build Required
- **Static Hosting**: The application runs completely in the browser using plain HTML, CSS, and JavaScript. No server-side code, Node.js runtime, or compilation is needed.
- **Instant Client-Side Filtering**: On first load, the browser fetches `data.json` into memory (~725 questions). All subsequent filtering, dynamic dropdown cascading, and searching happen sub-frame in memory on every keystroke or selection change.
- **Browser Compatibility**: Fully supported on current versions of Safari (iOS/iPadOS), Chrome, Edge, Firefox, and Samsung Internet.

### 📱 Mobile, Tablet & iPad Experience
- **Responsive Layout**: On wider screens (desktop/laptops), the filter controls appear in a sticky sidebar next to the question feed. On narrow viewports (tablets and phones), the layout reflows automatically into a single fluid column.
- **Touch Targets**: All dropdowns, inputs, checkboxes, and buttons maintain minimum 44px tap targets for easy touch interaction.
- **PWA & "Add to Home Screen" (iPad / iOS / Android)**:
  1. Open the site in Safari on your iPad or iPhone.
  2. Tap the **Share** button (the square with an arrow pointing up).
  3. Scroll down and tap **Add to Home Screen**.
  4. The web app will install as a standalone app with a dedicated icon (`icon.svg` / `apple-touch-icon.png`) and launch without browser chrome.

---

## 🖼️ How to Upload / Add More Images

All images are loaded relative to the repository root via `images/${filename}`.

1. **Add PNG Images to `images/` Directory**:
   Place new image files directly into the `images/` directory in the repository:
   ```
   /images/CSIR_ls_2026_06_s1_partA_Q1.png
   /images/CSIR_ls_2026_06_s1_partA_Q2.png
   ```

2. **Reference Filenames in `data.json`**:
   Ensure each question object in `data.json` lists the filename(s) in its `"images"` array property (do not include directory paths or backslashes):
   ```json
   {
     "id": "CSIR_ls_2026_06_s1_partA_Q1",
     "images": [
       "CSIR_ls_2026_06_s1_partA_Q1.png"
     ]
   }
   ```
   *For questions with multiple images (e.g. data interpretation / long-answer questions), list all image filenames in order:*
   ```json
   {
     "id": "CSIR_ls_2026_06_s2_partC_Q1",
     "images": [
       "CSIR_ls_2026_06_s2_partC_Q1_1.png",
       "CSIR_ls_2026_06_s2_partC_Q1_2.png"
     ]
   }
   ```

3. **Commit & Push to GitHub**:
   Commit the new image files and updated `data.json` to your GitHub repository:
   ```bash
   git add images/ data.json
   git commit -m "Add new question images"
   git push origin main
   ```
   GitHub Pages will automatically serve the updated images.

---

## 🗄️ How to Update the Database

The underlying question data originates from a SQLite database (`questions_v2.db`).

### Export Script (`export_data.py`)
To update `data.json` from `questions_v2.db`, execute the following Python script locally:

```python
import sqlite3
import json

conn = sqlite3.connect("questions_v2.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# 1. Fetch Questions
cur.execute("SELECT * FROM Questions")
questions = {r["QuestionID"]: dict(r) for r in cur.fetchall()}

# 2. Fetch Metadata
cur.execute("SELECT * FROM QuestionMetadata")
meta = {r["QuestionID"]: dict(r) for r in cur.fetchall()}

# 3. Fetch Images in order
cur.execute("SELECT * FROM Images ORDER BY QuestionID, ImageOrder")
images_by_q = {}
for r in cur.fetchall():
    images_by_q.setdefault(r["QuestionID"], []).append(r["FileName"])

output = []
for qid, q in questions.items():
    m = meta.get(qid, {})
    output.append({
        "id": qid,
        "exam": q["Exam"],
        "domain": q["Domain"],
        "year": q["Year"],
        "month": q["Month"],
        "session": q["Session"],
        "part": q["Part"],
        "subject": m.get("Subject"),          # null for uncategorized questions
        "chapter": m.get("Chapter"),
        "topic": m.get("Topic"),
        "taxonomyCode": m.get("TaxonomyCode"),
        "topicConfidence": m.get("TopicConfidence"),
        "correctOption": m.get("CorrectOption"),
        "answerConfidence": m.get("AnswerConfidence"),
        "needsReview": bool(m.get("NeedsReview")) if "NeedsReview" in m else None,
        "note": m.get("Note", ""),
        "promptVersion": m.get("PromptVersion"),
        "images": images_by_q.get(qid, []),
    })

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Exported {len(output)} questions, "
      f"{sum(1 for q in output if q['subject'] is None)} uncategorized.")
```

### Steps to Update Data:
1. Update your local SQLite database `questions_v2.db`.
2. Run `python export_data.py` to regenerate `data.json`.
3. Commit and push `data.json` to GitHub.

---

## 📁 Repository Layout

```
/
├── index.html        # Single-page HTML application
├── styles.css        # Responsive dark-theme styling & touch support
├── app.js            # Client-side filtering, taxonomy cascading, & rendering
├── data.json         # Array of question records + metadata
├── manifest.json     # PWA Web App Manifest
├── icon.svg          # SVG App Icon
├── apple-touch-icon.png # iOS / iPad Home Screen Touch Icon
└── images/           # Question PNG images (CSIR_*.png)
```
