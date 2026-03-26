export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  public findAll(): User[] {
    return Array.from(this.users.values());
  }

  public findById(id: string): User | undefined {
    return this.users.get(id);
  }

  public create(data: Omit<User, "id" | "createdAt">): User {
    const id = String(this.nextId++);
    const user: User = {
      id,
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  public update(id: string, data: Partial<Omit<User, "id" | "createdAt">>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...data };
    this.users.set(id, updated);
    return updated;
  }

  public delete(id: string): boolean {
    return this.users.delete(id);
  }
}
