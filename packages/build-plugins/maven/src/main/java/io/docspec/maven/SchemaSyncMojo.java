package io.docspec.maven;

import io.docspec.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.project.MavenProject;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Mojo(
        name = "schema-sync",
        defaultPhase = LifecyclePhase.VALIDATE
)
@DocBoundary("Compares JPA entity fields from docspec.json against Flyway SQL migration files to detect schema mismatches. Reads CREATE TABLE and ALTER TABLE statements from migration files.")
@DocError(code = "DOCSPEC_SYNC_001",
    description = "JPA entity fields do not match the Flyway migration schema.",
    causes = {"A JPA entity field was added without a corresponding migration", "A migration column was added without a matching entity field", "Column type mismatch between entity and migration"},
    resolution = "Add the missing Flyway migration or update the JPA entity to match the database schema."
)
public class SchemaSyncMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    @Parameter(property = "docspec.json.path")
    private File docspecPath;

    @Parameter(property = "docspec.migrations.dir",
            defaultValue = "${project.basedir}/src/main/resources/db/migration")
    private File migrationsDir;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        // Locate docspec.json
        File specFile = docspecPath;
        if (specFile == null || !specFile.exists()) {
            specFile = new File(project.getBuild().getDirectory(), "docspec.json");
        }
        if (!specFile.exists()) {
            getLog().info("DocSpec: No docspec.json found. Run docspec:generate first. Skipping schema-sync.");
            return;
        }

        if (!migrationsDir.exists() || !migrationsDir.isDirectory()) {
            getLog().info("DocSpec: No migrations directory found at " + migrationsDir.getAbsolutePath() + ". Skipping schema-sync.");
            return;
        }

        getLog().info("DocSpec: Comparing JPA entities against Flyway migrations");

        try {
            // Parse docspec.json for data models
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(specFile);
            JsonNode dataModels = root.get("dataModels");
            if (dataModels == null || !dataModels.isArray() || dataModels.isEmpty()) {
                getLog().info("DocSpec: No data models found in docspec.json. Skipping schema-sync.");
                return;
            }

            // Extract JPA entity fields by table name
            Map<String, Set<String>> jpaFieldsByTable = new LinkedHashMap<>();
            for (JsonNode dm : dataModels) {
                String table = dm.has("table") ? dm.get("table").asText() : null;
                if (table == null || table.isBlank()) continue;

                Set<String> fields = new LinkedHashSet<>();
                JsonNode fieldsNode = dm.get("fields");
                if (fieldsNode != null && fieldsNode.isArray()) {
                    for (JsonNode field : fieldsNode) {
                        String column = field.has("column") ? field.get("column").asText() : null;
                        if (column == null || column.isBlank()) {
                            column = field.has("name") ? field.get("name").asText() : null;
                        }
                        if (column != null && !column.isBlank()) {
                            fields.add(column.toLowerCase());
                        }
                    }
                }
                jpaFieldsByTable.put(table.toLowerCase(), fields);
            }

            // Parse Flyway migrations for CREATE TABLE columns
            Map<String, Set<String>> sqlColumnsByTable = parseMigrations();

            // Compare
            int mismatches = 0;
            for (Map.Entry<String, Set<String>> entry : jpaFieldsByTable.entrySet()) {
                String table = entry.getKey();
                Set<String> jpaFields = entry.getValue();
                Set<String> sqlColumns = sqlColumnsByTable.getOrDefault(table, Collections.emptySet());

                if (sqlColumns.isEmpty()) {
                    getLog().warn("DocSpec schema-sync: Table '" + table + "' exists in JPA entities but no CREATE TABLE found in migrations");
                    mismatches++;
                    continue;
                }

                // Fields in JPA but not in SQL
                Set<String> missingInSql = new LinkedHashSet<>(jpaFields);
                missingInSql.removeAll(sqlColumns);
                for (String col : missingInSql) {
                    getLog().warn("DocSpec schema-sync: Column '" + col + "' in table '" + table
                            + "' exists in JPA entity but not in migrations");
                    mismatches++;
                }

                // Fields in SQL but not in JPA
                Set<String> missingInJpa = new LinkedHashSet<>(sqlColumns);
                missingInJpa.removeAll(jpaFields);
                for (String col : missingInJpa) {
                    getLog().info("DocSpec schema-sync: Column '" + col + "' in table '" + table
                            + "' exists in migrations but not in JPA entity (may be unmapped)");
                }
            }

            if (mismatches == 0) {
                getLog().info("DocSpec schema-sync: All JPA entities are consistent with migrations");
            } else {
                getLog().warn("DocSpec schema-sync: Found " + mismatches + " mismatch(es)");
            }
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to perform schema sync", e);
        }
    }

    private Map<String, Set<String>> parseMigrations() throws IOException {
        Map<String, Set<String>> result = new LinkedHashMap<>();
        Pattern createTable = Pattern.compile(
                "CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[`\"']?(\\w+)[`\"']?\\s*\\(([^;]+)\\)",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Pattern alterTable = Pattern.compile(
                "ALTER\\s+TABLE\\s+[`\"']?(\\w+)[`\"']?\\s+ADD\\s+(?:COLUMN\\s+)?[`\"']?(\\w+)[`\"']?",
                Pattern.CASE_INSENSITIVE);

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(migrationsDir.toPath(), "*.sql")) {
            List<Path> files = new ArrayList<>();
            stream.forEach(files::add);
            Collections.sort(files);

            for (Path file : files) {
                String sql = Files.readString(file);

                // Parse CREATE TABLE statements
                Matcher createMatcher = createTable.matcher(sql);
                while (createMatcher.find()) {
                    String tableName = createMatcher.group(1).toLowerCase();
                    String columnDefs = createMatcher.group(2);
                    Set<String> columns = result.computeIfAbsent(tableName, k -> new LinkedHashSet<>());

                    // Parse column definitions (simplified)
                    for (String colDef : columnDefs.split(",")) {
                        String trimmed = colDef.trim();
                        if (trimmed.isEmpty() || trimmed.toUpperCase().startsWith("PRIMARY")
                                || trimmed.toUpperCase().startsWith("CONSTRAINT")
                                || trimmed.toUpperCase().startsWith("UNIQUE")
                                || trimmed.toUpperCase().startsWith("INDEX")
                                || trimmed.toUpperCase().startsWith("FOREIGN")
                                || trimmed.toUpperCase().startsWith("CHECK")) {
                            continue;
                        }
                        // First word is the column name
                        String[] parts = trimmed.split("\\s+", 2);
                        if (parts.length >= 1) {
                            String colName = parts[0].replaceAll("[`\"']", "").toLowerCase();
                            if (!colName.isEmpty()) {
                                columns.add(colName);
                            }
                        }
                    }
                }

                // Parse ALTER TABLE ADD COLUMN
                Matcher alterMatcher = alterTable.matcher(sql);
                while (alterMatcher.find()) {
                    String tableName = alterMatcher.group(1).toLowerCase();
                    String colName = alterMatcher.group(2).toLowerCase();
                    result.computeIfAbsent(tableName, k -> new LinkedHashSet<>()).add(colName);
                }
            }
        }

        return result;
    }
}
