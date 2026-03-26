from flask import Flask, jsonify, request
from services.user_service import UserService

app = Flask(__name__)
user_service = UserService()


@app.route("/users", methods=["GET"])
def get_users():
    """Retrieve all users."""
    users = user_service.find_all()
    return jsonify(users)


@app.route("/users/<user_id>", methods=["GET"])
def get_user(user_id: str):
    """Retrieve a single user by ID."""
    user = user_service.find_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)


@app.route("/users", methods=["POST"])
def create_user():
    """Create a new user from the JSON request body."""
    data = request.get_json()
    user = user_service.create(data["name"], data["email"])
    return jsonify(user), 201


if __name__ == "__main__":
    app.run(debug=True, port=5000)
