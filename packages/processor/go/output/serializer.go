// Package output handles DocSpec JSON serialization.
//
// @docspec:module {
//   id: "docspec-go-output",
//   name: "Output Serializer",
//   description: "Serializes the assembled DocSpec model to a pretty-printed JSON file, the final step of the processor pipeline.",
//   since: "3.0.0"
// }
package output

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// WriteJSON serializes data to a JSON file.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Writes the final docspec.json output with pretty-printed indentation"
func WriteJSON(data interface{}, outputDir, filename string) error {
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return err
	}

	path := filepath.Join(outputDir, filename)
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}
