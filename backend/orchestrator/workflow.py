"""
EISLAW Agent Orchestrator - POC Workflow
Created by Alex (AOS-025)
Updated by Alex (AOS-026) - Enhanced Langfuse tracing via langfuse_integration module

Implements the Alex -> Jacob POC workflow per PRD section 8.3:
1. Alex implements a task
2. Jacob reviews the implementation
3. Conditional routing: APPROVED -> done, NEEDS_FIXES -> loop back to Alex

Uses langfuse_integration module for comprehensive tracing.
"""
import os
import re
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Literal, Any

from .config import config
from .agents import alex, jacob, AgentDefinition
from .langfuse_integration import (
    get_langfuse_client,
    TracedWorkflow,
    flush_langfuse,
    log_agent_result,
    observe,
    LANGFUSE_AVAILABLE,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Workflow Types
# =============================================================================

ReviewVerdict = Literal["APPROVED", "NEEDS_FIXES", "BLOCKED"]


@dataclass
class WorkflowStep:
    """A single step in the workflow execution."""
    agent: str
    task: str
    output: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: int = 0


@dataclass
class WorkflowResult:
    """Result of a workflow execution."""
    workflow_name: str
    task_id: str
    status: str  # "completed", "needs_fixes", "blocked", "error", "max_iterations"
    verdict: Optional[ReviewVerdict] = None
    steps: list[WorkflowStep] = field(default_factory=list)
    iterations: int = 0
    total_duration_ms: int = 0
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization."""
        return {
            "workflow_name": self.workflow_name,
            "task_id": self.task_id,
            "status": self.status,
            "verdict": self.verdict,
            "iterations": self.iterations,
            "total_duration_ms": self.total_duration_ms,
            "error": self.error,
            "steps": [
                {
                    "agent": s.agent,
                    "task": s.task[:200] + "..." if len(s.task) > 200 else s.task,
                    "output": s.output[:500] + "..." if len(s.output) > 500 else s.output,
                    "timestamp": s.timestamp.isoformat(),
                    "duration_ms": s.duration_ms,
                }
                for s in self.steps
            ],
        }


# =============================================================================
# Langfuse Integration (delegated to langfuse_integration module)
# =============================================================================

# Legacy alias for backward compatibility
def get_langfuse():
    """
    Get Langfuse client for tracing.

    Delegates to langfuse_integration.get_langfuse_client().
    Returns None if Langfuse is not configured or not available.
    """
    return get_langfuse_client()


# =============================================================================
# Review Routing
# =============================================================================

def parse_review_verdict(output: str) -> ReviewVerdict:
    """
    Parse Jacob's review output to determine the verdict.

    Looks for:
    - "APPROVED" -> APPROVED
    - "NEEDS_FIXES" -> NEEDS_FIXES
    - "BLOCKED" -> BLOCKED

    Args:
        output: Jacob's review output text.

    Returns:
        ReviewVerdict enum value.
    """
    output_upper = output.upper()

    # Check for explicit verdicts in expected format
    if "DONE:JACOB - APPROVED" in output_upper or "VERDICT: APPROVED" in output_upper:
        return "APPROVED"
    if "DONE:JACOB - NEEDS_FIXES" in output_upper or "NEEDS_FIXES:" in output_upper:
        return "NEEDS_FIXES"
    if "DONE:JACOB - BLOCKED" in output_upper or "BLOCKED:" in output_upper:
        return "BLOCKED"

    # Fallback: look for keywords anywhere
    if "APPROVED" in output_upper and "NOT APPROVED" not in output_upper:
        return "APPROVED"
    if "NEEDS_FIXES" in output_upper or "NEEDS FIXES" in output_upper:
        return "NEEDS_FIXES"
    if "BLOCKED" in output_upper:
        return "BLOCKED"

    # Default to needs_fixes if unclear (conservative)
    logger.warning(f"Could not parse verdict from output, defaulting to NEEDS_FIXES")
    return "NEEDS_FIXES"


def route_after_review(review_output: str) -> str:
    """
    Determine next step based on Jacob's review.

    Per PRD §3.4:
    - APPROVED -> "done" (complete workflow)
    - NEEDS_FIXES -> "fix" (loop back to Alex)
    - BLOCKED -> "escalate" (escalate to CEO)

    Args:
        review_output: Jacob's review output text.

    Returns:
        Next step: "done", "fix", or "escalate"
    """
    verdict = parse_review_verdict(review_output)

    if verdict == "APPROVED":
        return "done"
    elif verdict == "NEEDS_FIXES":
        return "fix"
    else:  # BLOCKED
        return "escalate"


# =============================================================================
# TEAM_INBOX Integration
# =============================================================================

def update_team_inbox(agent_name: str, task_id: str, status: str, message: str) -> bool:
    """
    Update TEAM_INBOX.md Messages TO Joe section.

    Per PRD §5.1, this auto-updates the inbox when agents complete tasks.

    Args:
        agent_name: Name of the agent (e.g., "Alex", "Jacob")
        task_id: Task identifier (e.g., "AOS-025")
        status: Status emoji + text (e.g., "✅ **COMPLETE**")
        message: Completion message

    Returns:
        True if update succeeded, False otherwise
    """
    try:
        inbox_path = Path(config.team_inbox_path)

        if not inbox_path.exists():
            logger.error(f"TEAM_INBOX not found at {inbox_path}")
            return False

        content = inbox_path.read_text(encoding="utf-8")

        # Find the table after "Messages TO Joe" header
        table_header = "| From | Status | Message |"
        separator_row = "|------|--------|---------|"

        if table_header not in content:
            logger.error("Could not find Messages TO Joe table header")
            return False

        # Find position after separator row
        header_pos = content.find(table_header)
        sep_pos = content.find(separator_row, header_pos)

        if sep_pos == -1:
            logger.error("Could not find table separator row")
            return False

        # Insert new row after separator
        insert_pos = sep_pos + len(separator_row) + 1  # +1 for newline

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        new_row = f"| **{agent_name}** | {status} | **{task_id} ({timestamp}):** {message} |\n"

        updated = content[:insert_pos] + new_row + content[insert_pos:]

        inbox_path.write_text(updated, encoding="utf-8")
        logger.info(f"Updated TEAM_INBOX: {agent_name} - {task_id}")
        return True

    except Exception as e:
        logger.exception(f"Failed to update TEAM_INBOX: {e}")
        return False


# =============================================================================
# POC Workflow Implementation
# =============================================================================

class POCWorkflow:
    """
    Proof of Concept workflow: Alex implements -> Jacob reviews.

    Per PRD §8.3, this validates:
    1. Alex -> Jacob sequential execution
    2. Conditional routing based on review verdict
    3. Loop back capability for NEEDS_FIXES
    4. Langfuse tracing integration
    """

    def __init__(
        self,
        name: str = "POC-AlexJacob",
        max_iterations: int = 3,
    ):
        """
        Initialize the POC workflow.

        Args:
            name: Workflow name for tracing.
            max_iterations: Maximum review loops before escalating.
        """
        self.name = name
        self.max_iterations = max_iterations
        self.alex = alex
        self.jacob = jacob

    def run(self, task_id: str, task_description: str) -> WorkflowResult:
        """
        Execute the POC workflow with comprehensive Langfuse tracing.

        Workflow:
        1. Alex implements the task
        2. Jacob reviews Alex's work
        3. If APPROVED -> done
        4. If NEEDS_FIXES -> Alex fixes, Jacob re-reviews (up to max_iterations)
        5. If BLOCKED or max iterations -> escalate

        Args:
            task_id: Task identifier (e.g., "AOS-025-POC")
            task_description: Description of what Alex should implement.

        Returns:
            WorkflowResult with status, verdict, and execution details.
        """
        result = WorkflowResult(
            workflow_name=self.name,
            task_id=task_id,
            status="running",
        )

        start_time = datetime.utcnow()

        # Generate session ID for grouping all traces in this workflow run
        session_id = f"{self.name}:{task_id}:{start_time.strftime('%Y%m%d%H%M%S')}"

        # Use TracedWorkflow for comprehensive tracing (AOS-026)
        with TracedWorkflow(
            name=f"{self.name}:{task_id}",
            task_id=task_id,
            session_id=session_id,
            metadata={
                "workflow": self.name,
                "max_iterations": self.max_iterations,
            },
            tags=["workflow:poc", f"task:{task_id}"],
        ) as traced_wf:
            try:
                current_task = task_description
                iteration = 0

                while iteration < self.max_iterations:
                    iteration += 1
                    result.iterations = iteration
                    logger.info(f"[{task_id}] Iteration {iteration}/{self.max_iterations}")

                    # Step 1: Alex implements (with span tracing)
                    with traced_wf.span(
                        f"alex_impl_{iteration}",
                        metadata={"agent": "Alex", "iteration": iteration},
                    ):
                        alex_output = self._run_agent(
                            agent=self.alex,
                            task=current_task,
                            task_id=task_id,
                            session_id=session_id,
                            step_name=f"alex_impl_{iteration}",
                            result=result,
                            trace=traced_wf.trace,
                        )

                    # Step 2: Jacob reviews (with span tracing)
                    review_task = f"""Review Alex's implementation for task {task_id}.

Alex's output:
{alex_output}

Original task: {task_description}

Provide your verdict: APPROVED, NEEDS_FIXES (with specific issues), or BLOCKED (with reason)."""

                    with traced_wf.span(
                        f"jacob_review_{iteration}",
                        metadata={"agent": "Jacob", "iteration": iteration},
                    ):
                        jacob_output = self._run_agent(
                            agent=self.jacob,
                            task=review_task,
                            task_id=task_id,
                            session_id=session_id,
                            step_name=f"jacob_review_{iteration}",
                            result=result,
                            trace=traced_wf.trace,
                        )

                    # Step 3: Route based on verdict
                    next_step = route_after_review(jacob_output)
                    verdict = parse_review_verdict(jacob_output)
                    result.verdict = verdict

                    logger.info(f"[{task_id}] Jacob verdict: {verdict} -> {next_step}")

                    # Log verdict as a score for tracking (AOS-026)
                    traced_wf.score(
                        name=f"review_verdict_iter_{iteration}",
                        value={"APPROVED": 1.0, "NEEDS_FIXES": 0.5, "BLOCKED": 0.0}.get(verdict, 0.5),
                        comment=f"Iteration {iteration}: {verdict}",
                    )

                    if next_step == "done":
                        result.status = "completed"
                        logger.info(f"[{task_id}] Workflow completed - APPROVED")
                        break

                    elif next_step == "escalate":
                        result.status = "blocked"
                        logger.warning(f"[{task_id}] Workflow blocked - escalating")
                        break

                    else:  # fix - loop back
                        # Prepare fix task for Alex
                        current_task = f"""Fix the issues identified in Jacob's review.

Original task: {task_description}

Your previous implementation:
{alex_output}

Jacob's feedback:
{jacob_output}

Address all issues and re-implement."""
                        logger.info(f"[{task_id}] Looping back to Alex for fixes")

                # Check if we hit max iterations
                if result.status == "running":
                    result.status = "max_iterations"
                    logger.warning(f"[{task_id}] Max iterations ({self.max_iterations}) reached")

                # Update trace with final result
                traced_wf.update(
                    output={
                        "status": result.status,
                        "verdict": result.verdict,
                        "iterations": result.iterations,
                    }
                )

                # Add final workflow score
                workflow_score = {
                    "completed": 1.0,
                    "blocked": 0.0,
                    "max_iterations": 0.3,
                    "error": 0.0,
                }.get(result.status, 0.5)
                traced_wf.score(
                    name="workflow_success",
                    value=workflow_score,
                    comment=f"Final status: {result.status}",
                )

            except Exception as e:
                result.status = "error"
                result.error = str(e)
                logger.exception(f"[{task_id}] Workflow error: {e}")

        # Calculate total duration
        end_time = datetime.utcnow()
        result.total_duration_ms = int((end_time - start_time).total_seconds() * 1000)

        # Update TEAM_INBOX
        self._update_inbox(result)

        return result

    def _run_agent(
        self,
        agent: AgentDefinition,
        task: str,
        task_id: str,
        session_id: str,
        step_name: str,
        result: WorkflowResult,
        trace: Optional[Any] = None,
    ) -> str:
        """
        Run a single agent step with comprehensive Langfuse tracing (AOS-026).

        Tracing is done at two levels:
        1. Workflow span level (created by parent)
        2. Agent LLM call level (via LangChain callback in agent.invoke)

        Args:
            agent: Agent to run.
            task: Task description for the agent.
            task_id: Task identifier for tracing.
            session_id: Session ID for grouping related traces.
            step_name: Name for this step (for tracing).
            result: WorkflowResult to append step to.
            trace: Optional Langfuse trace (for nested spans).

        Returns:
            Agent's output as string.
        """
        step_start = datetime.utcnow()
        span = None

        # Create Langfuse span if trace provided (additional nesting)
        if trace:
            try:
                span = trace.span(
                    name=step_name,
                    metadata={
                        "agent": agent.name,
                        "model": agent.model,
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to create Langfuse span: {e}")

        logger.info(f"[{task_id}] Running {agent.name} ({agent.model})...")

        try:
            # Pass task_id and session_id to enable LangChain callback tracing (AOS-026)
            output = agent.invoke(
                task_description=task,
                task_id=task_id,
                session_id=session_id,
            )
        except Exception as e:
            output = f"ERROR: Agent execution failed: {e}"
            logger.error(f"[{task_id}] {agent.name} failed: {e}")

        step_end = datetime.utcnow()
        duration_ms = int((step_end - step_start).total_seconds() * 1000)

        # Record step
        step = WorkflowStep(
            agent=agent.name,
            task=task,
            output=output,
            timestamp=step_start,
            duration_ms=duration_ms,
        )
        result.steps.append(step)

        # Update Langfuse span with output
        if span:
            try:
                span.end(output={"result": output[:1000], "duration_ms": duration_ms})
            except Exception as e:
                logger.warning(f"Failed to end Langfuse span: {e}")

        logger.info(f"[{task_id}] {agent.name} completed in {duration_ms}ms")
        return output

    def _update_inbox(self, result: WorkflowResult) -> None:
        """Update TEAM_INBOX with workflow result."""
        if result.status == "completed":
            update_team_inbox(
                agent_name="Orchestrator",
                task_id=result.task_id,
                status="✅ **COMPLETE**",
                message=f"POC workflow completed. Verdict: {result.verdict}. "
                        f"Iterations: {result.iterations}. Duration: {result.total_duration_ms}ms.",
            )
        elif result.status == "blocked":
            update_team_inbox(
                agent_name="Orchestrator",
                task_id=result.task_id,
                status="❌ **BLOCKED**",
                message=f"POC workflow blocked. Requires CEO escalation. "
                        f"Iterations: {result.iterations}.",
            )
        elif result.status == "max_iterations":
            update_team_inbox(
                agent_name="Orchestrator",
                task_id=result.task_id,
                status="⚠️ **MAX_ITERATIONS**",
                message=f"POC workflow reached max iterations ({self.max_iterations}). "
                        f"Last verdict: {result.verdict}. Requires manual review.",
            )
        elif result.status == "error":
            update_team_inbox(
                agent_name="Orchestrator",
                task_id=result.task_id,
                status="❌ **ERROR**",
                message=f"POC workflow failed: {result.error}",
            )


# =============================================================================
# Convenience Functions
# =============================================================================

def run_poc_workflow(task_id: str, task_description: str, max_iterations: int = 3) -> WorkflowResult:
    """
    Run the POC workflow with default settings.

    This is the main entry point for triggering the Alex -> Jacob workflow.

    Args:
        task_id: Task identifier (e.g., "AOS-025-POC")
        task_description: Description of what Alex should implement.
        max_iterations: Maximum review loops (default: 3)

    Returns:
        WorkflowResult with status and execution details.
    """
    workflow = POCWorkflow(max_iterations=max_iterations)
    return workflow.run(task_id, task_description)
