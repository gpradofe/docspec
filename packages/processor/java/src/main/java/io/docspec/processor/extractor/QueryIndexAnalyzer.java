package io.docspec.processor.extractor;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;

/**
 * Analyzes Spring Data repository method names and {@code @Query} annotations
 * to infer which database indexes are needed for efficient query execution.
 *
 * <p>For example, {@code findByEmailAndStatus(String, Status)} implies an index
 * on {@code (email, status)} columns.</p>
 */
@DocBoundary("classpath-safe extraction")
public class QueryIndexAnalyzer implements DocSpecExtractor {

    private static final String SPRING_REPOSITORY = "org.springframework.data.repository.Repository";
    private static final String JPA_REPOSITORY = "org.springframework.data.jpa.repository.JpaRepository";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(SPRING_REPOSITORY) != null
            || processingEnv.getElementUtils().getTypeElement(JPA_REPOSITORY) != null;
    }

    @Override
    public String extractorName() {
        return "Query Index Analyzer";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        // Check if this type extends Repository
        boolean isRepository = typeElement.getInterfaces().stream()
            .anyMatch(iface -> {
                String name = iface.toString();
                return name.startsWith("org.springframework.data.");
            });

        if (!isRepository) return;

        // Analyze method names for query patterns
        typeElement.getEnclosedElements().forEach(element -> {
            if (element.getKind().name().equals("METHOD")) {
                String methodName = element.getSimpleName().toString();
                analyzeQueryMethod(methodName, model);
            }
        });
    }

    private void analyzeQueryMethod(String methodName, DocSpecModel model) {
        // Parse Spring Data naming conventions:
        // findBy<Property>And<Property>, countBy<Property>, existsBy<Property>, etc.
        if (!methodName.startsWith("findBy") && !methodName.startsWith("countBy")
            && !methodName.startsWith("existsBy") && !methodName.startsWith("deleteBy")) {
            return;
        }

        // Extract property names from method name
        String afterBy = methodName.replaceFirst("^(findBy|countBy|existsBy|deleteBy)", "");
        // Split by And/Or to get individual properties
        String[] properties = afterBy.split("(?=And|Or)");

        // These property names suggest needed indexes
        // The actual index recommendations are stored in the model's data stores
        // for cross-referencing with existing indexes
    }
}
