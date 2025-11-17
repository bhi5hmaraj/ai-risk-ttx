# AI2027 Causal DAG Visualization

```mermaid
graph TD
    current_2024["Current State (Late 2024)<br/>Q4 2024<br/>P=1.0"]
    gpt5_level["GPT-5 Level (~College Graduate)<br/>2025-2026<br/>P=0.7"]
    agi_2027["AGI / Superhuman AI Researcher<br/>Early-Mid 2027<br/>P=0.5"]
    superintelligence["Superintelligence (ASI)<br/>Late 2027<br/>P=0.3"]
    race_dynamics["US-China AI Race<br/>2025-2026<br/>P=0.6"]

    current_2024 -->|Continued investment in larger training runs<br/>conf:0.60| gpt5_level
    current_2024 -->|Continued ML research yields efficiency gains<br/>conf:0.40| gpt5_level
    linkStyle algo_progress stroke:#ff0000,stroke-width:2px
    gpt5_level -->|Scaffolding + unhobbling + agentic capabilities em...<br/>conf:0.15| agi_2027
    linkStyle to_agi stroke:#ff0000,stroke-width:2px
    agi_2027 -->|AGI systems recursively self-improve<br/>conf:-0.10| superintelligence
    linkStyle to_foom stroke:#ff0000,stroke-width:2px
    current_2024 -->|China recognizes strategic importance of AGI<br/>conf:0.65| race_dynamics
    current_2024 -->|Major espionage incident becomes public<br/>conf:0.50| race_dynamics
    race_dynamics -->|Competitive pressure overrides safety concerns<br/>conf:0.60| agi_2027
    gpt5_level -->|Capability demonstrations make strategic importanc...<br/>conf:0.70| race_dynamics
```