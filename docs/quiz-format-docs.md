# KQF — Kahoot Question Format
**Version 1.0 Specification**

---

## Overview

KQF is a plain-text, Markdown-compatible format for authoring interactive quiz content. It is human-readable, diff-friendly, and trivially machine-parseable with a line-by-line or regex-based parser. Files use the `.kqf` extension.

---

## File Structure

A `.kqf` file has two sections:

```
[FRONT MATTER]   ← YAML block between --- delimiters
[QUESTIONS]      ← One or more question blocks separated by ---
```

---

## 1. Front Matter

Delimited by `---` at the top of the file. Standard YAML.

```yaml
---
title: World Geography Quiz
description: Test your knowledge of world geography!
author: Jane Doe
version: 1.0
language: en
tags: [geography, world, capitals]
---
```

### Fields

| Field         | Type            | Required | Description                          |
|---------------|-----------------|----------|--------------------------------------|
| `title`       | string          | ✅       | Quiz display name                    |
| `description` | string          | ❌       | Short quiz description               |
| `author`      | string          | ❌       | Quiz author name                     |
| `version`     | string          | ❌       | Quiz version (semver recommended)    |
| `language`    | ISO 639-1 code  | ❌       | Quiz language (`en`, `fr`, `de`…)    |
| `tags`        | string[]        | ❌       | Searchable tags                      |

---

## 2. Question Blocks

Questions are separated by `---` (horizontal rules). Each block has:

1. **Question Header** — an ATX heading (`##`) with metadata
2. **Question Text** — one or more plain text lines
3. **Answer Content** — depends on question type
4. **Media Directives** — optional `@key: value` lines

---

## 3. Question Header Syntax

```
## {ID} | {type} | {time} | {points}
```

| Token    | Format              | Required | Example       |
|----------|---------------------|----------|---------------|
| `ID`     | alphanumeric slug   | ✅       | `Q1`, `q-3`  |
| `type`   | see types below     | ✅       | `singlechoice`|
| `time`   | integer + `s`       | ❌       | `30s`         |
| `points` | integer + `pts`     | ❌       | `1000pts`; **if omitted (or 0), score weight is 1** |

**Parseable regex:**
```
^## (?P<id>[^\|]+)\s*\|\s*(?P<type>[^\|]+)\s*(?:\|\s*(?P<time>\d+s))?\s*(?:\|\s*(?P<points>\d+pts))?$
```

---

## 4. Question Types

### 4a. `singlechoice`

Exactly one correct answer. Correct answer marked with `[x]`, wrong with `[ ]`.

```markdown
## Q1 | singlechoice | 30s | 1000pts
What is the capital of France?

- [x] Paris
- [ ] Lyon
- [ ] Marseille
- [ ] Nice
```

**Rules:**
- Minimum 2 answers, maximum 6
- Exactly 1 `[x]` required

---

### 4b. `multichoice`

One or more correct answers.

```markdown
## Q2 | multichoice | 45s | 500pts
Which of the following are countries in Scandinavia?

- [x] Norway
- [x] Sweden
- [x] Denmark
- [ ] Finland
- [ ] Germany
```

**Rules:**
- Minimum 2 answers, maximum 8
- At least 1 `[x]` required

---

### 4c. `truefalse`

Binary true/false question.

```markdown
## Q3 | truefalse | 15s | 500pts
Australia is both a country and a continent.

- [x] True
- [ ] False
```

**Rules:**
- Exactly 2 answers: `True` and `False` (case-insensitive)
- Exactly 1 `[x]` required
- No other answer options permitted

---

### 4d. `slider`

Numeric range answer with tolerance. Uses a `@slider:` directive block instead of list items.

```markdown
## Q4 | slider | 60s | 1000pts
In what year did the Berlin Wall fall?

@slider:
  correct: 1989
  min: 1950
  max: 2000
  step: 1
  tolerance: 2
  unit: year
```

**`@slider` fields:**

| Field       | Type   | Required | Description                                    |
|-------------|--------|----------|------------------------------------------------|
| `correct`   | number | ✅       | The exact correct value                        |
| `min`       | number | ✅       | Minimum slider value                           |
| `max`       | number | ✅       | Maximum slider value                           |
| `step`      | number | ❌       | Increment step (default: `1`)                  |
| `tolerance` | number | ❌       | ±range still considered correct (default: `0`) |
| `unit`      | string | ❌       | Display unit label (`%`, `km`, `year`, etc.)   |

**Scoring with tolerance:** A response `r` is correct if `|r - correct| <= tolerance`.

---

## 5. Media Directives

Optional, placed after answer content. Each directive is a single line:

```
@{key}: {value}
```

| Directive | Description                          | Value type   |
|-----------|--------------------------------------|--------------|
| `@image`  | Display image with question          | URL, path to file, or relative ``media/...`` asset **directory** (last path segment has no extension; on disk that folder holds ``image.webp`` + ``thumb.webp``) |
| `@video`  | Autoplay video before/during question| URL or path  |
| `@audio`  | Play audio clip                      | URL or path  |
| `@hint`   | Optional hint shown to players       | Plain text   |

Multiple media directives may be used per question. Order determines render priority.

**Examples:**
```
@image: https://cdn.example.com/map.jpg
@audio: ./sounds/intro.mp3
@hint: Think about the Cold War era.
```

### Per-choice `@image` (singlechoice / multichoice)

