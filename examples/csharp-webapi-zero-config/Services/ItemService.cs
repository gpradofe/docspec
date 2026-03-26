namespace CSharpWebApiZeroConfig.Services;

/// <summary>
/// Manages item CRUD operations with in-memory storage.
/// </summary>
public class ItemService
{
    private readonly Dictionary<int, Item> _items = new();
    private int _nextId = 1;

    /// <summary>Returns all items.</summary>
    public IReadOnlyList<Item> GetAll()
    {
        return _items.Values.ToList().AsReadOnly();
    }

    /// <summary>Finds an item by its unique identifier.</summary>
    public Item? GetById(int id)
    {
        return _items.GetValueOrDefault(id);
    }

    /// <summary>Creates a new item and returns it with its assigned ID.</summary>
    public Item Create(string name, string description)
    {
        var item = new Item(_nextId++, name, description);
        _items[item.Id] = item;
        return item;
    }

    /// <summary>Updates an existing item. Returns null if not found.</summary>
    public Item? Update(int id, string name, string description)
    {
        if (!_items.ContainsKey(id)) return null;
        var updated = new Item(id, name, description);
        _items[id] = updated;
        return updated;
    }

    /// <summary>Deletes an item by ID. Returns true if the item existed.</summary>
    public bool Delete(int id)
    {
        return _items.Remove(id);
    }
}
