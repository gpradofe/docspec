package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DataStoreModel;
import io.docspec.processor.model.DataStoreTopicModel;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import javax.lang.model.type.DeclaredType;
import javax.lang.model.type.TypeMirror;
import java.util.*;

@DocBoundary("Detects JPA entities, Spring Data repositories, and Redis/Kafka types and populates the data stores section of the DocSpec model.")
public class DataStoreExtractor implements DocSpecExtractor {

    private static final String JPA_ENTITY_JAVAX = "javax.persistence.Entity";
    private static final String JPA_ENTITY_JAKARTA = "jakarta.persistence.Entity";
    private static final String TABLE_JAVAX = "javax.persistence.Table";
    private static final String TABLE_JAKARTA = "jakarta.persistence.Table";

    private static final String[] SPRING_DATA_REPOS = {
            "org.springframework.data.repository.CrudRepository",
            "org.springframework.data.repository.PagingAndSortingRepository",
            "org.springframework.data.jpa.repository.JpaRepository",
            "org.springframework.data.repository.Repository"
    };

    private static final String REDIS_TEMPLATE = "org.springframework.data.redis.core.RedisTemplate";
    private static final String STRING_REDIS_TEMPLATE = "org.springframework.data.redis.core.StringRedisTemplate";
    private static final String KAFKA_TEMPLATE = "org.springframework.kafka.core.KafkaTemplate";
    private static final String KAFKA_LISTENER = "org.springframework.kafka.annotation.KafkaListener";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(JPA_ENTITY_JAVAX) != null
                || processingEnv.getElementUtils().getTypeElement(JPA_ENTITY_JAKARTA) != null;
    }

    @Override
    public String extractorName() {
        return "data-store";
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("data store extraction entry point")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();

        // Check if type has @Entity
        boolean isJpaEntity = hasAnnotation(typeElement, JPA_ENTITY_JAVAX)
                || hasAnnotation(typeElement, JPA_ENTITY_JAKARTA);

        if (isJpaEntity) {
            extractJpaEntity(typeElement, processingEnv, model);
        }

        // Check if type extends a Spring Data Repository
        if (extendsRepository(typeElement, processingEnv)) {
            extractRepositoryDataStore(typeElement, processingEnv, model);
        }

        // Check fields for Redis / Kafka types
        boolean hasRedis = false;
        boolean hasKafkaTemplate = false;
        boolean hasKafkaListener = false;

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                String fieldType = processingEnv.getTypeUtils().erasure(field.asType()).toString();
                if (fieldType.equals(REDIS_TEMPLATE) || fieldType.equals(STRING_REDIS_TEMPLATE)) {
                    hasRedis = true;
                }
                if (fieldType.equals(KAFKA_TEMPLATE)) {
                    hasKafkaTemplate = true;
                }
            }
            if (enclosed instanceof ExecutableElement method) {
                if (hasAnnotation(method, KAFKA_LISTENER)) {
                    hasKafkaListener = true;
                }
            }
        }

        if (hasRedis) {
            addDataStoreIfAbsent(model, "redis", "Redis", "cache");
        }

        if (hasKafkaTemplate || hasKafkaListener) {
            DataStoreModel kafkaStore = addDataStoreIfAbsent(model, "kafka", "Kafka", "message-broker");
            // Extract topics from @KafkaListener annotations
            for (Element enclosed : typeElement.getEnclosedElements()) {
                if (enclosed instanceof ExecutableElement method) {
                    AnnotationMirror listener = findAnnotation(method, KAFKA_LISTENER);
                    if (listener != null) {
                        List<String> topics = getStringArrayValue(listener, "topics", processingEnv);
                        if (topics != null) {
                            for (String topic : topics) {
                                boolean alreadyPresent = kafkaStore.getTopics().stream()
                                        .anyMatch(t -> topic.equals(t.getName()));
                                if (!alreadyPresent) {
                                    DataStoreTopicModel topicModel = new DataStoreTopicModel();
                                    topicModel.setName(topic);
                                    kafkaStore.getTopics().add(topicModel);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // --- Private helpers ---

    private void extractJpaEntity(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String tableName = null;

        // Try to get table name from @Table annotation
        AnnotationMirror table = findAnnotation(typeElement, TABLE_JAVAX);
        if (table == null) {
            table = findAnnotation(typeElement, TABLE_JAKARTA);
        }
        if (table != null) {
            tableName = getStringValue(table, "name", processingEnv);
        }
        if (tableName == null || tableName.isEmpty()) {
            // Derive table name from class name
            tableName = typeElement.getSimpleName().toString();
        }

        DataStoreModel rdbms = addDataStoreIfAbsent(model, "rdbms", "Primary Database", "rdbms");
        if (!rdbms.getTables().contains(tableName)) {
            rdbms.getTables().add(tableName);
        }
    }

    private void extractRepositoryDataStore(TypeElement typeElement, ProcessingEnvironment processingEnv,
                                             DocSpecModel model) {
        // Repositories imply an RDBMS data store
        addDataStoreIfAbsent(model, "rdbms", "Primary Database", "rdbms");
    }

    private boolean extendsRepository(TypeElement typeElement, ProcessingEnvironment processingEnv) {
        // Check all interfaces
        for (TypeMirror iface : typeElement.getInterfaces()) {
            String ifaceErasure = processingEnv.getTypeUtils().erasure(iface).toString();
            for (String repoType : SPRING_DATA_REPOS) {
                if (ifaceErasure.equals(repoType)) {
                    return true;
                }
            }
            // Recursively check super-interfaces
            Element ifaceElement = processingEnv.getTypeUtils().asElement(iface);
            if (ifaceElement instanceof TypeElement ifaceType) {
                if (extendsRepository(ifaceType, processingEnv)) {
                    return true;
                }
            }
        }

        // Check superclass
        TypeMirror superclass = typeElement.getSuperclass();
        if (superclass != null && !superclass.toString().equals("java.lang.Object")
                && !superclass.toString().equals("none")) {
            Element superElement = processingEnv.getTypeUtils().asElement(superclass);
            if (superElement instanceof TypeElement superType) {
                return extendsRepository(superType, processingEnv);
            }
        }

        return false;
    }

    @DocMethod("Adds a DataStoreModel with the given id if one does not already exist, returns the existing or newly created store")
    private DataStoreModel addDataStoreIfAbsent(DocSpecModel model, String id, String name, String type) {
        for (DataStoreModel existing : model.getDataStores()) {
            if (id.equals(existing.getId())) {
                return existing;
            }
        }
        DataStoreModel store = new DataStoreModel();
        store.setId(id);
        store.setName(name);
        store.setType(type);
        model.getDataStores().add(store);
        return store;
    }

    private boolean hasAnnotation(Element element, String annotationQualifiedName) {
        return findAnnotation(element, annotationQualifiedName) != null;
    }

    private AnnotationMirror findAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    private String getStringValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof String s) {
                    return s.isEmpty() ? null : s;
                }
                return value != null ? value.toString() : null;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringArrayValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof List<?> list) {
                    List<String> result = new ArrayList<>();
                    for (Object item : list) {
                        if (item instanceof AnnotationValue av) {
                            result.add(av.getValue().toString());
                        }
                    }
                    return result.isEmpty() ? null : result;
                }
            }
        }
        return null;
    }
}
