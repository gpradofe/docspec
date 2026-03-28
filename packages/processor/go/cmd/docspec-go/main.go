// Command docspec-go generates docspec.json from Go source code.
//
// @docspec:module {
//   id: "docspec-go-cmd",
//   name: "DocSpec Go CLI",
//   description: "Command-line entry point that accepts source and output directories, invokes the processor pipeline, and writes the resulting docspec.json.",
//   since: "3.0.0"
// }
package main

import (
	"fmt"
	"os"

	"github.com/docspec/docspec-processor-go/processor"
)

// @docspec:intentional "CLI entry point: parses args, invokes processor pipeline, writes docspec.json"
func main() {
	sourceDir := "."
	outputDir := "target"

	if len(os.Args) > 1 {
		sourceDir = os.Args[1]
	}
	if len(os.Args) > 2 {
		outputDir = os.Args[2]
	}

	p := processor.New(sourceDir, outputDir)
	spec, err := p.Process()
	if err != nil {
		fmt.Fprintf(os.Stderr, "DocSpec error: %v\n", err)
		os.Exit(1)
	}

	if err := p.Write(spec); err != nil {
		fmt.Fprintf(os.Stderr, "DocSpec write error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("DocSpec: Generated specification at %s/docspec.json\n", outputDir)
}
