// @docspec:module {
//   id: "docspec-csharp-serializer",
//   name: "DocSpec Serializer",
//   description: "Serializes the DocSpec output model to JSON and writes docspec.json to the output directory.",
//   since: "3.0.0"
// }

using System.Text.Json;

namespace DocSpec.Analyzer.Output;

/// <summary>Write docspec.json output.</summary>
// [DocIntentional("Serialize the DocSpec output model to a pretty-printed JSON file")]
public class Serializer
{
    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Serialize DocSpec output to pretty-printed JSON and write to docspec.json in the output directory")]
    public void Write(object data, string outputDir)
    {
        Directory.CreateDirectory(outputDir);
        var path = Path.Combine(outputDir, "docspec.json");
        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        File.WriteAllText(path, json);
    }
}
