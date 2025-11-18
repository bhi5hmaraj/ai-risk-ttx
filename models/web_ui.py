"""
Interactive Web UI for AI 2027 Formal Models

Run with: streamlit run models/web_ui.py
"""

import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from dataclasses import asdict

# Import all models
from hybrid_automaton import DiscreteTimeHybridAutomaton, ContinuousState, PlayerAction, Mode
from mdp_model import AI2027MDP, State, Action, CapabilityLevel, TrustLevel, CoordinationStatus
from mealy_machine import MealyMachine, GameState, Input
from system_dynamics import StockFlowModel
from agent_based_model import ABMSimulation, Role, Strategy

st.set_page_config(page_title="AI 2027 Formal Models", layout="wide")

st.title("🎮 AI 2027 Formal Models - Interactive Simulator")

st.markdown("""
Explore different formal modeling approaches for the AI 2027 scenario. Each model captures
different aspects of the game dynamics: hybrid systems, optimal policies, narrative generation,
feedback loops, and emergent behavior.
""")

# Model selection
model_type = st.sidebar.selectbox(
    "Select Model",
    ["Hybrid Automaton", "Markov Decision Process", "Mealy Machine", "System Dynamics", "Agent-Based Model"]
)

st.sidebar.markdown("---")

# ============================================================================
# HYBRID AUTOMATON
# ============================================================================
if model_type == "Hybrid Automaton":
    st.header("🔄 Hybrid Automaton - Mode Switching Dynamics")

    st.markdown("""
    Models the AI development trajectory as a hybrid system with discrete modes (pre-AGI, racing,
    coordinating, crisis) and continuous state variables (capabilities, trust, coordination).
    """)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Initial Conditions")
        init_cap = st.slider("Initial Capabilities", 0.0, 50.0, 20.0)
        init_trust = st.slider("Initial Public Trust", 0.0, 100.0, 75.0)
        init_coord = st.slider("Initial Coordination", 0.0, 100.0, 50.0)

    with col2:
        st.subheader("Simulation Parameters")
        max_time = st.slider("Simulation Time", 5, 30, 10)
        dt = st.slider("Time Step (dt)", 0.1, 1.0, 0.5)
        racing_intensity = st.slider("Player Racing Intensity", 0.0, 1.0, 0.3)

    if st.button("Run Hybrid Automaton Simulation", key="ha_run"):
        with st.spinner("Running simulation..."):
            ha = DiscreteTimeHybridAutomaton(dt=dt)

            # Override initial state
            ha.state = ContinuousState(
                capabilities=init_cap,
                public_trust=init_trust,
                coordination=init_coord,
                investment=50.0,
                safety_research=30.0
            )

            # Create player actions
            actions = [
                PlayerAction(player_id=0, action_type="transparency", magnitude=0.5),
                PlayerAction(player_id=1, action_type="racing", magnitude=racing_intensity),
                PlayerAction(player_id=2, action_type="coordination", magnitude=0.6),
            ]

            # Run simulation
            results = ha.simulate(max_time=max_time, actions=actions)

            # Plot results
            fig, axes = plt.subplots(2, 2, figsize=(14, 10))

            # Capabilities
            axes[0, 0].plot(results['time'], results['capabilities'], 'b-', linewidth=2)
            axes[0, 0].set_title('AI Capabilities Over Time', fontsize=12, fontweight='bold')
            axes[0, 0].set_xlabel('Time')
            axes[0, 0].set_ylabel('Capabilities')
            axes[0, 0].grid(True, alpha=0.3)

            # Public Trust
            axes[0, 1].plot(results['time'], results['public_trust'], 'g-', linewidth=2)
            axes[0, 1].set_title('Public Trust Over Time', fontsize=12, fontweight='bold')
            axes[0, 1].set_xlabel('Time')
            axes[0, 1].set_ylabel('Trust')
            axes[0, 1].grid(True, alpha=0.3)

            # Coordination
            axes[1, 0].plot(results['time'], results['coordination'], 'r-', linewidth=2)
            axes[1, 0].set_title('Coordination Level', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('Time')
            axes[1, 0].set_ylabel('Coordination')
            axes[1, 0].grid(True, alpha=0.3)

            # Mode transitions
            mode_numeric = [list(Mode).index(m) for m in results['mode']]
            axes[1, 1].plot(results['time'], mode_numeric, 'purple', linewidth=2, marker='o')
            axes[1, 1].set_title('System Mode', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Time')
            axes[1, 1].set_ylabel('Mode')
            axes[1, 1].set_yticks(range(len(Mode)))
            axes[1, 1].set_yticklabels([m.name for m in Mode], fontsize=8)
            axes[1, 1].grid(True, alpha=0.3)

            plt.tight_layout()
            st.pyplot(fig)

            # Display final state
            st.success(f"**Final Mode:** {results['mode'][-1].name}")

            col1, col2, col3 = st.columns(3)
            col1.metric("Final Capabilities", f"{results['capabilities'][-1]:.1f}")
            col2.metric("Final Trust", f"{results['public_trust'][-1]:.1f}")
            col3.metric("Final Coordination", f"{results['coordination'][-1]:.1f}")

            # Show mode transitions
            st.subheader("Mode Transition History")
            transitions = []
            for i in range(1, len(results['mode'])):
                if results['mode'][i] != results['mode'][i-1]:
                    transitions.append({
                        'Time': f"{results['time'][i]:.1f}",
                        'From': results['mode'][i-1].name,
                        'To': results['mode'][i].name
                    })

            if transitions:
                st.table(pd.DataFrame(transitions))
            else:
                st.info("No mode transitions occurred")

# ============================================================================
# MARKOV DECISION PROCESS
# ============================================================================
elif model_type == "Markov Decision Process":
    st.header("🎯 Markov Decision Process - Optimal Policy")

    st.markdown("""
    Computes optimal strategies using value iteration. Shows which actions maximize
    expected reward for different roles (tech CEO, regulator, journalist).
    """)

    col1, col2 = st.columns(2)

    with col1:
        role_type = st.selectbox("Role", ["tech_ceo", "regulator", "journalist"])
        gamma = st.slider("Discount Factor (γ)", 0.5, 0.99, 0.9)

    with col2:
        max_iter = st.slider("Max Iterations", 100, 2000, 500)
        theta = st.slider("Convergence Threshold", 0.001, 0.1, 0.01)

    if st.button("Compute Optimal Policy", key="mdp_run"):
        with st.spinner("Running value iteration..."):
            mdp = AI2027MDP(gamma=gamma, role=role_type)
            iterations = mdp.value_iteration(theta=theta, max_iterations=max_iter)

            st.success(f"Converged in {iterations} iterations")

            # Extract policy for visualization
            policy_data = []
            for state in mdp.states:
                if state.round <= 3:  # Only show first few rounds
                    policy_data.append({
                        'Round': state.round,
                        'Capability': state.capability.name,
                        'Trust': state.trust.name,
                        'Coordination': state.coordination.name,
                        'Optimal Action': mdp.policy[state].name,
                        'Value': f"{mdp.V[state]:.2f}"
                    })

            df = pd.DataFrame(policy_data)

            # Show policy table
            st.subheader(f"Optimal Policy for {role_type.replace('_', ' ').title()}")
            st.dataframe(df, use_container_width=True)

            # Policy heatmap for specific round
            st.subheader("Policy Heatmap (Round 1)")

            round_1_states = [s for s in mdp.states if s.round == 1]

            # Create pivot table for heatmap
            heatmap_data = []
            for state in round_1_states:
                heatmap_data.append({
                    'Capability': state.capability.name,
                    'Trust': state.trust.name,
                    'Action': mdp.policy[state].name
                })

            pivot = pd.DataFrame(heatmap_data).pivot_table(
                index='Trust',
                columns='Capability',
                values='Action',
                aggfunc='first'
            )

            st.dataframe(pivot, use_container_width=True)

            # Action distribution
            st.subheader("Action Distribution Across All States")
            action_counts = {}
            for state in mdp.states:
                action = mdp.policy[state].name
                action_counts[action] = action_counts.get(action, 0) + 1

            fig, ax = plt.subplots(figsize=(10, 5))
            actions = list(action_counts.keys())
            counts = list(action_counts.values())
            ax.bar(actions, counts, color='steelblue')
            ax.set_title(f'Optimal Action Distribution - {role_type.replace("_", " ").title()}',
                        fontsize=14, fontweight='bold')
            ax.set_xlabel('Action')
            ax.set_ylabel('Number of States')
            ax.grid(axis='y', alpha=0.3)
            plt.xticks(rotation=45)
            plt.tight_layout()
            st.pyplot(fig)

# ============================================================================
# MEALY MACHINE
# ============================================================================
elif model_type == "Mealy Machine":
    st.header("📖 Mealy Machine - Narrative Generation")

    st.markdown("""
    Finite state machine that generates context-aware narratives. The output (story and score changes)
    depends on both the current state and the input (player actions).
    """)

    st.subheader("Input Sequence")

    num_inputs = st.slider("Number of Inputs", 1, 10, 5)

    inputs = []
    for i in range(num_inputs):
        col1, col2, col3 = st.columns(3)
        with col1:
            action = st.selectbox(f"Input {i+1} - Action",
                                ["race", "coordinate", "transparency", "invest", "safety"],
                                key=f"action_{i}")
        with col2:
            magnitude = st.slider(f"Input {i+1} - Magnitude",
                                0.0, 10.0, 5.0, key=f"mag_{i}")
        with col3:
            player_count = st.slider(f"Input {i+1} - Players",
                                   1, 6, 2, key=f"count_{i}")

        inputs.append(Input(
            action_type=action,
            magnitude=magnitude,
            player_count=player_count,
            coalition=player_count >= 3
        ))

    if st.button("Generate Narrative", key="mealy_run"):
        with st.spinner("Generating narrative..."):
            mealy = MealyMachine()

            outputs = []
            states = [mealy.current_state]

            for inp in inputs:
                output = mealy.step(inp)
                outputs.append(output)
                states.append(mealy.current_state)

            # Display narrative timeline
            st.subheader("Narrative Timeline")

            for i, (inp, output) in enumerate(zip(inputs, outputs)):
                with st.expander(f"**Round {i+1}**: {states[i].name} → {states[i+1].name}", expanded=True):
                    st.markdown(f"**Input:** {inp.player_count} players perform {inp.action_type} (magnitude: {inp.magnitude})")
                    st.markdown(f"**Narrative:** {output.narrative}")

                    if output.score_delta:
                        st.markdown("**Score Changes:**")
                        for key, value in output.score_delta.items():
                            emoji = "📈" if value > 0 else "📉"
                            st.markdown(f"- {emoji} {key}: {value:+.1f}")

                    if output.events_triggered:
                        st.markdown(f"**Events:** {', '.join(output.events_triggered)}")

            # State diagram
            st.subheader("State Transition Diagram")
            fig, ax = plt.subplots(figsize=(12, 6))

            state_indices = [list(GameState).index(s) for s in states]
            ax.plot(range(len(states)), state_indices, marker='o', markersize=10,
                   linewidth=2, color='steelblue')
            ax.set_yticks(range(len(GameState)))
            ax.set_yticklabels([s.name for s in GameState])
            ax.set_xlabel('Step')
            ax.set_ylabel('State')
            ax.set_title('State Transitions', fontsize=14, fontweight='bold')
            ax.grid(True, alpha=0.3)
            plt.tight_layout()
            st.pyplot(fig)

# ============================================================================
# SYSTEM DYNAMICS
# ============================================================================
elif model_type == "System Dynamics":
    st.header("🔁 System Dynamics - Feedback Loops")

    st.markdown("""
    Stock-and-flow model showing reinforcing and balancing feedback loops.
    Identifies tipping points and leverage points in the system.
    """)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Initial Stocks")
        init_cap_sd = st.slider("Initial Capabilities", 0.0, 50.0, 20.0, key="sd_cap")
        init_trust_sd = st.slider("Initial Trust", 0.0, 100.0, 75.0, key="sd_trust")
        init_coord_sd = st.slider("Initial Coordination", 0.0, 100.0, 50.0, key="sd_coord")

    with col2:
        st.subheader("Parameters")
        racing_mult = st.slider("Racing Multiplier", 0.0, 3.0, 1.5)
        trust_erosion = st.slider("Trust Erosion Rate", 0.0, 0.1, 0.02)
        transparency = st.slider("Transparency Effort", 0.0, 1.0, 0.3)

    sim_time = st.slider("Simulation Time", 10, 100, 50)

    if st.button("Run System Dynamics", key="sd_run"):
        with st.spinner("Simulating system dynamics..."):
            sd = StockFlowModel(
                racing_multiplier=racing_mult,
                trust_erosion_from_racing=trust_erosion
            )

            # Override initial conditions
            sd.capabilities = init_cap_sd
            sd.public_trust = init_trust_sd
            sd.coordination_capacity = init_coord_sd
            sd.transparency_effort = transparency

            # Run simulation
            history = {
                'time': [],
                'capabilities': [],
                'public_trust': [],
                'safety_research': [],
                'coordination_capacity': [],
                'public_alarm': [],
                'racing_intensity': []
            }

            for _ in range(sim_time):
                history['time'].append(sd.time)
                history['capabilities'].append(sd.capabilities)
                history['public_trust'].append(sd.public_trust)
                history['safety_research'].append(sd.safety_research)
                history['coordination_capacity'].append(sd.coordination_capacity)
                history['public_alarm'].append(sd.public_alarm)
                history['racing_intensity'].append(sd.racing_intensity)

                sd.step()

            # Plot stocks over time
            fig, axes = plt.subplots(2, 3, figsize=(16, 10))

            axes[0, 0].plot(history['time'], history['capabilities'], 'b-', linewidth=2)
            axes[0, 0].set_title('Capabilities', fontweight='bold')
            axes[0, 0].set_xlabel('Time')
            axes[0, 0].grid(True, alpha=0.3)

            axes[0, 1].plot(history['time'], history['public_trust'], 'g-', linewidth=2)
            axes[0, 1].set_title('Public Trust', fontweight='bold')
            axes[0, 1].set_xlabel('Time')
            axes[0, 1].grid(True, alpha=0.3)

            axes[0, 2].plot(history['time'], history['safety_research'], 'purple', linewidth=2)
            axes[0, 2].set_title('Safety Research', fontweight='bold')
            axes[0, 2].set_xlabel('Time')
            axes[0, 2].grid(True, alpha=0.3)

            axes[1, 0].plot(history['time'], history['coordination_capacity'], 'orange', linewidth=2)
            axes[1, 0].set_title('Coordination Capacity', fontweight='bold')
            axes[1, 0].set_xlabel('Time')
            axes[1, 0].grid(True, alpha=0.3)

            axes[1, 1].plot(history['time'], history['public_alarm'], 'r-', linewidth=2)
            axes[1, 1].set_title('Public Alarm', fontweight='bold')
            axes[1, 1].set_xlabel('Time')
            axes[1, 1].grid(True, alpha=0.3)

            axes[1, 2].plot(history['time'], history['racing_intensity'], 'brown', linewidth=2)
            axes[1, 2].set_title('Racing Intensity', fontweight='bold')
            axes[1, 2].set_xlabel('Time')
            axes[1, 2].grid(True, alpha=0.3)

            plt.tight_layout()
            st.pyplot(fig)

            # Identify critical points
            st.subheader("System Analysis")

            crisis_threshold = 30
            high_cap_threshold = 70

            crisis_detected = any(t < crisis_threshold and c > high_cap_threshold
                                 for t, c in zip(history['public_trust'], history['capabilities']))

            if crisis_detected:
                st.error("⚠️ CRISIS TIPPING POINT DETECTED: Low trust + high capabilities triggered collapse")
            else:
                st.success("✅ System remained stable - no crisis tipping point reached")

            # Show feedback loops
            st.subheader("Active Feedback Loops")
            st.markdown("""
            **Reinforcing Loops:**
            - 🔄 Racing → Capability Growth → More Racing (competitive dynamics)
            - 🔄 Low Trust → Harder Coordination → More Racing → Lower Trust

            **Balancing Loops:**
            - ⚖️ High Alarm → Regulatory Pressure → Slower Growth
            - ⚖️ Transparency → Increased Trust → Better Coordination
            """)

# ============================================================================
# AGENT-BASED MODEL
# ============================================================================
elif model_type == "Agent-Based Model":
    st.header("👥 Agent-Based Model - Emergent Behavior")

    st.markdown("""
    Bottom-up simulation with heterogeneous agents. Each agent has imperfect information,
    bounded rationality, and evolving trust networks. Watch coordination emerge (or fail).
    """)

    col1, col2 = st.columns(2)

    with col1:
        num_ceos = st.slider("Tech CEOs", 1, 5, 2)
        num_regs = st.slider("Regulators", 1, 5, 2)
        num_journalists = st.slider("Journalists", 1, 5, 1)
        num_researchers = st.slider("Researchers", 1, 5, 1)

    with col2:
        steps = st.slider("Simulation Steps", 10, 100, 30)
        noise_level = st.slider("Information Noise", 0.0, 1.0, 0.2)

    if st.button("Run Agent-Based Simulation", key="abm_run"):
        with st.spinner("Simulating agent interactions..."):
            # Create agent configuration
            agents_config = []
            agent_id = 0

            for _ in range(num_ceos):
                agents_config.append((agent_id, Role.TECH_CEO))
                agent_id += 1
            for _ in range(num_regs):
                agents_config.append((agent_id, Role.REGULATOR))
                agent_id += 1
            for _ in range(num_journalists):
                agents_config.append((agent_id, Role.JOURNALIST))
                agent_id += 1
            for _ in range(num_researchers):
                agents_config.append((agent_id, Role.RESEARCHER))
                agent_id += 1

            abm = ABMSimulation(num_agents=len(agents_config))

            # Override agents with specified roles
            for i, (agent_id, role) in enumerate(agents_config):
                abm.agents[i].role = role
                abm.agents[i].id = agent_id

            # Run simulation
            history = {
                'step': [],
                'capabilities': [],
                'trust': [],
                'coordination': [],
                'racing_count': [],
                'coordinating_count': []
            }

            for step in range(steps):
                abm.step()

                history['step'].append(step)
                history['capabilities'].append(abm.world_state['capabilities'])
                history['trust'].append(abm.world_state['trust'])
                history['coordination'].append(abm.world_state['coordination'])

                racing = sum(1 for a in abm.agents if a.strategy == Strategy.RACE)
                coordinating = sum(1 for a in abm.agents if a.strategy == Strategy.COORDINATE)

                history['racing_count'].append(racing)
                history['coordinating_count'].append(coordinating)

            # Plot results
            fig, axes = plt.subplots(2, 2, figsize=(14, 10))

            # World state
            axes[0, 0].plot(history['step'], history['capabilities'], 'b-', label='Capabilities', linewidth=2)
            axes[0, 0].plot(history['step'], history['trust'], 'g-', label='Trust', linewidth=2)
            axes[0, 0].plot(history['step'], history['coordination'], 'r-', label='Coordination', linewidth=2)
            axes[0, 0].set_title('World State Evolution', fontweight='bold')
            axes[0, 0].set_xlabel('Step')
            axes[0, 0].set_ylabel('Value')
            axes[0, 0].legend()
            axes[0, 0].grid(True, alpha=0.3)

            # Agent strategies
            axes[0, 1].plot(history['step'], history['racing_count'], 'r-',
                          label='Racing', linewidth=2)
            axes[0, 1].plot(history['step'], history['coordinating_count'], 'g-',
                          label='Coordinating', linewidth=2)
            axes[0, 1].set_title('Agent Strategy Distribution', fontweight='bold')
            axes[0, 1].set_xlabel('Step')
            axes[0, 1].set_ylabel('Number of Agents')
            axes[0, 1].legend()
            axes[0, 1].grid(True, alpha=0.3)

            # Final strategy distribution by role
            role_strategies = {}
            for agent in abm.agents:
                role_name = agent.role.name
                strategy_name = agent.strategy.name
                if role_name not in role_strategies:
                    role_strategies[role_name] = {}
                role_strategies[role_name][strategy_name] = \
                    role_strategies[role_name].get(strategy_name, 0) + 1

            # Stacked bar chart
            roles = list(role_strategies.keys())
            strategies = list(Strategy)
            strategy_names = [s.name for s in strategies]

            data_matrix = []
            for strategy in strategies:
                row = [role_strategies[role].get(strategy.name, 0) for role in roles]
                data_matrix.append(row)

            bottom = np.zeros(len(roles))
            colors = ['red', 'green', 'blue', 'orange']

            for i, (strategy_name, row) in enumerate(zip(strategy_names, data_matrix)):
                axes[1, 0].bar(roles, row, bottom=bottom, label=strategy_name,
                             color=colors[i % len(colors)])
                bottom += row

            axes[1, 0].set_title('Final Strategy by Role', fontweight='bold')
            axes[1, 0].set_xlabel('Role')
            axes[1, 0].set_ylabel('Number of Agents')
            axes[1, 0].legend()
            axes[1, 0].tick_params(axis='x', rotation=45)

            # Trust network heatmap
            trust_matrix = np.zeros((len(abm.agents), len(abm.agents)))
            for i, agent in enumerate(abm.agents):
                for j, other_agent in enumerate(abm.agents):
                    if other_agent.id in agent.trust_in_others:
                        trust_matrix[i, j] = agent.trust_in_others[other_agent.id]

            im = axes[1, 1].imshow(trust_matrix, cmap='RdYlGn', vmin=0, vmax=1)
            axes[1, 1].set_title('Agent Trust Network (Final)', fontweight='bold')
            axes[1, 1].set_xlabel('Agent ID')
            axes[1, 1].set_ylabel('Agent ID')
            plt.colorbar(im, ax=axes[1, 1], label='Trust Level')

            plt.tight_layout()
            st.pyplot(fig)

            # Emergence analysis
            st.subheader("Emergence Analysis")

            final_coord = history['coordination'][-1]
            coordination_emerged = final_coord > 70

            if coordination_emerged:
                st.success("✅ COORDINATION EMERGED: Agents successfully self-organized")
            else:
                st.warning("⚠️ COORDINATION FAILED: Racing dynamics dominated")

            # Show final agent states
            st.subheader("Final Agent States")
            agent_data = []
            for agent in abm.agents:
                agent_data.append({
                    'ID': agent.id,
                    'Role': agent.role.name,
                    'Strategy': agent.strategy.name,
                    'Belief (Cap)': f"{agent.belief_capability:.1f}",
                    'Risk Aversion': f"{agent.risk_aversion:.2f}",
                    'Avg Trust in Others': f"{np.mean(list(agent.trust_in_others.values())):.2f}"
                        if agent.trust_in_others else "N/A"
                })

            st.dataframe(pd.DataFrame(agent_data), use_container_width=True)

# ============================================================================
# SIDEBAR INFO
# ============================================================================
st.sidebar.markdown("---")
st.sidebar.markdown("### About")
st.sidebar.markdown("""
This UI provides interactive access to 5 formal models of the AI 2027 scenario:

- **Hybrid Automaton**: Mode-based dynamics
- **MDP**: Optimal policy computation
- **Mealy Machine**: Narrative generation
- **System Dynamics**: Feedback loops
- **Agent-Based**: Emergent behavior

Built with Streamlit for rapid prototyping.
""")

st.sidebar.markdown("---")
st.sidebar.markdown("**Model Location:** `/models/`")
st.sidebar.markdown("**Run:** `streamlit run models/web_ui.py`")
