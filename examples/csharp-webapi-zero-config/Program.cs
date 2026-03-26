var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var items = new List<Item>();
var nextId = 1;

app.MapGet("/api/items", () => Results.Ok(items));

app.MapGet("/api/items/{id}", (int id) =>
{
    var item = items.FirstOrDefault(i => i.Id == id);
    return item is not null ? Results.Ok(item) : Results.NotFound();
});

app.MapPost("/api/items", (CreateItemRequest request) =>
{
    var item = new Item(nextId++, request.Name, request.Description);
    items.Add(item);
    return Results.Created($"/api/items/{item.Id}", item);
});

app.MapPut("/api/items/{id}", (int id, UpdateItemRequest request) =>
{
    var index = items.FindIndex(i => i.Id == id);
    if (index == -1) return Results.NotFound();
    items[index] = items[index] with { Name = request.Name, Description = request.Description };
    return Results.Ok(items[index]);
});

app.MapDelete("/api/items/{id}", (int id) =>
{
    var removed = items.RemoveAll(i => i.Id == id);
    return removed > 0 ? Results.NoContent() : Results.NotFound();
});

app.Run();

/// <summary>Represents an item in the catalog.</summary>
public record Item(int Id, string Name, string Description);

/// <summary>Request body for creating a new item.</summary>
public record CreateItemRequest(string Name, string Description);

/// <summary>Request body for updating an existing item.</summary>
public record UpdateItemRequest(string Name, string Description);
