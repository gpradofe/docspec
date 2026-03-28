// @docspec:module {
//   id: "docspec-go-extractor-privacy",
//   name: "Privacy Extractor",
//   description: "Detects PII and sensitive data fields using docspec:pii/docspec:sensitive comment tags, known field name patterns (email, ssn, password), and redact/mask struct tags.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
)

// PrivacyExtractor detects privacy-sensitive fields in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - Comment-based docspec tags (//docspec:pii, //docspec:sensitive)
//   - Common PII field name patterns (email, phone, ssn, password, etc.)
//   - Struct tags indicating sensitive data (json:"-", redact, mask)
//
// This is the Go equivalent of the Java PrivacyExtractor which detects
// @DocPII and @DocSensitive annotations on fields.
type PrivacyExtractor struct{}

// Known PII field name patterns (lowercase).
var piiFieldPatterns = map[string]string{
	"email":          "email",
	"phone":          "phone",
	"ssn":            "ssn",
	"socialsecurity": "ssn",
	"passport":       "government-id",
	"driverslicense": "government-id",
	"creditcard":     "financial",
	"cardnumber":     "financial",
	"bankaccount":    "financial",
	"iban":           "financial",
	"password":       "credential",
	"secret":         "credential",
	"token":          "credential",
	"apikey":         "credential",
	"firstname":      "name",
	"lastname":       "name",
	"fullname":       "name",
	"dateofbirth":    "date-of-birth",
	"dob":            "date-of-birth",
	"birthdate":      "date-of-birth",
	"address":        "address",
	"streetaddress":  "address",
	"zipcode":        "address",
	"postalcode":     "address",
	"ipaddress":      "network-identifier",
	"macaddress":     "network-identifier",
}

// @docspec:deterministic
func (e *PrivacyExtractor) Name() string {
	return "privacy"
}

// IsAvailable always returns true since privacy detection works via naming
// conventions and doc comment tags, not requiring specific imports.
//
// @docspec:deterministic
func (e *PrivacyExtractor) IsAvailable(ctx *ProcessorContext) bool {
	return true
}

// Extract scans struct fields for privacy-sensitive patterns.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Scans struct fields for PII indicators via docspec:pii tags, naming patterns, and redact/mask struct tags"
func (e *PrivacyExtractor) Extract(ctx *ProcessorContext) {
	for _, file := range ctx.Files {
		pkg := file.Name.Name

		for _, decl := range file.Decls {
			gd, ok := decl.(*ast.GenDecl)
			if !ok {
				continue
			}

			for _, spec := range gd.Specs {
				ts, ok := spec.(*ast.TypeSpec)
				if !ok {
					continue
				}
				st, ok := ts.Type.(*ast.StructType)
				if !ok || st.Fields == nil {
					continue
				}

				ownerQualified := pkg + "." + ts.Name.Name

				for _, field := range st.Fields.List {
					if len(field.Names) == 0 {
						continue
					}

					fieldName := field.Names[0].Name
					qualified := ownerQualified + "." + fieldName

					// Check for docspec:pii comment tag on the field
					if pf := extractPIIFromDoc(field.Doc, qualified); pf != nil {
						ctx.Privacy = append(ctx.Privacy, *pf)
						continue
					}

					// Check for docspec:sensitive comment tag
					if isSensitiveFromDoc(field.Doc) {
						ctx.Privacy = append(ctx.Privacy, PrivacyField{
							Field:    qualified,
							PIIType:  "other",
							NeverLog: true,
						})
						continue
					}

					// Check struct tags for sensitivity indicators
					if field.Tag != nil {
						tag := field.Tag.Value
						if isSensitiveTag(tag) {
							piiType := inferPIIType(fieldName)
							ctx.Privacy = append(ctx.Privacy, PrivacyField{
								Field:    qualified,
								PIIType:  piiType,
								NeverLog: true,
							})
							continue
						}
					}

					// Check field name against known PII patterns
					if piiType, ok := matchPIIPattern(fieldName); ok {
						ctx.Privacy = append(ctx.Privacy, PrivacyField{
							Field:   qualified,
							PIIType: piiType,
						})
					}
				}
			}
		}
	}
}

// extractPIIFromDoc parses a //docspec:pii comment and returns a PrivacyField.
// Format: //docspec:pii <type> [retention=<value>] [gdprBasis=<value>] [encrypted] [neverLog] [neverReturn]
//
// @docspec:deterministic
func extractPIIFromDoc(doc *ast.CommentGroup, qualified string) *PrivacyField {
	if doc == nil {
		return nil
	}
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
		if !strings.HasPrefix(text, "docspec:pii") {
			continue
		}

		parts := strings.Fields(text)
		if len(parts) < 2 {
			continue
		}

		pf := &PrivacyField{
			Field:   qualified,
			PIIType: parts[1],
		}

		for _, part := range parts[2:] {
			if strings.HasPrefix(part, "retention=") {
				pf.Retention = strings.TrimPrefix(part, "retention=")
			}
			if strings.HasPrefix(part, "gdprBasis=") {
				pf.GDPRBasis = strings.TrimPrefix(part, "gdprBasis=")
			}
			if part == "encrypted" {
				pf.Encrypted = true
			}
			if part == "neverLog" {
				pf.NeverLog = true
			}
			if part == "neverReturn" {
				pf.NeverReturn = true
			}
		}

		return pf
	}
	return nil
}

// isSensitiveFromDoc checks for //docspec:sensitive comment.
//
// @docspec:deterministic
func isSensitiveFromDoc(doc *ast.CommentGroup) bool {
	if doc == nil {
		return false
	}
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
		if strings.HasPrefix(text, "docspec:sensitive") {
			return true
		}
	}
	return false
}

// isSensitiveTag checks if a struct tag indicates the field is sensitive.
//
// @docspec:deterministic
func isSensitiveTag(tag string) bool {
	tag = strings.Trim(tag, "`")
	// json:"-" means the field is hidden from JSON output
	if strings.Contains(tag, `json:"-"`) {
		// Only consider it sensitive if also has other indicators
		if strings.Contains(tag, "redact") || strings.Contains(tag, "mask") ||
			strings.Contains(tag, "sensitive") {
			return true
		}
	}
	return strings.Contains(tag, `redact:"`) || strings.Contains(tag, `mask:"`) ||
		strings.Contains(tag, `sensitive:"`)
}

// matchPIIPattern checks a field name against known PII patterns.
//
// @docspec:deterministic
func matchPIIPattern(fieldName string) (string, bool) {
	lower := strings.ToLower(fieldName)
	for pattern, piiType := range piiFieldPatterns {
		if strings.Contains(lower, pattern) {
			return piiType, true
		}
	}
	return "", false
}

// inferPIIType infers the PII type from a field name.
//
// @docspec:deterministic
func inferPIIType(fieldName string) string {
	if piiType, ok := matchPIIPattern(fieldName); ok {
		return piiType
	}
	return "other"
}
