"""
Enhanced Logging and Analytics Module for Delhi Air Pollution TTX

Provides comprehensive logging, metrics tracking, and real-time analytics
for model validation, debugging, and evaluation.

Features:
- Structured logging to files and console
- Real-time metrics dashboard
- Model validation checks
- Performance monitoring
- Gameplay analytics
- Export to multiple formats (JSON, CSV, plots)
"""

import logging
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
import numpy as np


@dataclass
class ModelMetrics:
    """Metrics for a single model step"""
    timestamp: float
    round_num: int
    model_name: str  # "hybrid_automaton", "system_dynamics", "abm"

    # State variables
    aqi: float
    pm25: float
    regime: str
    hospitalizations: float
    public_alarm: float

    # Flow variables (SD specific)
    emissions_flow: Optional[float] = None
    dispersion_flow: Optional[float] = None
    deposition_flow: Optional[float] = None

    # Action effects
    actions_taken: List[Dict] = field(default_factory=list)
    action_impacts: Dict[str, float] = field(default_factory=dict)

    # Validation flags
    within_bounds: bool = True
    anomalies: List[str] = field(default_factory=list)


@dataclass
class GameSessionMetrics:
    """Aggregate metrics for entire game session"""
    session_id: str
    start_time: float
    end_time: Optional[float] = None

    # Player data
    player_count: int = 0
    player_roles: List[str] = field(default_factory=list)

    # Game outcomes
    rounds_completed: int = 0
    final_aqi: Optional[float] = None
    final_public_score: Optional[float] = None
    hidden_objectives_achieved: Dict[str, bool] = field(default_factory=dict)

    # Engagement metrics
    total_deliberation_time: float = 0.0
    avg_deliberation_per_round: float = 0.0
    action_diversity_score: float = 0.0

    # Learning metrics
    systems_thinking_demonstrated: bool = False
    feedback_loops_identified: int = 0

    # Model performance
    model_execution_times: List[float] = field(default_factory=list)
    llm_calls: int = 0
    errors_encountered: int = 0


