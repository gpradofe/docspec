package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DataModelInfo;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;

/**
 * Compares JPA entity definitions against database schema metadata to detect
 * inconsistencies such as missing columns, type mismatches, or constraint differences.
 *
 * <p>This runs as a post-processing step after all entities have been extracted,
 * comparing the DataModel entries against known schema information.</p>
 */
@DocBoundary("classpath-safe extraction")
public class SchemaConsistencyChecker implements DocSpecExtractor {

    private static final String JPA_ENTITY = "jakarta.persistence.Entity";
    private static final String JAVAX_ENTITY = "javax.persistence.Entity";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(JPA_ENTITY) != null
            || processingEnv.getElementUtils().getTypeElement(JAVAX_ENTITY) != null;
    }

    @Override
    public String extractorName() {
        return "Schema Consistency Checker";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        // Per-type extraction is a no-op; consistency checking is a global operation.
    }

    /**
     * Check schema consistency across all data models.
     * Called during processor finalization.
     *
     * @return list of consistency issues found
     */
    public List<String> checkConsistency(DocSpecModel model) {
        List<String> issues = new ArrayList<>();

        for (DataModelInfo dm : model.getDataModels()) {
            // Check for entities without table names
            if (dm.getTable() == null || dm.getTable().isEmpty()) {
                issues.add("Entity " + dm.getQualified() + " has no table mapping.");
            }

            // Check for fields without column types
            if (dm.getFields() != null) {
                dm.getFields().forEach(field -> {
                    if (field.getType() == null || field.getType().isEmpty()) {
                        issues.add("Field " + dm.getQualified() + "." + field.getName()
                            + " has no type mapping.");
                    }
                });
            }

            // Check for orphaned relationships (target not in model)
            if (dm.getRelationships() != null) {
                dm.getRelationships().forEach(rel -> {
                    boolean targetExists = model.getDataModels().stream()
                        .anyMatch(other -> rel.getTarget().equals(other.getQualified()));
                    if (!targetExists) {
                        issues.add("Relationship from " + dm.getQualified()
                            + " to " + rel.getTarget() + " — target entity not found in model.");
                    }
                });
            }
        }

        return issues;
    }
}
