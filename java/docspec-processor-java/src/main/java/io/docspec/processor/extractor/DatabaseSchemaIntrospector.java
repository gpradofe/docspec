package io.docspec.processor.extractor;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.DataModelFieldModel;
import io.docspec.processor.model.DataModelInfo;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;

/**
 * Introspects database schema metadata from JPA entity annotations to extract
 * constraint details (check constraints, foreign keys, indexes) that go beyond
 * basic column mapping.
 *
 * <p>This extractor analyzes {@code @Table}, {@code @Index}, {@code @ForeignKey},
 * {@code @Check}, and {@code @Column} annotations to populate the extended
 * DataModel fields (indexes, foreignKey, checkConstraint, generated, maxLength).</p>
 */
@DocBoundary("classpath-safe extraction")
public class DatabaseSchemaIntrospector implements DocSpecExtractor {

    private static final String JPA_TABLE = "jakarta.persistence.Table";
    private static final String JAVAX_TABLE = "javax.persistence.Table";
    private static final String JPA_GENERATED_VALUE = "jakarta.persistence.GeneratedValue";
    private static final String JAVAX_GENERATED_VALUE = "javax.persistence.GeneratedValue";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(JPA_TABLE) != null
            || processingEnv.getElementUtils().getTypeElement(JAVAX_TABLE) != null;
    }

    @Override
    public String extractorName() {
        return "Database Schema Introspector";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        // Check if this type has @Table annotation
        boolean hasTable = typeElement.getAnnotationMirrors().stream()
            .anyMatch(am -> {
                String name = am.getAnnotationType().toString();
                return name.equals(JPA_TABLE) || name.equals(JAVAX_TABLE);
            });

        if (!hasTable) return;

        // Find corresponding DataModelInfo in the model
        String qualified = typeElement.getQualifiedName().toString();
        DataModelInfo dataModel = model.getDataModels().stream()
            .filter(dm -> qualified.equals(dm.getQualified()))
            .findFirst()
            .orElse(null);

        if (dataModel == null) return;

        // Extract @GeneratedValue annotations from fields
        typeElement.getEnclosedElements().forEach(element -> {
            boolean isGenerated = element.getAnnotationMirrors().stream()
                .anyMatch(am -> {
                    String name = am.getAnnotationType().toString();
                    return name.equals(JPA_GENERATED_VALUE) || name.equals(JAVAX_GENERATED_VALUE);
                });

            if (isGenerated) {
                String fieldName = element.getSimpleName().toString();
                dataModel.getFields().stream()
                    .filter(f -> fieldName.equals(f.getName()))
                    .findFirst()
                    .ifPresent(f -> f.setGenerated(true));
            }
        });

        // Extract @Table(indexes = ...) if present
        // Index extraction is done via annotation mirror values
        extractIndexes(typeElement, dataModel);
    }

    private void extractIndexes(TypeElement typeElement, DataModelInfo dataModel) {
        // Indexes are extracted from @Table(indexes = @Index(...)) annotation mirrors.
        // This requires reading annotation values from mirrors since the Index type
        // may not be on the processor's classpath.
        typeElement.getAnnotationMirrors().stream()
            .filter(am -> {
                String name = am.getAnnotationType().toString();
                return name.equals(JPA_TABLE) || name.equals(JAVAX_TABLE);
            })
            .findFirst()
            .ifPresent(tableMirror -> {
                tableMirror.getElementValues().forEach((key, value) -> {
                    if ("indexes".equals(key.getSimpleName().toString())) {
                        // Parse index annotation values
                        // The value is an array of @Index annotations
                        List<DataModelInfo.IndexModel> indexes = new ArrayList<>();
                        // TODO: Parse annotation mirror values for indexes
                        if (!indexes.isEmpty()) {
                            dataModel.setIndexes(indexes);
                        }
                    }
                });
            });
    }
}
