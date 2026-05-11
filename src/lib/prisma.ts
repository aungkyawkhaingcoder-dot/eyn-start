import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prismaClient =
  connectionString.startsWith("prisma://") || connectionString.startsWith("prisma+postgres://")
    ? new PrismaClient({ accelerateUrl: connectionString })
    : new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const prisma = prismaClient.$extends(withAccelerate());

export { prisma };
