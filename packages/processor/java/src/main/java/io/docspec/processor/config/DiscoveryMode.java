package io.docspec.processor.config;

public enum DiscoveryMode {
    AUTO,
    ANNOTATED_ONLY,
    HYBRID;

    public static DiscoveryMode fromString(String value) {
        if (value == null || value.isBlank()) {
            return HYBRID;
        }
        return switch (value.toLowerCase().replace("-", "_")) {
            case "auto" -> AUTO;
            case "annotated_only", "annotated-only" -> ANNOTATED_ONLY;
            case "hybrid" -> HYBRID;
            default -> HYBRID;
        };
    }
}