For image-based answer options, `@image:` may also appear **immediately after** a `- [x]` / `- [ ]` line — the directive then attaches to that choice instead of the question. Only `@image` is allowed at the choice level (no `@video`, `@audio`, `@hint`). Path resolution and asset-directory semantics are identical to question-level `@image`.

```markdown
## Q | singlechoice | 20s | 1000pts
Which flag is Poland's?

- [x] (option A)
@image: ./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- [ ] (option B)
@image: ./media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

A choice may have text **or** image **or** both — the editor enforces that at least one is present.

**Asset directory:** for paths under ``media/`` whose last segment has no file extension, the value is stored as the **folder path** (no ``/image.webp`` suffix in the parsed model). On disk that folder still contains ``image.webp`` and ``thumb.webp`` (admin export layout). Examples:

```
@image: ./media/asset_cc0b501288944523b06ae7d26cf078ab
@image: ./media/asset_cc0b501288944523b06ae7d26cf078ab/
```

``http(s)`` URLs and non-asset paths (e.g. ``dog.jpg``) are stored unchanged. A legacy line ``@image: ./media/{asset_…}/image.webp`` (or ``thumb.webp``) for a canonical ``asset_{32 hex}`` id is **normalized** to ``./media/{asset_…}`` when parsing or serializing.

**Play session join:** ``kqf_with_absolute_media`` turns relative ``media/...`` into absolute URLs under ``{origin}/media/{quiz_id}/...``. If the URL’s last path segment has **no** extension, the join result is the **asset base URL** (no trailing ``/image.webp``); the participant app then appends ``/image.webp`` and ``/thumb.webp`` once when building image props (``resolveKqfPlayImageUrls`` in ``frontend/lib/media-url.ts``).

**Runtime loading (participant app):** ``ProgressiveQuizImage`` loads ``thumbUrl`` first when it differs from ``fullUrl``, then swaps to ``fullUrl`` after the full image is loaded in memory. ``resolveKqfPlayImageUrls`` builds ``fullUrl``/``thumbUrl`` from the join URL (asset directory → append ``/image.webp`` and ``/thumb.webp`` once).

---

## 6. Complete Grammar (EBNF)

```ebnf
file         = front_matter , { question_block } ;
front_matter = "---\n" , yaml_content , "---\n" ;
question_block = separator , header , "\n" , question_text , "\n" , answers , { directive } ;
separator    = "---\n" ;
header       = "## " , id , " | " , type , [ " | " , time ] , [ " | " , points ] , "\n" ;
id           = /[A-Za-z0-9_-]+/ ;
type         = "singlechoice" | "multichoice" | "truefalse" | "slider" ;
time         = /\d+s/ ;
points       = /\d+pts/ ;
question_text = { text_line } ;
answers      = choice_list | slider_block ;
choice_list  = { choice_item } ;
choice_item  = "- [" , marker , "] " , text_line , [ choice_image ] ;
choice_image = "@image: " , directive_value , "\n" ;
marker       = "x" | " " ;
slider_block = "@slider:\n" , { "  " , slider_field , "\n" } ;
slider_field = ( "correct" | "min" | "max" | "step" | "tolerance" ) , ": " , number
             | "unit" , ": " , string ;
directive    = "@" , directive_key , ": " , directive_value , "\n" ;
directive_key = "image" | "video" | "audio" | "hint" ;
```

---

## 7. Parsing Rules

1. Split file on `---` lines to get front matter + question chunks
2. Parse front matter as YAML
3. For each question chunk:
   - Match first line against header regex
   - Lines before first `- [` or `@slider:` are question text (trim)
   - Lines matching `- [x]` / `- [ ]` are answer options
   - `@slider:` block: read indented `key: value` lines until indent breaks
   - Lines matching `@key: value` after answers are directives
4. Validate per-type constraints (correct count, slider fields, etc.)
5. For `@image`, relative ``media/...`` values with no filename on the last segment are stored as the **asset directory path** (no ``/image.webp`` in the model); see **Media Directives** above.

---

## 8. Full Example

```markdown
---
title: Science Trivia
author: Quiz Bot
tags: [science, beginner]
---

## Q1 | singlechoice | 20s | 1000pts
What is the chemical symbol for water?

- [x] H2O
- [ ] CO2
- [ ] O2
- [ ] H2

@image: https://example.com/water.jpg

---

## Q2 | truefalse | 10s | 500pts
Sound travels faster than light.

- [ ] True
- [x] False

---

## Q3 | slider | 30s | 800pts
What is the boiling point of water in Celsius at sea level?

@slider:
  correct: 100
  min: 50
  max: 150
  step: 1
  tolerance: 0
  unit: °C

---

## Q4 | multichoice | 40s | 600pts
Which of these are noble gases?

- [x] Helium
- [x] Neon
- [ ] Oxygen
- [x] Argon
- [ ] Nitrogen

@hint: They're in the rightmost column of the periodic table.
```

---

## 9. Design Principles

- **Markdown-native**: Renders readably in any Markdown viewer
- **Line-oriented**: Each meaningful token is on its own line — no inline state
- **Fail-fast**: Invalid constraints (e.g. two `[x]` in `singlechoice`) should error at parse time, not runtime
- **Extensible**: New types or directives can be added without breaking existing parsers (unknown types/directives are skipped)
- **Diffable**: Plain text means version control works perfectly
