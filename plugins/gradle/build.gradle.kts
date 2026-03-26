plugins {
    `java-gradle-plugin`
    kotlin("jvm") version "1.9.22"
    id("com.gradle.plugin-publish") version "1.2.1"
}

group = "io.docspec"
version = "0.1.0"

repositories {
    mavenCentral()
    mavenLocal()
}

dependencies {
    implementation("io.docspec:docspec-processor-java:1.0.0-SNAPSHOT")
    implementation("io.docspec:docspec-annotations-java:1.0.0-SNAPSHOT")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.0")
    implementation("com.networknt:json-schema-validator:1.5.1")
}

kotlin {
    jvmToolchain(17)
}

gradlePlugin {
    website.set("https://docspec.dev")
    vcsUrl.set("https://github.com/docspec/docspec")

    plugins {
        create("docspec") {
            id = "io.docspec"
            displayName = "DocSpec Documentation Plugin"
            description = "Generates structured, machine-readable documentation from Java/Kotlin source code using the DocSpec v3 specification."
            tags.set(listOf("documentation", "api", "docspec", "code-analysis"))
            implementationClass = "io.docspec.gradle.DocSpecPlugin"
        }
    }
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs = listOf("-Xjsr305=strict")
    }
}
