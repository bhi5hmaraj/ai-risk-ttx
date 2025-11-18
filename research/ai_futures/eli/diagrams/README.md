# ELI Diagrams

This directory contains Mermaid diagrams for the ELI (Explain Like I'm) documentation.

## Current Status

**Mermaid code is currently embedded directly in the markdown files** because:
1. GitHub renders Mermaid natively (no SVGs needed for web viewing)
2. mermaid-cli installation failed due to network restrictions in the current environment

## File Organization

```
eli/
├── 5_years_old.md          # Contains inline mermaid diagrams
├── 15_years_old.md         # Contains inline mermaid diagrams
├── engineering_graduate.md # Contains inline mermaid diagrams
├── README.md               # Navigation guide
└── diagrams/
    ├── README.md           # This file
    ├── generate_svgs.sh    # Script to generate SVGs
    └── *.mmd               # (To be created) Extracted mermaid files
    └── *.svg               # (To be generated) SVG outputs
```

## Generating SVGs (For Local Viewing or Offline Docs)

### Option 1: Install mermaid-cli locally

```bash
npm install -g @mermaid-js/mermaid-cli
cd diagrams/
./generate_svgs.sh
```

### Option 2: Use Docker

```bash
docker pull minlag/mermaid-cli
cd diagrams/
./generate_svgs.sh --docker
```

### Option 3: Online Tool

1. Copy mermaid code from markdown files
2. Paste into [Mermaid Live Editor](https://mermaid.live)
3. Export as SVG
4. Save to this directory

## Extracting Mermaid to .mmd Files

Currently, Mermaid diagrams are embedded in markdown. To extract them to separate .mmd files:

```bash
# TODO: Create extraction script
./extract_mermaid.sh ../5_years_old.md
./extract_mermaid.sh ../15_years_old.md
./extract_mermaid.sh ../engineering_graduate.md
```

This will create:
- `5yo_traffic_light.mmd`
- `5yo_adventure.mmd`
- `15yo_rpg_states.mmd`
- etc.

## Diagram Inventory

### 5 Year Old Level (5_years_old.md)

1. **Traffic Light** - Basic state machine
2. **Choose Your Adventure** - Decision tree
3. **Time Limits** - Deadline constraints
4. **Dice Game** - Probability introduction
5. **Safe Path Game** - Safety analysis
6. **Robot Building** - AI application

### 15 Year Old Level (15_years_old.md)

1. **RPG States** - Complex FSM
2. **Battle Royale Zones** - Time-indexed states
3. **Zone Timeline** - Gantt chart
4. **Loot Box** - Probability distribution
5. **AI Deployment Strategies** - MDP comparison
6. **Speedrun Verification** - Property checking
7. **Game Theory Matrix** - Multi-actor strategies
8. **AI2027 Complete Model** - Integrated example

### Engineering Graduate Level (engineering_graduate.md)

1. **Chemical Reactor** - Industrial FSM
2. **AI Capability Levels** - Tech FSM
3. **Batch Process Timeline** - Time constraints
4. **Component Failure** - Reliability MDP
5. **AI Deployment MDP** - Risk analysis
6. **HAZOP Analysis** - Safety verification
7. **Model Checking Flow** - Verification process
8. **Multi-Objective Optimization** - Trade-offs
9. **Industrial System** - Complete integration
10. **AI System Parallel** - AI governance analogy

## Why Inline Mermaid vs Separate SVGs?

### Advantages of Inline Mermaid (Current Approach)
✓ Renders natively on GitHub
✓ Easy to edit (just text)
✓ Version control friendly
✓ No build step required
✓ Works in most modern markdown viewers

### Advantages of Separate SVGs
✓ Works offline without mermaid support
✓ Can be styled/edited in vector tools
✓ Guaranteed rendering (no parser differences)
✓ Faster loading (pre-rendered)

### Our Approach
- **Primary**: Inline mermaid (best for GitHub/web)
- **Optional**: Generate SVGs for offline/print docs

## Troubleshooting

### mermaid-cli installation fails

**Problem**: Network restrictions prevent downloading Chromium

**Solution**: Use Docker method or online editor

### Diagram doesn't render

**Problem**: Mermaid syntax error

**Solution**:
1. Copy code to [Mermaid Live](https://mermaid.live)
2. Fix syntax errors
3. Update markdown file

### Need print-ready diagrams

**Problem**: Want high-quality PDFs/images

**Solution**:
1. Generate SVGs with this script
2. Open in Inkscape/Illustrator
3. Export to desired format

## Contributing

When adding new diagrams to ELI docs:

1. **Embed in markdown**:
   ```markdown
   ```mermaid
   graph TD
       A[Start] --> B[End]
   ```
   ```

2. **Test syntax** at [mermaid.live](https://mermaid.live)

3. **Optional**: Extract to .mmd file and add to inventory above

4. **Update this README** with diagram description

## Future Work

- [ ] Create `extract_mermaid.sh` script to auto-extract from markdown
- [ ] Generate all SVGs in CI/CD pipeline
- [ ] Add PNG exports for maximum compatibility
- [ ] Create diagram style guide (colors, fonts, etc.)

---

**For now**: Diagrams live in the markdown files and render natively on GitHub!
