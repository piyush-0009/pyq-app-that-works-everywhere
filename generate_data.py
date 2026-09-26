import json
import os

# Generate 725 questions conforming to the prompt spec
questions = []

# List of real subjects, chapters, topics for CSIR Life Sciences
subjects_data = [
    {
        "subject": "General Aptitude",
        "chapters": [
            {"chapter": "Quantitative Aptitude", "topics": ["Quantitative Aptitude", "Numerical Ability", "Geometry & Mensuration"]},
            {"chapter": "Reasoning & Logic", "topics": ["Logical Deduction", "Data Interpretation", "Puzzles"]}
        ]
    },
    {
        "subject": "Molecules and their Interaction Relevant to Biology",
        "chapters": [
            {"chapter": "Structure of Atoms, Molecules and Bonds", "topics": ["Chemical Bonds", "Stabilizing Interactions", "Principles of Biophysical Chemistry"]},
            {"chapter": "Composition, Structure and Function of Biomolecules", "topics": ["Carbohydrates & Lipids", "Proteins & Nucleic Acids", "Enzyme Kinetics"]}
        ]
    },
    {
        "subject": "Cellular Organization",
        "chapters": [
            {"chapter": "Membrane Structure and Function", "topics": ["Plasma Membrane", "Transport Across Membranes", "Structural Organization of Organelles"]},
            {"chapter": "Organization of Genes and Chromosomes", "topics": ["Chromatin Structure", "Transposons", "Gene Families"]}
        ]
    },
    {
        "subject": "Fundamental Processes",
        "chapters": [
            {"chapter": "DNA Replication and Repair", "topics": ["Replication Fork", "DNA Repair Mechanisms", "Homologous Recombination"]},
            {"chapter": "RNA Synthesis and Processing", "topics": ["Transcription Factors", "RNA Splicing", "Post-transcriptional Modifications"]}
        ]
    },
    {
        "subject": "UNMAPPED",
        "chapters": [
            {"chapter": "UNMAPPED", "topics": ["UNMAPPED"]}
        ]
    }
]

# Total 725 questions:
# 290 (40%) Uncategorized (subject=None, etc.)
# 145 (20%) Legacy v3 (needsReview=true, promptVersion="v3", taxonomyCode/correctOption/answerConfidence=null)
# 290 (40%) v4 populated (mostly needsReview=false, promptVersion="v4")

# List existing PNG images in images/ directory
existing_pngs = sorted(os.listdir("images")) if os.path.exists("images") else []

# 5 questions with 2 images: let's use CSIR_ls_2025_07_s1_partA_Q1..5
multi_image_ids = {f"CSIR_ls_2025_07_s1_partA_Q{i}" for i in range(1, 6)}

for i in range(1, 726):
    # Construct QID
    if 1 <= i <= 20:
        qid = f"CSIR_ls_2025_07_s1_partA_Q{i}"
        exam, domain, year, month, session, part = "CSIR", "ls", 2025, 7, "s1", "A"
    elif 21 <= i <= 70:
        qid = f"CSIR_ls_2025_07_s1_partB_Q{i}"
        exam, domain, year, month, session, part = "CSIR", "ls", 2025, 7, "s1", "B"
    elif i == 71:
        qid = "CSIR_ls_2025_07_s1_partC_Q70"
        exam, domain, year, month, session, part = "CSIR", "ls", 2025, 7, "s1", "C"
    else:
        part_letter = "A" if i % 3 == 0 else ("B" if i % 3 == 1 else "C")
        year_val = 2023 + (i % 3)
        month_val = 6 if i % 2 == 0 else 12
        session_val = f"s{(i % 2) + 1}"
        qid = f"CSIR_ls_{year_val}_{month_val:02d}_{session_val}_part{part_letter}_Q{i}"
        exam, domain, year, month, session, part = "CSIR", "ls", year_val, month_val, session_val, part_letter

    # Images
    if qid in multi_image_ids:
        # Use existing image + first image as second image for demonstration
        images = [f"{qid}.png", existing_pngs[0] if existing_pngs else "CSIR_ls_2025_07_s1_partA_Q1.png"]
    else:
        if f"{qid}.png" in existing_pngs:
            images = [f"{qid}.png"]
        else:
            # Cycle through available pngs
            fallback_img = existing_pngs[(i - 1) % len(existing_pngs)] if existing_pngs else "CSIR_ls_2025_07_s1_partA_Q1.png"
            images = [fallback_img]

    # Assign category bucket
    # 1..290: Uncategorized (subject=None)
    # 291..435: Legacy v3
    # 436..725: v4 Populated
    if i <= 290:
        q_obj = {
            "id": qid,
            "exam": exam,
            "domain": domain,
            "year": year,
            "month": month,
            "session": session,
            "part": part,
            "subject": None,
            "chapter": None,
            "topic": None,
            "taxonomyCode": None,
            "topicConfidence": None,
            "correctOption": None,
            "answerConfidence": None,
            "needsReview": None,
            "note": "",
            "promptVersion": None,
            "images": images
        }
    elif i <= 435:
        # Legacy v3 metadata
        subj_choice = subjects_data[i % len(subjects_data)]
        chap_choice = subj_choice["chapters"][0]
        topic_choice = chap_choice["topics"][0]
        q_obj = {
            "id": qid,
            "exam": exam,
            "domain": domain,
            "year": year,
            "month": month,
            "session": session,
            "part": part,
            "subject": subj_choice["subject"],
            "chapter": chap_choice["chapter"],
            "topic": topic_choice,
            "taxonomyCode": None,
            "topicConfidence": 0.6,
            "correctOption": None,
            "answerConfidence": None,
            "needsReview": True,
            "note": "Legacy v3 import, requires v4 reclassification",
            "promptVersion": "v3",
            "images": images
        }
    else:
        # v4 Populated metadata
        s_idx = (i - 435) % len(subjects_data)
        subj_choice = subjects_data[s_idx]
        c_idx = (i - 435) % len(subj_choice["chapters"])
        chap_choice = subj_choice["chapters"][c_idx]
        t_idx = (i - 435) % len(chap_choice["topics"])
        topic_choice = chap_choice["topics"][t_idx]

        needs_rev = (i % 10 == 0) # Minority flagged True (~10%)
        correct_opt = (i % 4) + 1
        ans_conf = round(0.70 + ((i % 25) * 0.01), 2)
        top_conf = round(0.80 + ((i % 15) * 0.01), 2)
        tax_code = f"3.{(i % 5) + 1}"

        q_obj = {
            "id": qid,
            "exam": exam,
            "domain": domain,
            "year": year,
            "month": month,
            "session": session,
            "part": part,
            "subject": subj_choice["subject"],
            "chapter": chap_choice["chapter"],
            "topic": topic_choice,
            "taxonomyCode": tax_code,
            "topicConfidence": top_conf,
            "correctOption": correct_opt,
            "answerConfidence": ans_conf,
            "needsReview": needs_rev,
            "note": "Flagged for manual review" if needs_rev else "",
            "promptVersion": "v4",
            "images": images
        }

    questions.append(q_obj)

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"Generated data.json with {len(questions)} records.")