class EnhancedLogger:
    """
    Comprehensive logging system for TTX models.

    Logs to:
    1. Console (INFO level, human-readable)
    2. File (DEBUG level, detailed)
    3. Structured JSON (for analysis)
    4. Metrics database (time-series)
    """

    def __init__(self, log_dir: str = "logs", session_id: str = None):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)

        self.session_id = session_id or self._generate_session_id()
        self.session_start = time.time()

        # Setup loggers
        self.console_logger = self._setup_console_logger()
        self.file_logger = self._setup_file_logger()
        self.metrics_logger = self._setup_metrics_logger()

        # Metrics storage
        self.model_metrics: List[ModelMetrics] = []
        self.session_metrics = GameSessionMetrics(
            session_id=self.session_id,
            start_time=self.session_start
        )

        self.info("Enhanced logging system initialized")
        self.info(f"Session ID: {self.session_id}")

    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _setup_console_logger(self) -> logging.Logger:
        """Setup console logger (INFO level, clean format)"""
        logger = logging.getLogger(f"console_{self.session_id}")
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _setup_file_logger(self) -> logging.Logger:
        """Setup file logger (DEBUG level, detailed)"""
        logger = logging.getLogger(f"file_{self.session_id}")
        logger.setLevel(logging.DEBUG)

        log_file = self.log_dir / f"{self.session_id}.log"
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _setup_metrics_logger(self) -> logging.Logger:
        """Setup metrics logger (JSON structured logs)"""
        logger = logging.getLogger(f"metrics_{self.session_id}")
        logger.setLevel(logging.DEBUG)

        metrics_file = self.log_dir / f"{self.session_id}_metrics.jsonl"
        handler = logging.FileHandler(metrics_file)
        logger.addHandler(handler)

        return logger

    def debug(self, msg: str, extra: Dict = None):
        """Log debug message"""
        self.file_logger.debug(msg, extra=extra or {})

    def info(self, msg: str, extra: Dict = None):
        """Log info message"""
        self.console_logger.info(msg)
        self.file_logger.info(msg, extra=extra or {})

    def warning(self, msg: str, extra: Dict = None):
        """Log warning"""
        self.console_logger.warning(msg)
        self.file_logger.warning(msg, extra=extra or {})

    def error(self, msg: str, extra: Dict = None):
        """Log error"""
        self.console_logger.error(msg)
        self.file_logger.error(msg, extra=extra or {})
        self.session_metrics.errors_encountered += 1

    def log_model_step(self, metrics: ModelMetrics):
        """
        Log a single model step with full metrics.

        Args:
            metrics: ModelMetrics object with current state
        """
        # Validate metrics
        anomalies = self._detect_anomalies(metrics)
        if anomalies:
            metrics.anomalies = anomalies
            metrics.within_bounds = False
            self.warning(f"Anomalies detected: {', '.join(anomalies)}")

        # Store metrics
        self.model_metrics.append(metrics)

        # Log to structured file
        metrics_dict = asdict(metrics)
        self.metrics_logger.debug(json.dumps(metrics_dict))

        # Log summary to console
        self.debug(
            f"[{metrics.model_name}] Round {metrics.round_num}: "
            f"AQI={metrics.aqi:.0f}, Regime={metrics.regime}, "
            f"Hospitalizations={metrics.hospitalizations:.0f}"
        )

        # Check for warnings
        if metrics.aqi > 450:
            self.warning(f"SEVERE AQI level reached: {metrics.aqi:.0f}")

        if metrics.hospitalizations > 2000:
            self.warning(f"Hospital capacity concern: {metrics.hospitalizations:.0f} patients")

    def _detect_anomalies(self, metrics: ModelMetrics) -> List[str]:
        """Detect anomalous values in metrics"""
        anomalies = []

        # Bounds checking
        if metrics.aqi < 0 or metrics.aqi > 600:
            anomalies.append(f"AQI out of range: {metrics.aqi:.0f}")

        if metrics.pm25 < 0 or metrics.pm25 > 1000:
            anomalies.append(f"PM2.5 out of range: {metrics.pm25:.0f}")

        if metrics.hospitalizations < 0 or metrics.hospitalizations > 10000:
            anomalies.append(f"Hospitalizations unrealistic: {metrics.hospitalizations:.0f}")

        if metrics.public_alarm < 0 or metrics.public_alarm > 100:
            anomalies.append(f"Public alarm out of range: {metrics.public_alarm:.0f}")

        # Trend anomalies (if we have history)
        if len(self.model_metrics) > 0:
            prev = self.model_metrics[-1]

            # AQI shouldn't jump more than 200 points in one round
            aqi_jump = abs(metrics.aqi - prev.aqi)
            if aqi_jump > 200:
                anomalies.append(f"Large AQI jump: {aqi_jump:.0f} points")

            # Hospitalizations shouldn't jump more than 1000 in one round
            hosp_jump = abs(metrics.hospitalizations - prev.hospitalizations)
            if hosp_jump > 1000:
                anomalies.append(f"Large hospitalization spike: {hosp_jump:.0f}")

        return anomalies

    def log_action(self, player_role: str, action: str, cost: float, expected_impact: float):
        """Log a player action"""
        self.info(
            f"Action: {player_role} -> {action} "
            f"(Cost: ₹{cost:.0f}cr, Expected AQI impact: {expected_impact:+.0f})"
        )

        action_data = {
            'timestamp': time.time(),
            'player_role': player_role,
            'action': action,
            'cost': cost,
            'expected_impact': expected_impact
        }

        self.metrics_logger.debug(json.dumps({
            'type': 'player_action',
            'data': action_data
        }))

    def log_round_start(self, round_num: int, game_state: Dict):
        """Log start of a round"""
        self.info(f"\n{'='*60}")
        self.info(f"ROUND {round_num} START")
        self.info(f"{'='*60}")
        self.info(f"AQI: {game_state.get('aqi', 0):.0f}")
        self.info(f"Budget: ₹{game_state.get('budget', 0):.0f} crores")
        self.info(f"Public Approval: {game_state.get('public_approval', 0):.0f}%")

    def log_round_end(self, round_num: int, consequences: Dict):
        """Log end of a round"""
        self.info(f"\nROUND {round_num} CONSEQUENCES:")
        self.info(f"New AQI: {consequences.get('aqi', 0):.0f}")
        self.info(f"Hospitalizations: {consequences.get('hospitalizations', 0):.0f}")

        if consequences.get('events'):
            self.info(f"Events triggered: {', '.join(consequences['events'])}")

        self.info(f"{'='*60}\n")

        self.session_metrics.rounds_completed = round_num

    def log_game_end(self, final_state: Dict, winners: List[str]):
        """Log game ending"""
        self.session_metrics.end_time = time.time()
        self.session_metrics.final_aqi = final_state.get('aqi')
        self.session_metrics.final_public_score = final_state.get('public_score')

        total_time = self.session_metrics.end_time - self.session_metrics.start_time

        self.info("\n" + "="*60)
        self.info("GAME END")
        self.info("="*60)
        self.info(f"Final AQI: {final_state.get('aqi', 0):.0f}")
        self.info(f"Final Public Score: {final_state.get('public_score', 0):.0f}")
        self.info(f"Rounds Completed: {self.session_metrics.rounds_completed}")
        self.info(f"Total Time: {total_time/60:.1f} minutes")
        self.info(f"Winners: {', '.join(winners)}")
        self.info("="*60)

    def log_llm_call(self, call_type: str, tokens: int, latency: float):
        """Log LLM API call"""
        self.session_metrics.llm_calls += 1

        self.debug(
            f"LLM Call: {call_type}, Tokens: {tokens}, Latency: {latency:.2f}s"
        )

        self.metrics_logger.debug(json.dumps({
            'type': 'llm_call',
            'call_type': call_type,
            'tokens': tokens,
            'latency': latency,
            'timestamp': time.time()
        }))

    def export_metrics(self, format: str = "json") -> Path:
        """
        Export all metrics to file.

        Args:
            format: "json", "csv", or "summary"

        Returns:
            Path to exported file
        """
        if format == "json":
            export_file = self.log_dir / f"{self.session_id}_export.json"

            export_data = {
                'session': asdict(self.session_metrics),
                'model_steps': [asdict(m) for m in self.model_metrics]
            }

            with open(export_file, 'w') as f:
                json.dump(export_data, f, indent=2)

        elif format == "csv":
            import csv

            export_file = self.log_dir / f"{self.session_id}_export.csv"

            with open(export_file, 'w', newline='') as f:
                if not self.model_metrics:
                    return export_file

                fieldnames = list(asdict(self.model_metrics[0]).keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for metric in self.model_metrics:
                    # Flatten complex fields
                    row = asdict(metric)
                    row['actions_taken'] = json.dumps(row['actions_taken'])
                    row['action_impacts'] = json.dumps(row['action_impacts'])
                    row['anomalies'] = json.dumps(row['anomalies'])
                    writer.writerow(row)

        elif format == "summary":
            export_file = self.log_dir / f"{self.session_id}_summary.txt"

            with open(export_file, 'w') as f:
                f.write("="*60 + "\n")
                f.write(f"SESSION SUMMARY: {self.session_id}\n")
                f.write("="*60 + "\n\n")

                f.write(f"Duration: {(self.session_metrics.end_time or time.time()) - self.session_metrics.start_time:.0f}s\n")
                f.write(f"Rounds: {self.session_metrics.rounds_completed}\n")
                f.write(f"Players: {self.session_metrics.player_count}\n")
                f.write(f"LLM Calls: {self.session_metrics.llm_calls}\n")
                f.write(f"Errors: {self.session_metrics.errors_encountered}\n\n")

                if self.model_metrics:
                    aqis = [m.aqi for m in self.model_metrics]
                    f.write(f"AQI Range: {min(aqis):.0f} - {max(aqis):.0f}\n")
                    f.write(f"AQI Mean: {np.mean(aqis):.0f}\n")

                    anomaly_count = sum(1 for m in self.model_metrics if m.anomalies)
                    f.write(f"Anomalies Detected: {anomaly_count}\n")

        self.info(f"Metrics exported to: {export_file}")
        return export_file

    def get_statistics(self) -> Dict[str, Any]:
        """Get summary statistics from logged metrics"""
        if not self.model_metrics:
            return {}

        aqis = [m.aqi for m in self.model_metrics]
        pm25s = [m.pm25 for m in self.model_metrics]
        hospitalizations = [m.hospitalizations for m in self.model_metrics]

        return {
            'aqi': {
                'min': min(aqis),
                'max': max(aqis),
                'mean': np.mean(aqis),
                'std': np.std(aqis)
            },
            'pm25': {
                'min': min(pm25s),
                'max': max(pm25s),
                'mean': np.mean(pm25s),
                'std': np.std(pm25s)
            },
            'hospitalizations': {
                'min': min(hospitalizations),
                'max': max(hospitalizations),
                'mean': np.mean(hospitalizations),
                'final': hospitalizations[-1]
            },
            'anomalies': sum(1 for m in self.model_metrics if m.anomalies),
            'rounds': self.session_metrics.rounds_completed,
            'llm_calls': self.session_metrics.llm_calls
        }


# Example usage
if __name__ == "__main__":
    print("=== Enhanced Logging Demo ===\n")

    # Initialize logger
    logger = EnhancedLogger(log_dir="test_logs")

    # Simulate game session
    logger.log_round_start(1, {'aqi': 150, 'budget': 800, 'public_approval': 65})

    # Log some actions
    logger.log_action("Chief Minister", "Farmer Subsidy", 300, -60)
    logger.log_action("Environment Minister", "Vehicle Ban", 10, -15)

    # Log model step
    metrics = ModelMetrics(
        timestamp=time.time(),
        round_num=1,
        model_name="hybrid_automaton",
        aqi=200,
        pm25=120,
        regime="UNHEALTHY",
        hospitalizations=850,
        public_alarm=45,
        actions_taken=[
            {"player": "CM", "action": "subsidy", "cost": 300}
        ],
        action_impacts={"subsidy": -50}
    )

    logger.log_model_step(metrics)

    # Log round end
    logger.log_round_end(1, {
        'aqi': 200,
        'hospitalizations': 850,
        'events': ['GRAP_STAGE_2']
    })

    # Get statistics
    stats = logger.get_statistics()
    print("\nSession Statistics:")
    print(json.dumps(stats, indent=2))

    # Export
    logger.export_metrics(format="summary")
    logger.export_metrics(format="json")

    print("\n=== Demo Complete ===")
