# Arch.md Quality Rubric

Score each criterion using the bands below. Total = sum of scores; map to a letter grade via the SKILL.md grade scale.

When a criterion is genuinely N/A for the repo (e.g. no registry → no "Registry args" sub-item), score it `max` and add a note `N/A — redistributed`, or redistribute its weight proportionally across remaining criteria. Document the choice in the report.

---

## 1. Section completeness & order (max 15)

Required sections, in order: Role+Layer → Dependencies → Module structure → Public API → Key internal types → Extension pattern → Key files for development → Notes.

| Score | Condition |
|------:|-----------|
| 15 | All 8 sections present, correct order, `---` dividers between them |
| 12 | All present; minor order or divider issue |
| 8  | 1 section missing (non-Extension-pattern) |
| 4  | Extension pattern missing OR ≥2 sections missing |
| 0  | Free-form prose with no schema adherence |

## 2. Accuracy (max 15)

Verified against the subject repo when reachable. If unreachable, cap this score at 10 and note "unverified".

| Score | Condition |
|------:|-----------|
| 15 | All 4 verification probes pass (paths exist · inheritance correct · lib names match cmake · skills exist) |
| 11 | 1 probe fails (e.g. one stale path) |
| 7  | 2 probes fail |
| 3  | ≥3 probes fail or a load-bearing claim is wrong (e.g. wrong base class for the main impl) |
| 0  | Doc describes a different repo than its title claims |

## 3. Extension pattern depth (max 15)

Section quality. A gold-standard Extension pattern block has all 5 sub-items below.

| Score | Condition |
|------:|-----------|
| 15 | All 5 sub-items present and correct: Pimpl line uses `→` + base class; Orchestration names dispatch site; Registry args list semantics; Optional hooks named with purpose; In-repo skills linked (or section justifies absence) |
| 11 | 4 of 5 sub-items correct |
| 7  | Pimpl + orchestration covered, but registry args missing semantics OR hooks unmentioned despite existing |
| 3  | Section exists but reads as a class listing rather than an extension guide |
| 0  | Section missing despite repo having registry/factory/Pimpl |

## 4. Conciseness (max 10)

| Score | Condition |
|------:|-----------|
| 10 | No derivable info, no cross-section redundancy, no method signatures, `toolchains/` excluded |
| 7  | One minor redundancy or one borderline-derivable bullet |
| 4  | Multiple redundancies OR a method signature leaked in |
| 0  | Reads like a `tree` + `grep` dump |

## 5. Key internal types (max 10)

| Score | Condition |
|------:|-----------|
| 10 | One bullet per type; `<Type> : <Base> → <path>`; non-obvious clarifier only where needed |
| 7  | Format right but one type missing inheritance or path |
| 4  | Bullets contain prose descriptions or method lists |
| 0  | Section absent or unrelated content |

## 6. Notes (max 10)

| Score | Condition |
|------:|-----------|
| 10 | Only non-obvious facts; runtime-deps-not-in-CMake flagged; package lib name verified against `cmake/*Config*.in` with release+debug variants |
| 7  | Mostly non-obvious; one item is derivable or one fact slightly off |
| 4  | Half the bullets are derivable; lib name not verified |
| 0  | Section contains only restatements of earlier sections |

## 7. Public API (max 5)

| Score | Condition |
|------:|-----------|
| 5 | Class names separated by `·`, trailing pointer `— see include/<repo>/`, no signatures, no descriptions |
| 3 | Names listed but format differs or contains brief descriptions |
| 0 | Method signatures present OR section absent |

## 8. Key files for development (max 5)

| Score | Condition |
|------:|-----------|
| 5 | 3–5 high-signal pointers covering config / extension point / registry / example |
| 3 | Present but too few (<3) or too many (>5) |
| 0 | Section absent or points to generic files (e.g. `CMakeLists.txt` with no specific reason) |

## 9. Dependencies block (max 5)

| Score | Condition |
|------:|-----------|
| 5 | Verbatim `extract-deps.py` output with header and category labels |
| 3 | Hand-edited but still structured |
| 0 | Free-form dependency prose or missing |

## 10. Length & density (max 5)

| Score | Condition |
|------:|-----------|
| 5 | ≤100 lines for typical repo; every line earns its tokens |
| 3 | 100–150 lines OR <60 lines (under-pointing) |
| 0 | >150 lines or essentially empty |

## 11. Markdown hygiene (max 5)

| Score | Condition |
|------:|-----------|
| 5 | Forward-slash paths, inline-code for identifiers, consistent tables, dividers between top-level sections only |
| 3 | One hygiene defect (e.g. inconsistent table columns) |
| 0 | Multiple defects or HTML/emoji present |
