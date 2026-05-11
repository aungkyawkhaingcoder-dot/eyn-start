import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create a new user
router.post("/", async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await prisma.user.create({
      data: {
        email,
        name,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, name } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await prisma.user.delete({
      where: { id: userId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;