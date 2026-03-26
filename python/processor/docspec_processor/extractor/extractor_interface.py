"""Base interface for all DocSpec extractors.

Mirrors the Java ``DocSpecExtractor`` interface: each extractor checks whether
the relevant framework/library is present (``is_available``) and then extracts
domain-specific documentation into the shared context dict (``extract``).
"""
# @docspec:module {
#   id: "docspec-py-extractor-interface",
#   name: "Extractor Interface",
#   description: "Defines the DocSpecExtractor ABC and ExtractionContext dataclass shared by all domain extractors. Mirrors the Java DocSpecExtractor contract.",
#   since: "3.0.0"
# }
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


# @docspec:boundary "Shared mutable context for all domain extractors"
@dataclass
class ExtractionContext:
    """Shared mutable context passed to every extractor.

    Attributes:
        source_dir: Root directory of the scanned project.
        sources: List of ``{"path", "source", "module", "qualified_prefix"}``
                 dicts produced by the scanner.
        model: The output dict that will become ``docspec.json``.  Extractors
               add their domain-specific keys (``security``, ``configuration``,
               ``observability``, ``dataStores``, ``externalDependencies``,
               ``privacy``, ``errors``, ``events``) directly to this dict.
    """

    source_dir: str = ""
    sources: list[dict[str, Any]] = field(default_factory=list)
    model: dict[str, Any] = field(default_factory=dict)


# @docspec:boundary "Abstract base for all domain-specific documentation extractors"
class DocSpecExtractor(ABC):
    """Abstract base class for domain extractors.

    Follows the same contract as the Java ``DocSpecExtractor``:
      * ``is_available`` -- fast pre-check (e.g. import scan)
      * ``extractor_name`` -- human-readable label for diagnostics
      * ``extract`` -- do the actual work and mutate ``context.model``
    """

    # @docspec:intentional "Check if the targeted framework or library is present in the scanned sources"
    @abstractmethod
    def is_available(self, context: ExtractionContext) -> bool:
        """Return ``True`` if the framework/library this extractor targets is
        present in the scanned sources."""
        ...

    # @docspec:deterministic
    @abstractmethod
    def extractor_name(self) -> str:
        """Return a short human-readable name for diagnostic messages."""
        ...

    # @docspec:intentional "Analyze all sources in context and populate context.model with domain-specific documentation"
    @abstractmethod
    def extract(self, context: ExtractionContext) -> None:
        """Analyze all sources in *context* and mutate ``context.model``."""
        ...
