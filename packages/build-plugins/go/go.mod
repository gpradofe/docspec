module github.com/docspec/docspec-go-cli

go 1.21

require github.com/docspec/docspec-processor-go v0.0.0

replace (
	github.com/docspec/docspec-processor-go => ../../processor/go
	github.com/docspec/docspec-go => ../../annotations/go
)
