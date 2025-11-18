"""
Impact Dimensions Visualization
Shows how Simulacra creates value across three dimensions: viral reach, research depth, policy impact
"""

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import seaborn as sns

# Set seaborn theme
sns.set_theme(style="darkgrid", palette="deep")
palette = sns.color_palette("husl", 4).as_hex()

# Create figure with subplots
fig = plt.figure(figsize=(16, 10))
fig.suptitle('Three-Dimensional Impact: Viral × Research × Policy', fontsize=16, fontweight='bold')

# 3D scatter plot
ax1 = fig.add_subplot(121, projection='3d')

# Define impact scenarios with seaborn colors
scenarios = [
    {'name': 'Casual Players', 'viral': 9, 'research': 1, 'policy': 2,
     'size': 1000, 'color': palette[0]},
    {'name': 'Engaged Users', 'viral': 7, 'research': 5, 'policy': 6,
     'size': 500, 'color': palette[1]},
    {'name': 'Researchers', 'viral': 3, 'research': 10, 'policy': 7,
     'size': 300, 'color': palette[2]},
    {'name': 'Policymakers', 'viral': 4, 'research': 6, 'policy': 10,
     'size': 400, 'color': palette[3]},
]

for scenario in scenarios:
    ax1.scatter(scenario['viral'], scenario['research'], scenario['policy'],
               s=scenario['size'], c=scenario['color'], alpha=0.6,
               edgecolors='black', linewidth=2, label=scenario['name'])

ax1.set_xlabel('Viral Reach', fontsize=11)
ax1.set_ylabel('Research Depth', fontsize=11)
ax1.set_zlabel('Policy Impact', fontsize=11)
ax1.set_title('Impact Space', fontsize=13, fontweight='bold')
ax1.legend(loc='upper left', fontsize=9)
ax1.set_xlim(0, 10)
ax1.set_ylim(0, 10)
ax1.set_zlim(0, 10)

# 2D comparison: Existing tools vs Simulacra
ax2 = fig.add_subplot(122)

# Comparison data
tools = ['Academic\nPapers', 'Policy\nBriefs', 'Twitter\nThreads',
         'Tabletop\nExercises', 'AI 2027\nArticle', 'Simulacra\n(Goal)']

viral_reach = [2, 3, 9, 1, 10, 9]
research_depth = [9, 5, 1, 7, 4, 8]
policy_impact = [5, 8, 2, 6, 7, 9]

# Use seaborn colors for comparison
gray = sns.color_palette("Greys", 6)[3]
highlight_colors = sns.color_palette("bright", 2).as_hex()
colors_tools = [gray, gray, gray, gray, highlight_colors[0], highlight_colors[1]]
sizes = [200, 200, 200, 200, 400, 600]

for i, tool in enumerate(tools):
    # Plot reach vs depth
    circle = plt.Circle((viral_reach[i], research_depth[i]),
                       policy_impact[i]/30,
                       color=colors_tools[i],
                       alpha=0.5,
                       edgecolor='black',
                       linewidth=2)
    ax2.add_patch(circle)

    # Add labels
    ax2.text(viral_reach[i], research_depth[i], tool,
            ha='center', va='center', fontsize=8 if i < 5 else 10,
            fontweight='normal' if i < 5 else 'bold')

ax2.set_xlabel('Viral Reach (millions of people)', fontsize=12)
ax2.set_ylabel('Research Depth (rigor)', fontsize=12)
ax2.set_title('Simulacra vs Existing Tools\n(Circle size = Policy Impact)', fontsize=13, fontweight='bold')
ax2.set_xlim(0, 11)
ax2.set_ylim(0, 11)
ax2.grid(True, alpha=0.3)
ax2.set_aspect('equal')

# Add quadrant labels
ax2.text(9, 9, 'Holy Grail\n(High reach × depth)', ha='center', fontsize=9,
        bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.3))
ax2.text(2, 9, 'Academic\n(Deep, niche)', ha='center', fontsize=9,
        bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
ax2.text(9, 2, 'Viral Fluff\n(Reach, no depth)', ha='center', fontsize=9,
        bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.3))

plt.tight_layout()
plt.savefig('funding/diagrams/impact_dimensions.png', dpi=300, bbox_inches='tight')
print("Saved: impact_dimensions.png")

# Create second figure: Impact over time
fig2, ax = plt.subplots(figsize=(14, 8))

months = np.arange(0, 13)

# Different impact curves
viral_curve = 10 * (1 - np.exp(-months/3))  # Fast growth
research_curve = 8 * (1 - np.exp(-months/6))  # Slower, sustained
policy_curve = 6 * (1 - np.exp(-months/4))  # Medium

# Use seaborn colors for curves
curve_colors = sns.color_palette("Set2", 3).as_hex()

sns.lineplot(x=months, y=viral_curve, marker='o', linewidth=3, markersize=8,
            color=curve_colors[0], label='Viral Reach', alpha=0.7, ax=ax)
ax.fill_between(months, 0, viral_curve, alpha=0.2, color=curve_colors[0])

sns.lineplot(x=months, y=research_curve, marker='s', linewidth=3, markersize=8,
            color=curve_colors[1], label='Research Depth', alpha=0.7, ax=ax)
ax.fill_between(months, 0, research_curve, alpha=0.2, color=curve_colors[1])

sns.lineplot(x=months, y=policy_curve, marker='^', linewidth=3, markersize=8,
            color=curve_colors[2], label='Policy Impact', alpha=0.7, ax=ax)
ax.fill_between(months, 0, policy_curve, alpha=0.2, color=curve_colors[2])

ax.set_xlabel('Months', fontsize=12)
ax.set_ylabel('Impact Level (0-10)', fontsize=12)
ax.set_title('Impact Growth Over Time: Different Curves for Different Dimensions',
            fontsize=14, fontweight='bold')
ax.legend(loc='lower right', fontsize=11)
ax.grid(True, alpha=0.3)
ax.set_xlim(0, 12)
ax.set_ylim(0, 11)
ax.set_xticks(range(0, 13))

# Add annotations for key insight
ax.annotate('Viral hits fast\n(months 0-3)',
           xy=(3, viral_curve[3]), xytext=(5, 8),
           arrowprops=dict(arrowstyle='->', lw=2, color=curve_colors[0]),
           fontsize=10, bbox=dict(boxstyle='round', facecolor=curve_colors[0], alpha=0.3))

ax.annotate('Research compounds\n(months 6+)',
           xy=(9, research_curve[9]), xytext=(7, 4),
           arrowprops=dict(arrowstyle='->', lw=2, color=curve_colors[1]),
           fontsize=10, bbox=dict(boxstyle='round', facecolor=curve_colors[1], alpha=0.3))

ax.annotate('Policy follows credibility\n(months 4-9)',
           xy=(6, policy_curve[6]), xytext=(9, 2),
           arrowprops=dict(arrowstyle='->', lw=2, color=curve_colors[2]),
           fontsize=10, bbox=dict(boxstyle='round', facecolor=curve_colors[2], alpha=0.3))

plt.tight_layout()
plt.savefig('funding/diagrams/impact_over_time.png', dpi=300, bbox_inches='tight')
print("Saved: impact_over_time.png")
plt.close('all')
