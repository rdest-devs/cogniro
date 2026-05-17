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
| `points` | integer + `pts`     | ❌       | `1000pts`     |

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
| `@image`  | Display image with question          | URL or path  |
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
choice_item  = "- [" , marker , "] " , text_line ;
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
