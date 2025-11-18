"""
MDA Framework Visualization
Mechanics-Dynamics-Aesthetics framework applied to Simulacra design
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import numpy as np
import seaborn as sns

# Set seaborn theme
sns.set_theme(style="white", palette="deep")
palette = sns.color_palette("Set2", 3).as_hex()

fig = plt.figure(figsize=(16, 12))

# Main MDA diagram
ax1 = plt.subplot2grid((3, 2), (0, 0), colspan=2, rowspan=2)
ax1.set_xlim(0, 12)
ax1.set_ylim(0, 10)
ax1.axis('off')
ax1.set_title('MDA Framework for Simulacra Design', fontsize=16, fontweight='bold', pad=20)

# Draw three main components with seaborn colors
components = [
    {'name': 'MECHANICS', 'x': 2, 'y': 7, 'color': palette[0],
     'items': [
         'Action points (3/round)',
         'Dual objectives (public + hidden)',
         'Turn-based rounds',
         'Chat between rounds',
         'Score tracking'
     ]},
    {'name': 'DYNAMICS', 'x': 6, 'y': 7, 'color': palette[1],
     'items': [
         'Racing vs coordination',
         'Trust erosion feedback',
         'Hidden agenda conflicts',
         'Coalition formation',
         'Tipping points'
     ]},
    {'name': 'AESTHETICS', 'x': 10, 'y': 7, 'color': palette[2],
     'items': [
         'Suspense (will we coordinate?)',
         'Tension (personal vs public good)',
         'Discovery (why coordination fails)',
         'Schadenfreude (others failed too)',
         'Mastery (found a winning strategy)'
     ]}
]

for comp in components:
    # Draw main box
    box = FancyBboxPatch((comp['x'] - 1.2, comp['y'] - 0.5), 2.4, 1,
                         boxstyle="round,pad=0.15",
                         facecolor=comp['color'],
                         edgecolor='black',
                         linewidth=3,
                         alpha=0.6)
    ax1.add_patch(box)
    ax1.text(comp['x'], comp['y'], comp['name'],
            ha='center', va='center', fontsize=13, fontweight='bold')

    # Draw items below
    for i, item in enumerate(comp['items']):
        ax1.text(comp['x'], comp['y'] - 1.5 - i*0.5, f'• {item}',
                ha='center', va='top', fontsize=8, wrap=True)

# Draw arrows showing relationships
# Designer → Mechanics
arrow1 = FancyArrowPatch((2, 9), (2, 7.5),
                        arrowstyle='->', mutation_scale=30,
                        linewidth=3, color='gray', alpha=0.6)
ax1.add_patch(arrow1)
ax1.text(2, 9.3, 'Designer\nDefines', ha='center', fontsize=10,
        bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))

# Mechanics → Dynamics
arrow2 = FancyArrowPatch((3.5, 7), (4.8, 7),
                        arrowstyle='->', mutation_scale=30,
                        linewidth=3, color=palette[1], alpha=0.6)
ax1.add_patch(arrow2)
ax1.text(4.15, 7.5, 'Creates', ha='center', fontsize=9, style='italic')

# Dynamics → Aesthetics
arrow3 = FancyArrowPatch((7.5, 7), (8.8, 7),
                        arrowstyle='->', mutation_scale=30,
                        linewidth=3, color=palette[2], alpha=0.6)
ax1.add_patch(arrow3)
ax1.text(8.15, 7.5, 'Produces', ha='center', fontsize=9, style='italic')

# Aesthetics → Player
arrow4 = FancyArrowPatch((10, 6.5), (10, 5),
                        arrowstyle='->', mutation_scale=30,
                        linewidth=3, color='gray', alpha=0.6)
ax1.add_patch(arrow4)
ax1.text(10, 4.5, 'Player\nExperiences', ha='center', fontsize=10,
        bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))

# Feedback loop: Player understanding → Designer
arrow5 = FancyArrowPatch((10, 4), (2, 9),
                        arrowstyle='->', mutation_scale=20,
                        linewidth=2, color='red', alpha=0.4,
                        linestyle='dashed',
                        connectionstyle="arc3,rad=0.3")
ax1.add_patch(arrow5)
ax1.text(6, 9.5, 'Feedback Loop\n(playtesting, analytics)', ha='center',
        fontsize=9, color='red', style='italic')

# Bottom left: Progression across player types
ax2 = plt.subplot2grid((3, 2), (2, 0))

player_types = ['Casual', 'Engaged', 'Researcher']
focus_areas = {
    'Aesthetics': [9, 6, 3],  # Casual cares most about feel
    'Dynamics': [4, 8, 7],     # Engaged explores dynamics
    'Mechanics': [2, 5, 10]     # Researcher tweaks mechanics
}

x = np.arange(len(player_types))
width = 0.25

# Use seaborn colors for bars (reversed palette to match MDA order)
for i, (area, values) in enumerate(focus_areas.items()):
    ax2.bar(x + i*width, values, width, label=area,
           color=[palette[2], palette[1], palette[0]][i], alpha=0.7)

ax2.set_xlabel('Player Type', fontsize=11)
ax2.set_ylabel('Importance (0-10)', fontsize=11)
ax2.set_title('MDA Focus by Player Type', fontsize=12, fontweight='bold')
ax2.set_xticks(x + width)
ax2.set_xticklabels(player_types)
ax2.legend(loc='upper left', fontsize=9)
ax2.grid(True, axis='y', alpha=0.3)
ax2.set_ylim(0, 11)

# Bottom right: Design priorities matrix
ax3 = plt.subplot2grid((3, 2), (2, 1))

# Heatmap of design decisions
decisions = [
    'Action variety',
    'Score clarity',
    'Turn speed',
    'Narrative quality',
    'Strategic depth'
]

priorities = np.array([
    [8, 6, 9, 7, 5],  # Mechanics impact
    [7, 8, 5, 9, 9],  # Dynamics impact
    [6, 4, 7, 10, 6]  # Aesthetics impact
]).T

# Use seaborn heatmap
sns.heatmap(priorities, annot=True, fmt='d', cmap='YlOrRd',
            vmin=0, vmax=10, cbar_kws={'label': 'Impact Level'},
            xticklabels=['Mechanics', 'Dynamics', 'Aesthetics'],
            yticklabels=decisions, ax=ax3, linewidths=0.5, linecolor='gray')

ax3.set_title('Design Decision Impact Matrix', fontsize=12, fontweight='bold')
ax3.tick_params(labelsize=9)

plt.tight_layout()
plt.savefig('funding/diagrams/mda_framework.png', dpi=300, bbox_inches='tight')
print("Saved: mda_framework.png")

# Create second figure: MDA through development phases
fig2, ax = plt.subplots(figsize=(14, 8))

phases_mda = ['Phase 1\nPolish', 'Phase 2\nCustomize', 'Phase 3\nResearch', 'Phase 4\nEcosystem']
x_pos = np.arange(len(phases_mda))

# Emphasis on different MDA elements by phase
mechanics_focus = [7, 8, 6, 5]  # High early (building core)
dynamics_focus = [6, 9, 8, 7]   # Peak mid (adding depth)
aesthetics_focus = [9, 7, 7, 8] # High early and late (polish + community)

width = 0.25

bars1 = ax.bar(x_pos - width, mechanics_focus, width,
              label='Mechanics Focus', color=palette[0], alpha=0.7)
bars2 = ax.bar(x_pos, dynamics_focus, width,
              label='Dynamics Focus', color=palette[1], alpha=0.7)
bars3 = ax.bar(x_pos + width, aesthetics_focus, width,
              label='Aesthetics Focus', color=palette[2], alpha=0.7)

ax.set_xlabel('Development Phase', fontsize=12)
ax.set_ylabel('Design Focus (0-10)', fontsize=12)
ax.set_title('MDA Focus Across Development Timeline', fontsize=14, fontweight='bold')
ax.set_xticks(x_pos)
ax.set_xticklabels(phases_mda)
ax.legend(loc='upper right', fontsize=10)
ax.grid(True, axis='y', alpha=0.3)
ax.set_ylim(0, 10)

# Add phase descriptions
phase_desc = [
    'Perfect the core loop',
    'Add strategic variety',
    'Enable experimentation',
    'Community polish'
]

for i, desc in enumerate(phase_desc):
    ax.text(i, 9.5, desc, ha='center', fontsize=8, style='italic',
           bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.4))

plt.tight_layout()
plt.savefig('funding/diagrams/mda_development.png', dpi=300, bbox_inches='tight')
print("Saved: mda_development.png")
plt.close('all')
