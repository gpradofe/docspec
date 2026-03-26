from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


@dataclass
class User:
    """Represents a user in the system."""

    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)


class UserService:
    """Manages user CRUD operations with in-memory storage."""

    def __init__(self) -> None:
        self._users: dict[str, User] = {}

    def find_all(self) -> list[dict]:
        """Return all users as serializable dictionaries."""
        return [self._to_dict(u) for u in self._users.values()]

    def find_by_id(self, user_id: str) -> Optional[dict]:
        """Find a user by their unique identifier."""
        user = self._users.get(user_id)
        if user is None:
            return None
        return self._to_dict(user)

    def create(self, name: str, email: str) -> dict:
        """Create a new user and return the serialized result."""
        user_id = str(uuid.uuid4())
        user = User(id=user_id, name=name, email=email)
        self._users[user_id] = user
        return self._to_dict(user)

    def update(self, user_id: str, name: Optional[str] = None, email: Optional[str] = None) -> Optional[dict]:
        """Update an existing user's fields."""
        user = self._users.get(user_id)
        if user is None:
            return None
        if name is not None:
            user.name = name
        if email is not None:
            user.email = email
        return self._to_dict(user)

    def delete(self, user_id: str) -> bool:
        """Delete a user by ID. Returns True if the user existed."""
        return self._users.pop(user_id, None) is not None

    @staticmethod
    def _to_dict(user: User) -> dict:
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat(),
        }
