"""Background tasks package"""

from src.workers.tasks.proofs import generate_proof, verify_proof, submit_proof_to_chain
from src.workers.tasks.settlements import process_settlement, execute_settlement_on_chain
from src.workers.tasks.agents import update_stale_agents, calculate_agent_performance
from src.workers.tasks.notifications import (
    calculate_daily_rewards,
    send_push_notification,
    send_email_notification,
)

__all__ = [
    "generate_proof",
    "verify_proof",
    "submit_proof_to_chain",
    "process_settlement",
    "execute_settlement_on_chain",
    "update_stale_agents",
    "calculate_agent_performance",
    "calculate_daily_rewards",
    "send_push_notification",
    "send_email_notification",
]
