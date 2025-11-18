"""
Partnership Value Proposition
Visualizes what AI Futures and Simulacra team each bring to the partnership
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Wedge
import numpy as np
import seaborn as sns

# Set seaborn theme
sns.set_theme(style="white", palette="deep")
palette = sns.color_palette("Set2", 4).as_hex()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
fig.suptitle('Partnership Value Proposition', fontsize=16, fontweight='bold')

# Left plot: Venn diagram showing overlap
ax1.set_xlim(0, 10)
ax1.set_ylim(0, 10)
ax1.set_aspect('equal')
ax1.axis('off')

# AI Futures circle
circle1 = Circle((3.5, 5), 2.5, color=palette[0], alpha=0.4,
                edgecolor='black', linewidth=3)
ax1.add_patch(circle1)
ax1.text(2, 7.5, 'AI Futures', fontsize=14, fontweight='bold', ha='center')

# Simulacra team circle
circle2 = Circle((6.5, 5), 2.5, color=palette[1], alpha=0.4,
                edgecolor='black', linewidth=3)
ax1.add_patch(circle2)
ax1.text(8, 7.5, 'Simulacra Team', fontsize=14, fontweight='bold', ha='center')

# What AI Futures brings
ai_futures_brings = [
    'Domain expertise',
    'Scenario design',
    'Policy network',
    'Credibility'
]
for i, item in enumerate(ai_futures_brings):
    ax1.text(2.2, 6.5 - i*0.5, f'• {item}', fontsize=9, va='center')

# What Simulacra brings
simulacra_brings = [
    'Working engine',
    'Tech execution',
    'UX design',
    'Shipping speed'
]
for i, item in enumerate(simulacra_brings):
    ax1.text(7.8, 6.5 - i*0.5, f'• {item}', fontsize=9, va='center')

# What we build together (overlap)
together = [
    'Viral game',
    'Research tool',
    'Policy platform'
]
for i, item in enumerate(together):
    ax1.text(5, 6 - i*0.6, f'★ {item}', fontsize=10, ha='center',
            fontweight='bold', bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.5))

ax1.set_title('Complementary Strengths', fontsize=13, fontweight='bold')

# Right plot: Value multiplier
ax2.set_xlim(0, 10)
ax2.set_ylim(0, 10)
ax2.axis('off')

# Draw equation-style visualization
# AI Futures value
ax2.add_patch(FancyBboxPatch((0.5, 7), 2, 1.5,
                            boxstyle="round,pad=0.1",
                            facecolor=palette[0],
                            edgecolor='black',
                            linewidth=2,
                            alpha=0.4))
ax2.text(1.5, 7.75, 'AI Futures', ha='center', fontsize=11, fontweight='bold')
ax2.text(1.5, 7.25, 'Expertise:\n7/10', ha='center', fontsize=9)

# Plus sign
ax2.text(3.5, 7.75, '+', ha='center', fontsize=24, fontweight='bold')

# Simulacra value
ax2.add_patch(FancyBboxPatch((4.5, 7), 2, 1.5,
                            boxstyle="round,pad=0.1",
                            facecolor=palette[1],
                            edgecolor='black',
                            linewidth=2,
                            alpha=0.4))
ax2.text(5.5, 7.75, 'Simulacra', ha='center', fontsize=11, fontweight='bold')
ax2.text(5.5, 7.25, 'Execution:\n8/10', ha='center', fontsize=9)

# Equals sign
ax2.text(7.5, 7.75, '=', ha='center', fontsize=24, fontweight='bold')

# Combined value (greater than sum of parts)
ax2.add_patch(FancyBboxPatch((3, 4.5), 4, 2,
                            boxstyle="round,pad=0.2",
                            facecolor=palette[2],
                            edgecolor='black',
                            linewidth=3,
                            alpha=0.5))
ax2.text(5, 5.8, 'Partnership', ha='center', fontsize=13, fontweight='bold')
ax2.text(5, 5.3, 'Combined Value', ha='center', fontsize=11)
ax2.text(5, 4.9, '10/10 ★', ha='center', fontsize=14, fontweight='bold')

# Draw arrows showing synergies
arrow1 = FancyArrowPatch((2.5, 7), (3.5, 6),
                        arrowstyle='->', mutation_scale=25,
                        linewidth=2, color=palette[0], alpha=0.6)
ax2.add_patch(arrow1)

arrow2 = FancyArrowPatch((5.5, 7), (6.5, 6),
                        arrowstyle='->', mutation_scale=25,
                        linewidth=2, color=palette[1], alpha=0.6)
ax2.add_patch(arrow2)

# List synergies below
synergies = [
    '1. Credibility × Virality = Mass adoption',
    '2. Scenarios × Engine = Infinite content',
    '3. Network × Tech = Policy impact',
    '4. Research × Platform = Publications'
]

for i, synergy in enumerate(synergies):
    ax2.text(5, 3.5 - i*0.4, synergy, ha='center', fontsize=9,
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

ax2.set_title('Value Multiplication (1+1=3)', fontsize=13, fontweight='bold')

plt.tight_layout()
plt.savefig('funding/diagrams/partnership_value.png', dpi=300, bbox_inches='tight')
print("Saved: partnership_value.png")

# Create second figure: Risk mitigation matrix
fig2, ax = plt.subplots(figsize=(12, 8))

risks = [
    {'name': 'LLM quality drops', 'without': 8, 'with': 3, 'mitigation': 'Formal models backstop'},
    {'name': 'Virality fails', 'without': 7, 'with': 4, 'mitigation': 'Progressive complexity'},
    {'name': 'Research validity', 'without': 6, 'with': 2, 'mitigation': 'AI Futures validation'},
    {'name': 'Policy adoption', 'without': 9, 'with': 3, 'mitigation': 'Credibility + network'},
    {'name': 'Tech execution', 'without': 5, 'with': 2, 'mitigation': 'Proven track record'},
]

categories = [r['name'] for r in risks]
without_partnership = [r['without'] for r in risks]
with_partnership = [r['with'] for r in risks]

x = np.arange(len(categories))
width = 0.35

# Use seaborn colors for risk bars
risk_colors = sns.color_palette("RdYlGn_r", 2).as_hex()
bars1 = ax.barh(x - width/2, without_partnership, width,
               label='Without Partnership', color=risk_colors[0], alpha=0.7)
bars2 = ax.barh(x + width/2, with_partnership, width,
               label='With Partnership', color=risk_colors[1], alpha=0.7)

ax.set_ylabel('Risk Factor', fontsize=12)
ax.set_xlabel('Risk Level (0-10)', fontsize=12)
ax.set_title('Risk Mitigation Through Partnership', fontsize=14, fontweight='bold')
ax.set_yticks(x)
ax.set_yticklabels(categories)
ax.legend(loc='upper right', fontsize=10)
ax.grid(True, axis='x', alpha=0.3)
ax.set_xlim(0, 10)

# Add risk reduction percentages
for i, risk in enumerate(risks):
    reduction = ((risk['without'] - risk['with']) / risk['without']) * 100
    ax.text(risk['without'] + 0.3, i, f'-{reduction:.0f}%',
           va='center', fontsize=9, fontweight='bold', color=risk_colors[1])

    # Add mitigation strategy
    ax.text(10.5, i, risk['mitigation'],
           va='center', ha='left', fontsize=8, style='italic',
           bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.5))

ax.set_xlim(0, 16)  # Extended to fit mitigation text

plt.tight_layout()
plt.savefig('funding/diagrams/risk_mitigation.png', dpi=300, bbox_inches='tight')
print("Saved: risk_mitigation.png")
plt.close('all')
