"""DocSpec CLI for Python projects."""
# @docspec:module {
#   id: "docspec-py-cli",
#   name: "DocSpec Python CLI",
#   description: "Command-line interface for the DocSpec Python processor. Provides 'generate' and 'help' commands with configurable source and output directories.",
#   since: "3.0.0"
# }
import sys
from docspec_processor.processor import DocSpecPythonProcessor


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Parse CLI arguments and dispatch to the DocSpec processor or help output"
def main():
    args = sys.argv[1:]
    command = args[0] if args else "help"

    if command == "generate":
        source_dir = "src"
        output_dir = "target"
        for i, arg in enumerate(args):
            if arg == "--source" and i + 1 < len(args):
                source_dir = args[i + 1]
            elif arg == "--output" and i + 1 < len(args):
                output_dir = args[i + 1]

        processor = DocSpecPythonProcessor(source_dir=source_dir, output_dir=output_dir)
        processor.generate()
        print(f"DocSpec: Generated specification at {output_dir}/docspec.json")
    elif command == "help":
        print("""
docspec-py — DocSpec Python CLI

Usage:
  docspec-py generate          Generate docspec.json from Python source
  docspec-py help              Show this help message

Options:
  --source <dir>    Source directory (default: src)
  --output <dir>    Output directory (default: target)
""")
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
