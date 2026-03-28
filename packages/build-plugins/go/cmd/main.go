// Command docspec-go-cli provides the DocSpec CLI for Go projects.
//
// @docspec:module {
//   id: "docspec-go-plugin",
//   name: "Go CLI Plugin",
//   description: "Build tool integration CLI that wraps the DocSpec Go processor, providing generate and help subcommands for Go project workflows.",
//   since: "3.0.0"
// }
package main

import (
	"fmt"
	"os"
)

// @docspec:intentional "CLI plugin entry point: dispatches generate and help subcommands"
func main() {
	if len(os.Args) < 2 {
		printUsage()
		return
	}

	switch os.Args[1] {
	case "generate":
		fmt.Println("DocSpec: Use 'docspec-go <source-dir> <output-dir>' to generate")
	case "help":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", os.Args[1])
		os.Exit(1)
	}
}

// @docspec:deterministic
func printUsage() {
	fmt.Println(`docspec-go — DocSpec Go CLI

Usage:
  docspec-go generate    Generate docspec.json from Go source
  docspec-go help        Show this help message`)
}
