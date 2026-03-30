package io.docspec.processor.scanner;

import io.docspec.annotation.*;
import io.docspec.processor.config.ProcessorConfig;
import io.docspec.processor.model.MemberModel;
import io.docspec.processor.model.MethodModel;
import io.docspec.processor.model.MethodParamModel;
import io.docspec.processor.model.FieldModel;
import io.docspec.processor.model.ConstructorModel;
import io.docspec.processor.model.AnnotationModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import javax.lang.model.type.DeclaredType;
import javax.lang.model.type.TypeMirror;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@DocBoundary("classpath scanner")
public class AutoDiscoveryScanner {

    private final ProcessingEnvironment processingEnv;
    private final PackageFilter packageFilter;
    private final ProcessorConfig config;

    public AutoDiscoveryScanner(ProcessingEnvironment processingEnv, ProcessorConfig config) {
        this.processingEnv = processingEnv;
        this.config = config;
        this.packageFilter = new PackageFilter(config.getIncludePackages(), config.getExcludePackages());
    }

    @DocMethod(since = "3.0.0")
    @DocBoundary("auto-discovery scan entry point")
    public List<TypeElement> scan(Set<? extends Element> rootElements) {
        List<TypeElement> discovered = new ArrayList<>();
        for (Element element : rootElements) {
            if (element instanceof TypeElement typeElement) {
                if (shouldInclude(typeElement)) {
                    discovered.add(typeElement);
                }
            }
        }
        return discovered;
    }

    @DocMethod(since = "3.0.0")
    public MemberModel toMemberModel(TypeElement typeElement) {
        MemberModel member = new MemberModel();
        member.setKind(resolveKind(typeElement));
        member.setName(typeElement.getSimpleName().toString());
        member.setQualified(typeElement.getQualifiedName().toString());
        member.setVisibility(resolveVisibility(typeElement));
        member.setModifiers(resolveModifiers(typeElement));
        member.setDiscoveredFrom("auto");

        // Type parameters
        if (!typeElement.getTypeParameters().isEmpty()) {
            member.setTypeParams(typeElement.getTypeParameters().stream()
                    .map(tp -> tp.getSimpleName().toString())
                    .toList());
        }

        // Superclass
        TypeMirror superclass = typeElement.getSuperclass();
        if (superclass instanceof DeclaredType dt) {
            String superName = ((TypeElement) dt.asElement()).getQualifiedName().toString();
            if (!superName.equals("java.lang.Object") && !superName.equals("java.lang.Enum")) {
                member.setExtendsType(((TypeElement) dt.asElement()).getSimpleName().toString());
            }
        }

        // Interfaces
        List<String> interfaces = typeElement.getInterfaces().stream()
                .filter(t -> t instanceof DeclaredType)
                .map(t -> ((TypeElement) ((DeclaredType) t).asElement()).getSimpleName().toString())
                .toList();
        if (!interfaces.isEmpty()) {
            member.setImplementsList(interfaces);
        }

        // Annotations on the type itself
        for (AnnotationMirror am : typeElement.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) am.getAnnotationType().asElement();
            String annoQualified = annotationType.getQualifiedName().toString();
            // Skip internal Java annotations and our own processor markers
            if (annoQualified.startsWith("java.lang.") || annoQualified.startsWith("javax.annotation.")) continue;
            AnnotationModel annoModel = new AnnotationModel(
                    annotationType.getSimpleName().toString(),
                    annoQualified
            );
            // Extract string attribute values
            for (var entry : am.getElementValues().entrySet()) {
                String key = entry.getKey().getSimpleName().toString();
                Object val = entry.getValue().getValue();
                if (val instanceof String s) {
                    annoModel.getAttributes().put(key, s);
                } else {
                    annoModel.getAttributes().put(key, val.toString());
                }
            }
            member.getAnnotations().add(annoModel);
        }

