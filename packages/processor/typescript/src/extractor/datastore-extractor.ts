// @docspec:module {
//   id: "docspec-ts-datastore-extractor",
//   name: "Data Store Extractor",
//   description: "Detects ORM entities (TypeORM, Prisma, Sequelize, Mongoose), cache clients (Redis/IORedis), and message brokers (Kafka, NestJS microservices) to populate the data stores section of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  DataStoreModel,
  DataStoreTopicModel,
} from "./extractor-interface.js";

/**
 * Detects data store usage patterns (ORM entities, database connections, caches,
 * message brokers) in TypeScript/Node.js projects and populates the data stores
 * section of the DocSpec model.
 *
 * @docspec:boundary "AST-based data store pattern detection across TypeORM, Prisma, Sequelize, Mongoose, Redis, and Kafka"
 *
 * Detection targets:
 * - TypeORM: `@Entity()` decorator, `Repository<T>`, `DataSource`, `createConnection`
 * - Prisma: `PrismaClient`, `prisma.$queryRaw`, model access patterns
 * - Sequelize: `Model.init(...)`, `sequelize.define(...)`, `@Table` decorator
 * - Mongoose: `mongoose.model(...)`, `new Schema(...)`, `@Schema()` decorator
 * - Redis: `ioredis`, `redis.createClient`, `RedisModule`
 * - Kafka/Message brokers: `kafkajs`, `@MessagePattern`, `@EventPattern`
 */
