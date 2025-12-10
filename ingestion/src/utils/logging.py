"""Logging configuration for the ingestion service."""

import logging
import sys
from rich.logging import RichHandler
from rich.console import Console

from ..config import get_settings


def setup_logging(verbose: bool = False):
    """Configure logging with rich output.

    Args:
        verbose: If True, set DEBUG level; otherwise use config level
    """
    settings = get_settings()
    level = "DEBUG" if verbose else settings.log_level

    # Create console for rich output
    console = Console(stderr=True)

    # Configure root logger
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[
            RichHandler(
                console=console,
                rich_tracebacks=True,
                tracebacks_show_locals=verbose,
                show_time=True,
                show_path=verbose,
            )
        ],
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    logger = logging.getLogger(__name__)
    logger.debug(f"Logging configured at {level} level")
