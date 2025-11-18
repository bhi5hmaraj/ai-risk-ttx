"""
Player Journey Visualization
Shows the progression from casual player to researcher across engagement dimensions
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np
import seaborn as sns

# Set seaborn style and palette
sns.set_theme(style="darkgrid", palette="deep")
colors = sns.color_palette("husl", 3).as_hex()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
fig.suptitle('Player Journey: From Casual to Research Use', fontsize=16, fontweight='bold')

# Left plot: Engagement Funnel
categories = ['Curious Reader\n(30 min)', 'Serious Thinker\n(2 hours)', 'Researcher\n(Ongoing)']
players = [1000000, 50000, 1000]  # Estimated numbers

sns.barplot(x=players, y=categories, palette=colors, alpha=0.7, ax=ax1, edgecolor='black', linewidth=1.5)
ax1.set_xlabel('Number of Users (log scale)', fontsize=12)
ax1.set_title('Engagement Funnel', fontsize=14, fontweight='bold')
ax1.set_xscale('log')
ax1.set_ylabel('')

# Add value labels
for i, (cat, val) in enumerate(zip(categories, players)):
    ax1.text(val * 1.2, i, f'{val:,}', va='center', fontsize=11, fontweight='bold')

# Right plot: Value Delivered vs Time Investment
time_investment = [0.5, 2, 10]  # hours
value_delivered = [1, 5, 20]  # arbitrary units

sns.scatterplot(x=time_investment, y=value_delivered, s=[500, 1000, 1500],
               hue=categories, palette=colors, alpha=0.6, edgecolor='black', linewidth=2, ax=ax2, legend=False)

# Add labels for each point
labels = ['Quick insight\n"Racing is hard"',
          'Strategic depth\n"Trust dynamics"',
          'Research output\n"Published findings"']

for i, (x, y, label) in enumerate(zip(time_investment, value_delivered, labels)):
    ax2.annotate(label, (x, y), xytext=(10, 10), textcoords='offset points',
                bbox=dict(boxstyle='round,pad=0.5', facecolor=colors[i], alpha=0.3),
                fontsize=10, ha='left')

ax2.set_xlabel('Time Investment (hours)', fontsize=12)
ax2.set_ylabel('Value Delivered (insight depth)', fontsize=12)
ax2.set_title('Value vs Time Investment', fontsize=14, fontweight='bold')
ax2.grid(True, alpha=0.3)
ax2.set_xlim(0, 12)
ax2.set_ylim(0, 25)

plt.tight_layout()
plt.savefig('funding/diagrams/player_journey.png', dpi=300, bbox_inches='tight')
print("Saved: player_journey.png")

# Create second figure: Progression pathway
fig2, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.axis('off')

# Draw progression boxes with seaborn colors
palette = sns.color_palette("husl", 3).as_hex()
stages = [
    {'name': 'Casual Player', 'time': '30 min', 'outcome': 'One key insight',
     'x': 1, 'y': 7, 'color': palette[0]},
    {'name': 'Engaged Thinker', 'time': '2 hours', 'outcome': 'Strategic intuition',
     'x': 4.5, 'y': 7, 'color': palette[1]},
    {'name': 'Researcher', 'time': 'Ongoing', 'outcome': 'Published research',
     'x': 8, 'y': 7, 'color': palette[2]}
]

for i, stage in enumerate(stages):
    # Draw box
    box = FancyBboxPatch((stage['x'] - 0.8, stage['y'] - 1), 1.6, 2,
                         boxstyle="round,pad=0.1",
                         facecolor=stage['color'],
                         edgecolor='black',
                         linewidth=2,
                         alpha=0.3)
    ax.add_patch(box)

    # Add text
    ax.text(stage['x'], stage['y'] + 0.5, stage['name'],
           ha='center', va='center', fontsize=12, fontweight='bold')
    ax.text(stage['x'], stage['y'], stage['time'],
           ha='center', va='center', fontsize=10, style='italic')
    ax.text(stage['x'], stage['y'] - 0.5, stage['outcome'],
           ha='center', va='center', fontsize=9, wrap=True)

    # Draw arrow to next stage
    if i < len(stages) - 1:
        arrow = FancyArrowPatch((stage['x'] + 0.9, stage['y']),
                               (stages[i+1]['x'] - 0.9, stages[i+1]['y']),
                               arrowstyle='->', mutation_scale=30,
                               linewidth=3, color='gray', alpha=0.6)
        ax.add_patch(arrow)

# Add features unlocked at each stage
features = [
    {'stage': 0, 'features': ['• Quick Play mode', '• Single scenario', '• AI opponents']},
    {'stage': 1, 'features': ['• Custom scenarios', '• Multiple strategies', '• Parameter tuning']},
    {'stage': 2, 'features': ['• Batch simulations', '• API access', '• Data export']}
]

for feat in features:
    feature_text = '\n'.join(feat['features'])
    ax.text(stages[feat['stage']]['x'], stages[feat['stage']]['y'] - 2.5,
           feature_text, ha='center', va='top', fontsize=9,
           bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

ax.set_title('Progressive Complexity: Same Engine, Different Interfaces',
            fontsize=16, fontweight='bold', pad=20)

plt.savefig('funding/diagrams/progression_pathway.png', dpi=300, bbox_inches='tight')
print("Saved: progression_pathway.png")
plt.close('all')
