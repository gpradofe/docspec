package com.waypoint.context;

import io.docspec.annotation.ContextInput;
import io.docspec.annotation.ContextUses;
import io.docspec.annotation.DocContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that generates thumbnail images for curricula that
 * do not yet have one.
 */
@DocContext(
    id = "thumbnail-generation-context",
    name = "Curriculum Thumbnail Generation",
    inputs = {
        @ContextInput(name = "Template Images", source = "src/main/resources/templates/",
            items = {"tech-beginner.svg", "tech-intermediate.svg", "tech-advanced.svg"})
    },
    flow = "1. Job triggers every hour via @Scheduled\n"
         + "2. Queries curricula without thumbnails\n"
         + "3. Selects template based on difficulty\n"
         + "4. Renders SVG to PNG using finddoc-core\n"
         + "5. Uploads to S3",
    uses = {
        @ContextUses(artifact = "com.waypoint:finddoc-core",
            what = "Document.render()", why = "Renders SVG templates to PNG thumbnails")
    }
)
@Component
public class ThumbnailGenerationJob {

    /**
     * Generates thumbnails for all curricula that are missing one.
     * Runs every hour (3,600,000 milliseconds).
     */
    @Scheduled(fixedRate = 3600000)
    public void generateThumbnails() {
    }
}
