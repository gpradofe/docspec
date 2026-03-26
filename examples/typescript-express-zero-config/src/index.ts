import express, { Request, Response } from "express";
import { UserService } from "./user-service";

const app = express();
const userService = new UserService();

app.use(express.json());

app.get("/api/users", (_req: Request, res: Response) => {
  const users = userService.findAll();
  res.json(users);
});

app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = userService.findById(req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.post("/api/users", (req: Request, res: Response) => {
  const user = userService.create(req.body);
  res.status(201).json(user);
});

export default app;
