"""DocSpec extractors — domain-specific documentation extraction."""
# @docspec:module {
#   id: "docspec-py-extractor-pkg",
#   name: "Domain Extractors Package",
#   description: "Re-exports all seven domain-specific extractors: security, config, observability, data stores, external deps, privacy, and error/event.",
#   since: "3.0.0"
# }
from docspec_processor.extractor.extractor_interface import DocSpecExtractor
from docspec_processor.extractor.security_extractor import SecurityExtractor
from docspec_processor.extractor.config_extractor import ConfigExtractor
from docspec_processor.extractor.observability_extractor import ObservabilityExtractor
from docspec_processor.extractor.datastore_extractor import DataStoreExtractor
from docspec_processor.extractor.external_dep_extractor import ExternalDepExtractor
from docspec_processor.extractor.privacy_extractor import PrivacyExtractor
from docspec_processor.extractor.error_event_extractor import ErrorEventExtractor

__all__ = [
    "DocSpecExtractor",
    "SecurityExtractor",
    "ConfigExtractor",
    "ObservabilityExtractor",
    "DataStoreExtractor",
    "ExternalDepExtractor",
    "PrivacyExtractor",
    "ErrorEventExtractor",
]
