// @docspec:module {
//   id: "docspec-go-extractor-datastore",
//   name: "Data Store Extractor",
//   description: "Detects database, cache, and message broker usage by analyzing import paths for GORM, database/sql, Redis, Kafka, NATS, RabbitMQ, and MongoDB, then extracts table names and topic references.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
)

// DataStoreExtractor detects data store usage in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - GORM models (gorm.Model embedding, gorm struct tags)
//   - database/sql usage (sql.DB, sql.Open)
//   - Redis clients (go-redis, redigo)
//   - Message brokers (sarama/Kafka, NATS, RabbitMQ)
//   - MongoDB (mongo-driver)
//   - Comment-based docspec tags (//docspec:datastore, //docspec:table)
//
// This is the Go equivalent of the Java DataStoreExtractor which detects
// JPA entities, Spring Data repositories, Redis, and Kafka usage.
type DataStoreExtractor struct{}

// Known import paths for data store libraries.
var dataStoreImportMap = map[string]struct {
	storeID   string
	storeName string
	storeType string
}{
	"gorm.io/gorm":                             {"rdbms", "Primary Database", "rdbms"},
	"gorm.io/driver/postgres":                  {"rdbms", "PostgreSQL", "rdbms"},
	"gorm.io/driver/mysql":                     {"rdbms", "MySQL", "rdbms"},
	"gorm.io/driver/sqlite":                    {"rdbms", "SQLite", "rdbms"},
	"gorm.io/driver/sqlserver":                 {"rdbms", "SQL Server", "rdbms"},
	"database/sql":                             {"rdbms", "Primary Database", "rdbms"},
	"github.com/jmoiron/sqlx":                  {"rdbms", "Primary Database", "rdbms"},
	"github.com/jackc/pgx/v4":                  {"rdbms", "PostgreSQL", "rdbms"},
	"github.com/jackc/pgx/v5":                  {"rdbms", "PostgreSQL", "rdbms"},
	"github.com/go-sql-driver/mysql":           {"rdbms", "MySQL", "rdbms"},
	"github.com/redis/go-redis/v9":             {"redis", "Redis", "cache"},
	"github.com/go-redis/redis/v8":             {"redis", "Redis", "cache"},
	"github.com/go-redis/redis/v9":             {"redis", "Redis", "cache"},
	"github.com/gomodule/redigo/redis":         {"redis", "Redis", "cache"},
	"github.com/IBM/sarama":                    {"kafka", "Kafka", "message-broker"},
	"github.com/Shopify/sarama":                {"kafka", "Kafka", "message-broker"},
	"github.com/segmentio/kafka-go":            {"kafka", "Kafka", "message-broker"},
	"github.com/confluentinc/confluent-kafka-go/kafka": {"kafka", "Kafka", "message-broker"},
	"github.com/nats-io/nats.go":               {"nats", "NATS", "message-broker"},
	"github.com/streadway/amqp":                {"rabbitmq", "RabbitMQ", "message-broker"},
	"github.com/rabbitmq/amqp091-go":           {"rabbitmq", "RabbitMQ", "message-broker"},
	"go.mongodb.org/mongo-driver/mongo":        {"mongodb", "MongoDB", "document-store"},
}

// @docspec:deterministic
func (e *DataStoreExtractor) Name() string {
	return "data-store"
}

// IsAvailable reports true if any file imports a known data store package.
//
// @docspec:deterministic
func (e *DataStoreExtractor) IsAvailable(ctx *ProcessorContext) bool {
	for imp := range dataStoreImportMap {
		if hasImport(ctx, imp) {
			return true
		}
	}
	return false
}