        // Methods
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof ExecutableElement method) {
                if (method.getKind() == ElementKind.METHOD && shouldIncludeMember(method)) {
                    member.getMethods().add(toMethodModel(method));
                } else if (method.getKind() == ElementKind.CONSTRUCTOR && shouldIncludeMember(method)) {
                    member.getConstructors().add(toConstructorModel(method));
                }
            } else if (enclosed instanceof VariableElement field) {
                if (enclosed.getKind() == ElementKind.FIELD && shouldIncludeMember(field)) {
                    member.getFields().add(toFieldModel(field));
                } else if (enclosed.getKind() == ElementKind.ENUM_CONSTANT) {
                    member.getValues().add(field.getSimpleName().toString());
                }
            }
        }

        return member;
    }

    public MethodModel toMethodModel(ExecutableElement method) {
        MethodModel model = new MethodModel();
        model.setName(method.getSimpleName().toString());
        model.setVisibility(resolveVisibility(method));
        model.setModifiers(resolveModifiers(method));

        // Parameters
        for (VariableElement param : method.getParameters()) {
            MethodParamModel paramModel = new MethodParamModel();
            paramModel.setName(param.getSimpleName().toString());
            paramModel.setType(param.asType().toString());
            paramModel.setRequired(true);
            model.getParams().add(paramModel);
        }

        // Return type
        TypeMirror returnType = method.getReturnType();
        if (returnType.getKind() != javax.lang.model.type.TypeKind.VOID) {
            MethodModel.ReturnModel returnModel = new MethodModel.ReturnModel();
            returnModel.setType(simplifyType(returnType.toString()));
            model.setReturns(returnModel);
        }

        // Throws
        for (TypeMirror thrownType : method.getThrownTypes()) {
            MethodModel.ThrowsModel throwsModel = new MethodModel.ThrowsModel();
            throwsModel.setType(simplifyType(thrownType.toString()));
            model.getThrowsList().add(throwsModel);
        }

        return model;
    }

    private ConstructorModel toConstructorModel(ExecutableElement constructor) {
        ConstructorModel model = new ConstructorModel();
        model.setVisibility(resolveVisibility(constructor));
        for (VariableElement param : constructor.getParameters()) {
            MethodParamModel paramModel = new MethodParamModel();
            paramModel.setName(param.getSimpleName().toString());
            paramModel.setType(param.asType().toString());
            paramModel.setRequired(true);
            model.getParams().add(paramModel);
        }
        return model;
    }

    private FieldModel toFieldModel(VariableElement field) {
        FieldModel model = new FieldModel();
        model.setName(field.getSimpleName().toString());
        model.setType(simplifyType(field.asType().toString()));
        model.setVisibility(resolveVisibility(field));
        model.setModifiers(resolveModifiers(field));
        return model;
    }

    private boolean shouldInclude(TypeElement element) {
        // Must be a class, interface, enum, record, or annotation type
        ElementKind kind = element.getKind();
        if (kind != ElementKind.CLASS && kind != ElementKind.INTERFACE
                && kind != ElementKind.ENUM && kind != ElementKind.RECORD
                && kind != ElementKind.ANNOTATION_TYPE) {
            return false;
        }
        // Must be public
        if (!element.getModifiers().contains(Modifier.PUBLIC)) {
            return false;
        }
        // Must pass package filter
        String qualified = element.getQualifiedName().toString();
        return packageFilter.accepts(qualified);
    }

    private boolean shouldIncludeMember(Element element) {
        Set<Modifier> mods = element.getModifiers();
        // Visibility check
        boolean visible = mods.contains(Modifier.PUBLIC)
                || (config.isIncludeProtected() && mods.contains(Modifier.PROTECTED));
        if (!visible && mods.contains(Modifier.PROTECTED)) {
            // Protected but config says not to include
            return false;
        }
        if (!visible) return false;

        // Deprecated check
        if (!config.isIncludeDeprecated()) {
            for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
                String annotName = ((TypeElement) mirror.getAnnotationType().asElement())
                        .getQualifiedName().toString();
                if ("java.lang.Deprecated".equals(annotName)) {
                    return false;
                }
            }
        }
        return true;
    }

    private boolean isPublicOrProtected(Element element) {
        Set<Modifier> mods = element.getModifiers();
        return mods.contains(Modifier.PUBLIC) || mods.contains(Modifier.PROTECTED);
    }

    private String resolveKind(TypeElement element) {
        return switch (element.getKind()) {
            case CLASS -> "class";
            case INTERFACE -> "interface";
            case ENUM -> "enum";
            case RECORD -> "record";
            case ANNOTATION_TYPE -> "annotation";
            default -> "class";
        };
    }

    private String resolveVisibility(Element element) {
        Set<Modifier> mods = element.getModifiers();
        if (mods.contains(Modifier.PUBLIC)) return "public";
        if (mods.contains(Modifier.PROTECTED)) return "protected";
        if (mods.contains(Modifier.PRIVATE)) return "private";
        return "package-private";
    }

    private List<String> resolveModifiers(Element element) {
        List<String> result = new ArrayList<>();
        Set<Modifier> mods = element.getModifiers();
        if (mods.contains(Modifier.ABSTRACT)) result.add("abstract");
        if (mods.contains(Modifier.FINAL)) result.add("final");
        if (mods.contains(Modifier.STATIC)) result.add("static");
        if (mods.contains(Modifier.SEALED)) result.add("sealed");
        return result.isEmpty() ? null : result;
    }

    private String simplifyType(String fullType) {
        // Remove package prefixes for common types, keep simple name
        int lastDot = fullType.lastIndexOf('.');
        if (lastDot > 0 && !fullType.contains("<")) {
            return fullType.substring(lastDot + 1);
        }
        // For generic types, simplify the outer type but keep generics
        return fullType
                .replaceAll("java\\.lang\\.", "")
                .replaceAll("java\\.util\\.", "");
    }
}
