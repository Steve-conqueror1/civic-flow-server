import { db } from "../config";
import { hash } from "bcryptjs";
import { categoriesData } from "./categoriesdata";
import { InferInsertModel } from "drizzle-orm";

import {
  categories,
  services,
  departments,
  users,
  serviceRequests,
  requestStatusEnum,
} from "../db";

import { departmentsData } from "./departmentsData";
import { servicesData } from "./servicesData";
import { usersData } from "./usersData";

import { sampleRequests } from "./requestsData";

type NewUser = InferInsertModel<typeof users>;
type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

async function initDB() {
  try {
    console.log("starting database data initialization");

    await db.transaction(async (tx) => {
      await tx.delete(serviceRequests);
      await tx.delete(services);
      await tx.delete(categories);
      await tx.delete(departments);
      await tx.delete(users);

      console.log("Old data deleted");

      const insertedCategories = await tx
        .insert(categories)
        .values(categoriesData)
        .returning();

      console.log("Inserted Categories data");

      const insertedDepartments = await tx
        .insert(departments)
        .values(departmentsData)
        .returning();
      console.log("Inserted Department's data");

      for (const service of servicesData) {
        const category = insertedCategories.find(
          (c) => c.slug === service.categorySlug,
        );
        const department = insertedDepartments.find(
          (d) => d.slug === service.departmentSlug,
        );

        if (!category || !department) {
          throw new Error(
            `Invalid category/department for service ${service.name}`,
          );
        }

        await tx.insert(services).values({
          name: service.name,
          slug: service.slug,
          description: service.description,
          instructions: service.instructions,
          categoryId: category.id,
          departmentId: department.id,
          minResponseDays: service.minResponseDays,
          maxResponseDays: service.maxResponseDays,
        });
      }

      console.log("Inserted Services data");

      const passwordHash = await hash("Password123!", 12);

      const insertedUsers = await tx
        .insert(users)
        .values(
          usersData.map((user) => ({ ...user, passwordHash })) as NewUser[],
        )
        .returning();

      console.log("Users Seeded");

      const citizenUsers = insertedUsers.filter(
        (user) => !["admin", "super_admin"].includes(user.role),
      );

      const userRequests = [];

      const insertedServices = await tx.select().from(services);

      for (const user of citizenUsers) {
        for (let j = 0; j < sampleRequests.length; j++) {
          const service = insertedServices[j % insertedServices.length];
          const sample = sampleRequests[j];
          userRequests.push({
            userId: user.id,
            serviceId: service.id,
            title: sample.title,
            description: sample.description,
            status: sample.status as RequestStatus,
            attachments: sample.attachments,
            location: sample.location,
            aiSummary: sample.aiSummary,
            priority: Math.floor(Math.random() * 3),
          });
        }
      }

      await tx.insert(serviceRequests).values(userRequests);
      console.log("Inserted Services Requests data");
    });
  } catch (error) {
    console.error("Seed failed:", error);
  }
}

initDB();