// Extract scans files for data store patterns and populates ctx.DataStores.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Three-pass extraction: detect stores from imports, extract GORM table names, then extract Kafka topics"
func (e *DataStoreExtractor) Extract(ctx *ProcessorContext) {
	detectedStores := make(map[string]bool)

	// First pass: detect stores from imports
	for _, file := range ctx.Files {
		for _, imp := range file.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if info, ok := dataStoreImportMap[path]; ok {
				if !detectedStores[info.storeID] {
					detectedStores[info.storeID] = true
					addDataStoreIfAbsent(ctx, info.storeID, info.storeName, info.storeType)
				}
			}
		}
	}

	// Second pass: extract tables from GORM models
	for _, file := range ctx.Files {
		imports := fileImports(file)
		hasGorm := imports["gorm.io/gorm"]

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

				// Check for docspec:table comment tag
				tableName := ""
				if gd.Doc != nil {
					for _, c := range gd.Doc.List {
						text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
						if strings.HasPrefix(text, "docspec:table") {
							parts := strings.SplitN(text, " ", 2)
							if len(parts) == 2 {
								tableName = strings.TrimSpace(parts[1])
							}
						}
						if strings.HasPrefix(text, "docspec:datastore") {
							parts := strings.Fields(text)
							if len(parts) >= 4 {
								id := parts[1]
								name := parts[2]
								stype := parts[3]
								addDataStoreIfAbsent(ctx, id, name, stype)
							}
						}
					}
				}

				// Detect GORM models by checking for gorm.Model embedding or gorm struct tags
				isGormModel := false
				if hasGorm {
					for _, field := range st.Fields.List {
						// Check for anonymous gorm.Model field
						if len(field.Names) == 0 {
							if sel, ok := field.Type.(*ast.SelectorExpr); ok {
								if ident, ok := sel.X.(*ast.Ident); ok {
									if ident.Name == "gorm" && sel.Sel.Name == "Model" {
										isGormModel = true
										break
									}
								}
							}
						}
						// Check for gorm struct tags
						if field.Tag != nil {
							tag := field.Tag.Value
							if strings.Contains(tag, `gorm:"`) {
								isGormModel = true
								break
							}
						}
					}
				}

				if isGormModel || tableName != "" {
					if tableName == "" {
						tableName = inferTableName(ts.Name.Name)
					}
					store := findOrAddStore(ctx, "rdbms", "Primary Database", "rdbms")
					addTableIfAbsent(store, tableName)
				}
			}
		}
	}

	// Third pass: extract Kafka topics
	for _, file := range ctx.Files {
		imports := fileImports(file)
		hasKafka := false
		for imp := range imports {
			if strings.Contains(imp, "sarama") || strings.Contains(imp, "kafka") {
				hasKafka = true
				break
			}
		}

		if !hasKafka {
			continue
		}

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Body == nil {
				continue
			}

			// Look for topic string literals in kafka-related calls
			ast.Inspect(fn.Body, func(n ast.Node) bool {
				call, ok := n.(*ast.CallExpr)
				if !ok {
					return true
				}

				sel, ok := call.Fun.(*ast.SelectorExpr)
				if !ok {
					return true
				}

				// Common patterns: producer.SendMessage, consumer.ConsumePartition, etc.
				methodName := strings.ToLower(sel.Sel.Name)
				if strings.Contains(methodName, "topic") || strings.Contains(methodName, "consume") ||
					strings.Contains(methodName, "produce") || strings.Contains(methodName, "send") ||
					strings.Contains(methodName, "subscribe") {
					for _, arg := range call.Args {
						if lit, ok := arg.(*ast.BasicLit); ok {
							topic := strings.Trim(lit.Value, `"`)
							if topic != "" && !strings.Contains(topic, " ") {
								store := findOrAddStore(ctx, "kafka", "Kafka", "message-broker")
								addTopicIfAbsent(store, topic)
							}
						}
					}
				}

				return true
			})
		}
	}
}

// addDataStoreIfAbsent adds a data store to the context if not already present.
//
// @docspec:preserves "no duplicate data store entries by ID"
func addDataStoreIfAbsent(ctx *ProcessorContext, id, name, storeType string) {
	for _, ds := range ctx.DataStores {
		if ds.ID == id {
			return
		}
	}
	ctx.DataStores = append(ctx.DataStores, DataStore{
		ID:   id,
		Name: name,
		Type: storeType,
	})
}

// findOrAddStore finds an existing store by ID or adds a new one.
//
// @docspec:preserves "no duplicate data store entries by ID"
func findOrAddStore(ctx *ProcessorContext, id, name, storeType string) *DataStore {
	for i := range ctx.DataStores {
		if ctx.DataStores[i].ID == id {
			return &ctx.DataStores[i]
		}
	}
	ctx.DataStores = append(ctx.DataStores, DataStore{
		ID:   id,
		Name: name,
		Type: storeType,
	})
	return &ctx.DataStores[len(ctx.DataStores)-1]
}

// addTableIfAbsent adds a table name to a store if not already present.
//
// @docspec:preserves "no duplicate table names within a data store"
func addTableIfAbsent(store *DataStore, tableName string) {
	for _, t := range store.Tables {
		if t == tableName {
			return
		}
	}
	store.Tables = append(store.Tables, tableName)
}

// addTopicIfAbsent adds a topic to a store if not already present.
//
// @docspec:preserves "no duplicate topic names within a data store"
func addTopicIfAbsent(store *DataStore, topicName string) {
	for _, t := range store.Topics {
		if t.Name == topicName {
			return
		}
	}
	store.Topics = append(store.Topics, DataStoreTopic{Name: topicName})
}

// inferTableName converts a Go struct name to a table name using snake_case pluralization.
// Example: UserProfile -> user_profiles, Order -> orders
//
// @docspec:deterministic
func inferTableName(name string) string {
	var result strings.Builder
	for i, r := range name {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteByte('_')
		}
		result.WriteRune(r)
	}
	snake := strings.ToLower(result.String())

	// Simple pluralization
	if strings.HasSuffix(snake, "s") || strings.HasSuffix(snake, "x") ||
		strings.HasSuffix(snake, "ch") || strings.HasSuffix(snake, "sh") {
		return snake + "es"
	}
	if strings.HasSuffix(snake, "y") && len(snake) > 1 {
		prev := snake[len(snake)-2]
		if prev != 'a' && prev != 'e' && prev != 'i' && prev != 'o' && prev != 'u' {
			return snake[:len(snake)-1] + "ies"
		}
	}
	return snake + "s"
}