export class DataStoreExtractor implements DocSpecExtractor {
  /** @docspec:deterministic */
  extractorName(): string {
    return "data-store";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for ORM, cache, and message broker patterns to populate the data stores model" */
  extract(context: ExtractorContext): void {
    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, context);
    }
  }

  /** @docspec:intentional "Recursively walks the AST to detect data store patterns in classes, constructors, calls, and imports" */
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile, context: ExtractorContext): void {
    // Detect TypeORM @Entity decorator
    if (ts.isClassDeclaration(node)) {
      this.analyzeClassDecorators(node, sourceFile, context);
      this.analyzeClassHeritage(node, sourceFile, context);
    }

    // Detect new expressions: new PrismaClient(), new Sequelize(), etc.
    if (ts.isNewExpression(node)) {
      this.analyzeNewExpression(node, sourceFile, context);
    }

    // Detect call expressions: mongoose.model('User', ...), sequelize.define(...)
    if (ts.isCallExpression(node)) {
      this.analyzeCallExpression(node, sourceFile, context);
    }

    // Detect imports for framework detection
    if (ts.isImportDeclaration(node)) {
      this.analyzeImport(node, sourceFile, context);
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, context));
  }

  /** @docspec:intentional "Detects @Entity, @Table, @Schema, @MessagePattern, and @EventPattern decorators for data store classification" */
  private analyzeClassDecorators(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    context: ExtractorContext,
  ): void {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return;

    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText(sourceFile);

      // TypeORM @Entity('table_name')
      if (name === "Entity") {
        const store = this.ensureDataStore(context, "rdbms", "Primary Database", "rdbms");
        let tableName = node.name?.text ?? "unknown";
        if (decorator.expression.arguments.length > 0) {
          const arg = decorator.expression.arguments[0];
          if (ts.isStringLiteral(arg)) {
            tableName = arg.text;
          } else if (ts.isObjectLiteralExpression(arg)) {
            for (const prop of arg.properties) {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
                  && prop.name.text === "name" && ts.isStringLiteral(prop.initializer)) {
                tableName = prop.initializer.text;
              }
            }
          }
        }
        if (!store.tables.includes(tableName)) {
          store.tables.push(tableName);
        }
      }

      // Sequelize @Table decorator
      if (name === "Table") {
        const store = this.ensureDataStore(context, "rdbms", "Primary Database", "rdbms");
        let tableName = node.name?.text ?? "unknown";
        if (decorator.expression.arguments.length > 0 && ts.isObjectLiteralExpression(decorator.expression.arguments[0])) {
          for (const prop of decorator.expression.arguments[0].properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
                && prop.name.text === "tableName" && ts.isStringLiteral(prop.initializer)) {
              tableName = prop.initializer.text;
            }
          }
        }
        if (!store.tables.includes(tableName)) {
          store.tables.push(tableName);
        }
      }

      // Mongoose @Schema() decorator (NestJS-Mongoose)
      if (name === "Schema") {
        this.ensureDataStore(context, "mongodb", "MongoDB", "document-store");
      }

      // NestJS Kafka/NATS/RabbitMQ patterns
      if (name === "MessagePattern" || name === "EventPattern") {
        const store = this.ensureDataStore(context, "message-broker", "Message Broker", "message-broker");
        if (decorator.expression.arguments.length > 0) {
          const arg = decorator.expression.arguments[0];
          if (ts.isStringLiteral(arg)) {
            const topicName = arg.text;
            if (!store.topics.some(t => t.name === topicName)) {
              store.topics.push({ name: topicName });
            }
          }
        }
      }
    }
  }

  /** @docspec:intentional "Detects Sequelize Model and Mongoose Document heritage to classify data store type" */
  private analyzeClassHeritage(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    context: ExtractorContext,
  ): void {
    if (!node.heritageClauses) return;
    for (const clause of node.heritageClauses) {
      for (const type of clause.types) {
        const typeName = type.expression.getText(sourceFile);

        // Sequelize Model extension
        if (typeName === "Model") {
          this.ensureDataStore(context, "rdbms", "Primary Database", "rdbms");
        }

        // Mongoose Document extension
        if (typeName === "Document") {
          this.ensureDataStore(context, "mongodb", "MongoDB", "document-store");
        }
      }
    }
  }

  /** @docspec:intentional "Detects data store client instantiations (PrismaClient, Sequelize, DataSource, Redis, Kafka)" */
  private analyzeNewExpression(
    node: ts.NewExpression,
    sourceFile: ts.SourceFile,
    context: ExtractorContext,
  ): void {
    const className = node.expression.getText(sourceFile);

    if (className === "PrismaClient") {
      this.ensureDataStore(context, "rdbms", "Primary Database (Prisma)", "rdbms");
    }

    if (className === "Sequelize") {
      this.ensureDataStore(context, "rdbms", "Primary Database (Sequelize)", "rdbms");
    }

    if (className === "DataSource") {
      this.ensureDataStore(context, "rdbms", "Primary Database (TypeORM)", "rdbms");
    }

    if (className === "Schema" || className === "mongoose.Schema") {
      this.ensureDataStore(context, "mongodb", "MongoDB", "document-store");
    }

    if (className === "Redis" || className === "IORedis") {
      this.ensureDataStore(context, "redis", "Redis", "cache");
    }

    if (className === "Kafka" || className === "KafkaClient") {
      this.ensureDataStore(context, "kafka", "Kafka", "message-broker");
    }
  }

  /** @docspec:intentional "Detects mongoose.model, sequelize.define, redis.createClient, and kafka producer/consumer calls" */
  private analyzeCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    context: ExtractorContext,
  ): void {
    const callText = node.expression.getText(sourceFile);

    // mongoose.model('User', schema)
    if (callText === "mongoose.model" || callText.endsWith(".model")) {
      if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
        const store = this.ensureDataStore(context, "mongodb", "MongoDB", "document-store");
        const collectionName = node.arguments[0].text;
        if (!store.tables.includes(collectionName)) {
          store.tables.push(collectionName);
        }
      }
    }

    // sequelize.define('User', { ... })
    if (callText.endsWith(".define")) {
      if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
        const store = this.ensureDataStore(context, "rdbms", "Primary Database", "rdbms");
        const tableName = node.arguments[0].text;
        if (!store.tables.includes(tableName)) {
          store.tables.push(tableName);
        }
      }
    }

    // redis.createClient(), createClient()
    if (callText === "redis.createClient" || callText === "createClient") {
      const fullText = sourceFile.getFullText();
      if (fullText.includes("redis") || fullText.includes("ioredis")) {
        this.ensureDataStore(context, "redis", "Redis", "cache");
      }
    }

    // kafka.producer(), kafka.consumer()
    if (callText.endsWith(".producer") || callText.endsWith(".consumer")) {
      const objText = callText.replace(/\.(producer|consumer)$/, "");
      if (objText.toLowerCase().includes("kafka")) {
        this.ensureDataStore(context, "kafka", "Kafka", "message-broker");
      }
    }
  }

  /** @docspec:intentional "Detects imports of ioredis, redis, and kafkajs packages to pre-register data store types" */
  private analyzeImport(
    node: ts.ImportDeclaration,
    sourceFile: ts.SourceFile,
    context: ExtractorContext,
  ): void {
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const module = node.moduleSpecifier.text;

    if (module === "ioredis" || module === "redis") {
      this.ensureDataStore(context, "redis", "Redis", "cache");
    }
    if (module === "kafkajs" || module === "@nestjs/microservices") {
      // Will be confirmed when actual usage is found
    }
  }

  /** @docspec:preserves "Each data store ID is unique in the model; duplicate registrations return the existing entry" */
  private ensureDataStore(
    context: ExtractorContext,
    id: string,
    name: string,
    type: string,
  ): DataStoreModel {
    const existing = context.model.dataStores.find(ds => ds.id === id);
    if (existing) return existing;

    const store: DataStoreModel = { id, name, type, tables: [], topics: [] };
    context.model.dataStores.push(store);
    return store;
  }
}
