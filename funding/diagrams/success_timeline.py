"""
Success Timeline Visualization
Shows the 12-month roadmap with key milestones and metrics
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Rectangle, FancyBboxPatch
import numpy as np
import seaborn as sns

# Set seaborn theme
sns.set_theme(style="darkgrid", palette="deep")
palette = sns.color_palette("husl", 4).as_hex()

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 10))
fig.suptitle('12-Month Success Timeline', fontsize=16, fontweight='bold')

# Timeline data with seaborn colors
phases = [
    {'name': 'Phase 1: Polish', 'months': (0, 3), 'color': palette[0],
     'deliverable': 'Public beta', 'metrics': 'Alpha: 100 players'},
    {'name': 'Phase 2: Customize', 'months': (3, 6), 'color': palette[1],
     'deliverable': '2 new scenarios', 'metrics': 'Beta: 5K players'},
    {'name': 'Phase 3: Research', 'months': (6, 9), 'color': palette[2],
     'deliverable': 'Analytics + Mobile', 'metrics': '25K players'},
    {'name': 'Phase 4: Ecosystem', 'months': (9, 12), 'color': palette[3],
     'deliverable': 'Community platform', 'metrics': '100K+ players'}
]

# Top plot: Phase timeline
for phase in phases:
    start, end = phase['months']
    width = end - start
    rect = Rectangle((start, 0), width, 1,
                     facecolor=phase['color'],
                     edgecolor='black',
                     linewidth=2,
                     alpha=0.6)
    ax1.add_patch(rect)

    # Phase name
    ax1.text(start + width/2, 0.7, phase['name'],
            ha='center', va='center', fontsize=11, fontweight='bold')

    # Deliverable
    ax1.text(start + width/2, 0.4, phase['deliverable'],
            ha='center', va='center', fontsize=9, style='italic')

    # Metrics
    ax1.text(start + width/2, 0.1, phase['metrics'],
            ha='center', va='center', fontsize=8)

ax1.set_xlim(0, 12)
ax1.set_ylim(0, 1.2)
ax1.set_xlabel('Months', fontsize=12)
ax1.set_title('Development Phases', fontsize=14, fontweight='bold')
ax1.set_xticks(range(0, 13))
ax1.set_yticks([])
ax1.grid(True, axis='x', alpha=0.3)

# Bottom plot: Cumulative growth metrics
months = np.arange(0, 13)

# Player growth (exponential)
players = [0, 50, 100, 500, 2000, 5000, 10000, 15000, 25000, 40000, 70000, 100000, 150000]

# Scenarios available
scenarios = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8]

# Research outputs
papers = [0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 5]

# Plot metrics with seaborn colors
metric_colors = sns.color_palette("Set2", 3).as_hex()
ax2_twin = ax2.twinx()
ax2_twin2 = ax2.twinx()
ax2_twin2.spines['right'].set_position(('outward', 60))

line1 = sns.lineplot(x=months, y=np.array(players)/1000, marker='o', linewidth=3,
                     markersize=8, color=metric_colors[0], label='Players (thousands)', ax=ax2)
line2 = sns.lineplot(x=months, y=scenarios, marker='s', linewidth=3,
                     markersize=8, color=metric_colors[1], label='Scenarios', ax=ax2_twin)
line3 = sns.lineplot(x=months, y=papers, marker='^', linewidth=3,
                     markersize=8, color=metric_colors[2], label='Research Papers', ax=ax2_twin2)

ax2.set_xlabel('Months', fontsize=12)
ax2.set_ylabel('Players (thousands)', fontsize=12, color=metric_colors[0])
ax2_twin.set_ylabel('Scenarios Available', fontsize=12, color=metric_colors[1])
ax2_twin2.set_ylabel('Research Papers', fontsize=12, color=metric_colors[2])

ax2.tick_params(axis='y', labelcolor=metric_colors[0])
ax2_twin.tick_params(axis='y', labelcolor=metric_colors[1])
ax2_twin2.tick_params(axis='y', labelcolor=metric_colors[2])

ax2.set_xlim(0, 12)
ax2.set_title('Cumulative Growth Metrics', fontsize=14, fontweight='bold')
ax2.set_xticks(range(0, 13))

# Combined legend
ax2.legend(loc='upper left', fontsize=10)
ax2_twin.get_legend().remove()
ax2_twin2.get_legend().remove()

# Add milestone markers
milestones = [
    (3, 'Public Beta Launch'),
    (6, 'Scenario Editor Live'),
    (9, 'First Research Paper'),
    (12, '100K Players')
]

for month, label in milestones:
    ax2.axvline(x=month, color='red', linestyle='--', alpha=0.3, linewidth=2)
    ax2.text(month, max(np.array(players)/1000) * 0.9, label,
            rotation=90, va='bottom', ha='right', fontsize=9,
            bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.3))

plt.tight_layout()
plt.savefig('funding/diagrams/success_timeline.png', dpi=300, bbox_inches='tight')
print("Saved: success_timeline.png")
plt.close('all')
